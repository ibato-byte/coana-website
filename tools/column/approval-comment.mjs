// GitHub Actions「コラムの公開確認」から呼ぶ（.github/workflows/column-approval.yml）。依存なし（Node 20 以上）。
//   node tools/column/approval-comment.mjs --pr 57
//
// 「コラム公開待ち」ラベルの PR に、オーナー宛ての確認コメントを付ける。PR の作成者（オーナー）には GitHub から
// 通知メール（ibato@coana.co.jp）が届くので、これが「公開の確認メール」になる。
//   1. PR の最新コミットのチェック（Cloudflare Pages など）がすべて終わるのを待つ。1つでも不合格ならボタンは出さない
//   2. Cloudflare Pages のプレビュー URL と記事の URL を求める
//   3. PR 本文の「## 要約」「## 出典」「## レビュー結果」を取り出す
//   4. 署名付き・期限付き（14日）の「公開する」「見送る」リンクを作り、@メンション付きでコメント
// 同じコミットに対しては1回だけコメントする（コメントに印を入れて重複を防ぐ）。
import { LABEL, buildLink } from './signature.mjs';

const args = process.argv.slice(2);
const PR = Number(args[args.indexOf('--pr') + 1]);
const REPO = process.env.GITHUB_REPOSITORY || 'ibato-byte/coana-website';
const TOKEN = process.env.GITHUB_TOKEN;
const SECRET = process.env.COLUMN_APPROVAL_SECRET || '';
const OWNER = process.env.COLUMN_OWNER || 'ibato-byte';
const SITE = 'https://coana.co.jp';
const SELF_JOB = process.env.SELF_JOB || 'approval-mail';
const WAIT_MIN = Number(process.env.WAIT_MIN || 25);
const DAY = 864e5;
if (!PR || !TOKEN) { console.error('--pr と GITHUB_TOKEN が必要'); process.exit(2); }

async function api(method, path, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method, headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const comment = (body) => api('POST', `/issues/${PR}/comments`, { body });

const pr = await api('GET', `/pulls/${PR}`);
if (pr.state !== 'open' || !pr.labels.some((l) => l.name === LABEL)) { console.log(`PR #${PR} は対象外（開いていない、またはラベル「${LABEL}」がない）`); process.exit(0); }
const sha = pr.head.sha;
const marker = `<!-- column-approval:${sha} -->`;
const existing = await api('GET', `/issues/${PR}/comments?per_page=100`);
if (existing.some((c) => (c.body || '').includes(marker))) { console.log('このコミットにはコメント済み'); process.exit(0); }

// 1. チェックの完了を待つ（この Actions 自身のジョブは除く）
let runs = [];
for (const deadline = Date.now() + WAIT_MIN * 60e3; ;) {
  runs = (await api('GET', `/commits/${sha}/check-runs?per_page=100`)).check_runs.filter((r) => r.name !== SELF_JOB);
  const pending = runs.filter((r) => r.status !== 'completed');
  if (runs.length && !pending.length) break;
  if (Date.now() > deadline) { console.log('チェックが時間内に終わらない'); process.exit(1); }
  await sleep(20e3);
  const now = await api('GET', `/pulls/${PR}`);
  if (now.head.sha !== sha) { console.log('新しいコミットが入ったので終了（次の実行に任せる）'); process.exit(0); }
}
const bad = runs.filter((r) => !['success', 'neutral', 'skipped'].includes(r.conclusion));
if (bad.length) {
  await comment(`${marker}\n@${OWNER} コラム「${pr.title.replace(/^【コラム公開待ち】/, '')}」は、公開前のチェックが合格しなかったため、公開ボタンを発行していません（${bad.map((r) => `${r.name}：${r.conclusion}`).join('、')}）。週次タスクが原因を直して作り直します。`);
  process.exit(0);
}

// 2. プレビュー URL（Cloudflare Pages のボットのコメントから、このコミットのもの）と記事の URL
let preview = '';
for (let i = 0; i < 15 && !preview; i++) {
  const cs = await api('GET', `/issues/${PR}/comments?per_page=100`);
  for (const c of cs.filter((c) => /cloudflare/i.test(c.user.login)).reverse()) {
    const b = c.body || '';
    if (!b.includes(sha.slice(0, 7)) || !/Deploy successful/i.test(b)) continue;
    const m = b.match(/Preview URL:[\s\S]*?href='(https:\/\/[a-z0-9-]+\.coana-website\.pages\.dev)'/) || b.match(/(https:\/\/[a-f0-9]{8}\.coana-website\.pages\.dev)/);
    if (m) { preview = m[1]; break; }
  }
  if (!preview) await sleep(20e3);
}
if (!preview) preview = `https://${pr.head.ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28).replace(/-+$/, '')}.coana-website.pages.dev`;
const files = await api('GET', `/pulls/${PR}/files?per_page=100`);
const md = files.find((f) => f.status === 'added' && /^content\/topics\/[^/]+\.md$/.test(f.filename));
if (!md) { await comment(`${marker}\nこの PR に新しいコラム（content/topics/*.md）が見つからないため、公開ボタンを発行していません。`); process.exit(0); }
const slug = md.filename.replace(/^content\/topics\/|\.md$/g, '');
const raw = Buffer.from((await api('GET', `/contents/${md.filename}?ref=${sha}`)).content, 'base64').toString('utf8');
const date = (raw.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m) || [])[1] || '';
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const articleUrl = `${preview}/topics/${slug}${date > today ? `?preview=${date}` : ''}`;

