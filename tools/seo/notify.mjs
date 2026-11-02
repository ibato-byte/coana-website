// GitHub Actions「SEO の監視」から呼ぶ。点検結果を GitHub の Issue に残す（依存なし。GITHUB_TOKEN と GITHUB_REPOSITORY を使う）。
//
//   node tools/seo/notify.mjs --prod prod.json [--perf perf.json] [--weekly]
//
// - 本番に NG があれば「seo-alert」ラベルの Issue を立てる（すでに開いていれば、NG の中身が変わったときだけコメント）。
//   NG がなくなったら「解消」とコメントして閉じる。直すのは月曜の週次タスク（docs/SEO_PLAYBOOK.md）。
// - --weekly のときは「seo-data」ラベルの Issue（なければ作る）に、本番の点検と表示速度の JSON をコメントで残す。
//   週次タスク（クラウドの作業環境からは本番に接続できない）は、これを tools/seo/fetch-prod-data.mjs で読む。
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const read = (f) => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const prod = read(opt('prod')), perf = read(opt('perf')), gsc = read(opt('gsc'));
const WEEKLY = !!opt('weekly');
const REPO = process.env.GITHUB_REPOSITORY, TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const RUN_URL = process.env.GITHUB_RUN_ID ? `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
const DATE = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const FOOTER = `\n\n---\n_GitHub Actions「SEO の監視」が自動で投稿（[docs/SEO_PLAYBOOK.md](https://github.com/${REPO}/blob/main/docs/SEO_PLAYBOOK.md)）_`;

async function api(method, url, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${url}`, {
    method, headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const openIssue = async (label) => (await api('GET', `/issues?state=open&labels=${encodeURIComponent(label)}&per_page=10`)).filter((i) => !i.pull_request)[0];

// ── 異常の通知 ──
const errs = prod ? prod.errors : [{ kind: 'script', where: 'tools/seo/check-site.mjs', msg: '点検スクリプトが結果を出さずに終わった（実行ログを確認）' }];
const hash = crypto.createHash('sha1').update(JSON.stringify(errs.map((e) => [e.kind, e.where]))).digest('hex').slice(0, 10);
const listMd = errs.map((e) => `- [${e.kind}] ${e.where}：${e.msg}`).join('\n');
const alert = await openIssue('seo-alert');
if (errs.length) {
  const body = `<!-- seo-alert:${hash} -->\n本番 https://coana.co.jp の自動点検（${DATE}）で、直すべきもの（NG）が ${errs.length} 件見つかりました。\n\n${listMd}\n\n${RUN_URL ? `実行ログ：${RUN_URL}\n\n` : ''}自動修正は毎週月曜の週次タスクが担当します（急ぎの場合は手動で対応）。${FOOTER}`;
  if (!alert) await api('POST', '/issues', { title: `【SEO 監視】本番で異常 ${errs.length} 件（${DATE}）`, body, labels: ['seo-alert'] });
  else {
    const comments = await api('GET', `/issues/${alert.number}/comments?per_page=100`);
    const last = [alert.body || '', ...comments.map((c) => c.body || '')].reverse().find((b) => b.includes('<!-- seo-alert:'));
    if (!last || !last.includes(`seo-alert:${hash}`)) await api('POST', `/issues/${alert.number}/comments`, { body });
  }
  console.log(`異常 ${errs.length} 件を Issue に記録`);
} else if (alert) {
  await api('POST', `/issues/${alert.number}/comments`, { body: `${DATE} の自動点検で NG が 0 件になりました。解消として閉じます。${FOOTER}` });
  await api('PATCH', `/issues/${alert.number}`, { state: 'closed', state_reason: 'completed' });
  console.log(`Issue #${alert.number} を解消として閉じた`);
} else console.log('異常なし');

// ── 週次のデータ ──
if (WEEKLY) {
  let data = await openIssue('seo-data');
  if (!data) data = await api('POST', '/issues', {
    title: 'SEO 本番データ（自動・毎週）',
    body: `毎週月曜の朝、GitHub Actions「SEO の監視」が本番 https://coana.co.jp の点検結果と表示速度（Lighthouse・PageSpeed Insights）をここにコメントします。\n週次タスク（Claude）は \`node tools/seo/fetch-prod-data.mjs\` で最新のコメントを読み、レポート（docs/seo-reports）に使います。\n\nこの Issue は閉じないでください。${FOOTER}`,
    labels: ['seo-data'],
  });
  const payload = { date: DATE, prod, perf, gsc };
  let json = JSON.stringify(payload);
  if (json.length > 55000 && prod) { payload.prod = { ...prod, pages: undefined }; json = JSON.stringify(payload); }
  const lh = perf?.lighthouse ? Object.entries(perf.lighthouse).map(([p, x]) => `| ${p} | ${x.performance} | ${(x.lcpMs / 1000).toFixed(1)}s | ${x.cls} | ${x.tbtMs}ms |`).join('\n') : '';
  const body = `<!-- seo-data:${DATE} -->\n## 本番データ ${DATE}\n\n- 点検：NG ${prod ? prod.errors.length : '—'} 件／注意 ${prod ? prod.warnings.length : '—'} 件\n${lh ? `\n| ページ | Performance | LCP | CLS | TBT |\n| --- | --- | --- | --- | --- |\n${lh}\n` : ''}${perf?.notes?.length ? '\n' + perf.notes.map((n) => `- メモ：${n}`).join('\n') + '\n' : ''}\n<details><summary>JSON（週次タスク用）</summary>\n\n\`\`\`json\n${json}\n\`\`\`\n</details>${RUN_URL ? `\n\n実行ログ：${RUN_URL}` : ''}${FOOTER}`;
  await api('POST', `/issues/${data.number}/comments`, { body });
  console.log(`週次データを Issue #${data.number} に記録`);
}
