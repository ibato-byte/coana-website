// 週次タスク用：GitHub Actions が Issue（ラベル seo-data）に残した本番データの最新版を取り出し、JSON ファイルにする。
// クラウドの作業環境からは本番（coana.co.jp）に直接つなげないため、GitHub 経由で受け取る。
//
//   node tools/seo/fetch-prod-data.mjs --dir /tmp/seo   → /tmp/seo/prod.json・perf.json・gsc.json（Search Console。設定済みのとき）
//
// GitHub API は curl で呼ぶ（作業環境のプロキシが認証を付ける。Node の fetch はプロキシを通らない）。
// GitHub Actions など GITHUB_TOKEN がある環境では、それを付けて呼ぶ。
// 8日より古いデータしかなければ「古い」と表示して終了コード 2（レポートでは「本番：未取得」として扱う）。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const DIR = opt('dir', '.');
const REPO = process.env.GITHUB_REPOSITORY || 'ibato-byte/coana-website';
const gh = (url) => {
  const headers = ['-H', 'accept: application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? ['-H', `authorization: Bearer ${process.env.GITHUB_TOKEN}`] : [])];
  return JSON.parse(execFileSync('curl', ['-sSf', '-m', '30', ...headers, `https://api.github.com/repos/${REPO}${url}`], { encoding: 'utf8', maxBuffer: 32 << 20 }));
};

const issues = gh('/issues?state=open&labels=seo-data&per_page=5').filter((i) => !i.pull_request);
if (!issues.length) { console.log('seo-data の Issue がない（GitHub Actions「SEO の監視」の週次実行がまだ）'); process.exit(2); }
const issue = issues[0];
let comments = [], page = 1;
for (;;) { const c = gh(`/issues/${issue.number}/comments?per_page=100&page=${page}`); comments = comments.concat(c); if (c.length < 100) break; page++; }
const latest = comments.filter((c) => /<!-- seo-data:\d{4}-\d{2}-\d{2} -->/.test(c.body || '')).pop();
if (!latest) { console.log(`Issue #${issue.number} にデータのコメントがない`); process.exit(2); }
const m = latest.body.match(/```json\n([\s\S]*?)\n```/);
if (!m) { console.log('コメントに JSON がない'); process.exit(2); }
const data = JSON.parse(m[1]);
fs.mkdirSync(DIR, { recursive: true });
if (data.prod) fs.writeFileSync(path.join(DIR, 'prod.json'), JSON.stringify(data.prod, null, 2));
if (data.perf) fs.writeFileSync(path.join(DIR, 'perf.json'), JSON.stringify(data.perf, null, 2));
if (data.gsc) fs.writeFileSync(path.join(DIR, 'gsc.json'), JSON.stringify(data.gsc, null, 2));
const ageDays = (Date.now() - new Date(latest.created_at).getTime()) / 864e5;
console.log(`本番データ ${data.date}（Issue #${issue.number}、${ageDays.toFixed(1)} 日前）→ ${DIR}/prod.json${data.perf ? `・${DIR}/perf.json` : ''}`);
if (ageDays > 8) { console.log('データが古い（8日より前）。GitHub Actions「SEO の監視」の週次実行を確認'); process.exit(2); }