// 3. PR 本文の要約・出典・レビュー結果
const section = (name) => {
  // 次の見出し（##）か区切り線（---、PR 本文の末尾の署名の前）で止める
  const m = (pr.body || '').match(new RegExp(`^##\\s*${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|^---\\s*$|$(?![\\s\\S]))`, 'm'));
  return m ? m[1].trim().slice(0, 2500) : '（PR 本文に記載なし）';
};
const title = pr.title.replace(/^【コラム公開待ち】/, '');

// 4. リンクとコメント
const exp = Math.floor((Date.now() + 14 * DAY) / 1000);
const expDate = new Date(exp * 1000 + 9 * 3600e3).toISOString().slice(0, 10);
let buttons;
if (SECRET) {
  const publish = await buildLink(SITE, SECRET, { pr: PR, sha, action: 'publish', exp, preview: articleUrl });
  const decline = await buildLink(SITE, SECRET, { pr: PR, sha, action: 'decline', exp, preview: articleUrl });
  // 本番の公開ボタンが動くかを、送る前に確かめる（確認画面を開くだけ。GET なので公開はしない）。
  // 署名の検証（Cloudflare の COLUMN_APPROVAL_SECRET）と、GitHub のトークン（GITHUB_COLUMN_TOKEN）での PR の読み取りが通れば、確認画面が出る
  let selfCheck;
  try {
    const r = await fetch(publish, { redirect: 'manual', headers: { 'user-agent': 'coana-column-approval-selfcheck' } });
    const html = await r.text();
    selfCheck = r.status === 200 && html.includes('このコラムを公開しますか')
      ? '公開ボタンの動作確認：本番（coana.co.jp）で確認画面が開けることを確かめました（このとき公開はしていません）。'
      : `⚠ 公開ボタンの動作確認に失敗しました（${r.status}：${(html.match(/<h1[^>]*>([^<]*)/) || [])[1] || '内容を読めず'}）。ボタンが使えない場合は、GitHub でこの PR をマージすると公開、クローズすると見送りになります。`;
    if (!selfCheck.startsWith('公開ボタンの動作確認：')) process.exitCode = 1;
  } catch (e) {
    selfCheck = `⚠ 公開ボタンの動作確認ができませんでした（${e.message}）。ボタンが使えない場合は、GitHub でこの PR をマージすると公開、クローズすると見送りになります。`;
    process.exitCode = 1;
  }
  buttons = `### [▶ 公開する](${publish})　　[見送る](${decline})\n\nボタンを押すと確認画面が開き、そこでもう一度ボタンを押したときに実行されます（リンクを開いただけでは公開されません）。リンクの期限：${expDate}。記事が更新されるとこのリンクは無効になり、新しいメールが届きます。\n\n${selfCheck}`;
} else {
  buttons = '**公開ボタンは未設定です**（GitHub の Secrets に COLUMN_APPROVAL_SECRET がありません）。設定後に Actions の「コラムの公開確認」を、この PR の番号で手動実行するとボタン付きのメールが届きます。いまは GitHub でこの PR をマージすると公開、クローズすると見送りになります。';
}
await comment(`${marker}
@${OWNER} コラムの公開確認をお願いします。

## ${title}

${section('要約')}

### 📖 [記事を読む（プレビュー）](${articleUrl})

${buttons}

<details><summary>出典（一次情報）</summary>

${section('出典')}

</details>

<details><summary>レビュー結果（執筆とは別のレビュー担当）</summary>

${section('レビュー結果')}

</details>

公開前のチェック：${runs.map((r) => `${r.name} ✅`).join('、')}`);
console.log(`PR #${PR} に確認コメントを付けた（${articleUrl}）`);
