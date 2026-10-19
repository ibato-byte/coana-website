// 公開ボタン（functions/column-approval.ts）の安全性テスト。GitHub API は偽物に差し替える（実際の PR は触らない）。
//   node tools/column/approval.test.mjs
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { sign } from './signature.mjs';

const out = path.join(os.tmpdir(), `column-approval-${process.pid}.mjs`);
execFileSync('npx', ['-y', 'esbuild@0.24.0', 'functions/column-approval.ts', '--bundle', '--format=esm', '--platform=neutral', `--outfile=${out}`, '--log-level=error'], { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..') });
const fn = await import(out);

const SECRET = 'test-secret';
const env = { COLUMN_APPROVAL_SECRET: SECRET, GITHUB_COLUMN_TOKEN: 'test-token' };
const SHA = 'a'.repeat(40);
const future = String(Math.floor(Date.now() / 1000) + 3600);
const past = String(Math.floor(Date.now() / 1000) - 10);

let state, calls;
const reset = (over = {}) => {
  calls = [];
  state = { pr: { number: 57, title: '【コラム公開待ち】テスト記事', state: 'open', merged: false, html_url: 'https://github.com/x/57', head: { sha: SHA, ref: 'claude/column-test', repo: { full_name: 'ibato-byte/coana-website' } }, base: { ref: 'main' }, labels: [{ name: 'コラム公開待ち' }] }, runs: [{ name: 'Cloudflare Pages', status: 'completed', conclusion: 'success' }, { name: 'approval-mail', status: 'completed', conclusion: 'cancelled' }], ...over };
};
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = init.method || 'GET';
  calls.push(`${m} ${u.replace('https://api.github.com/repos/ibato-byte/coana-website', '')}`);
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/pulls/57') && m === 'GET') return json(state.pr);
  if (u.includes('/check-runs')) return state.checksStatus ? json({ message: 'no' }, state.checksStatus) : json({ check_runs: state.runs });
  if (u.endsWith('/pulls/57/merge')) return json({ merged: true });
  return json({});
};

const link = async (action, o = {}) => {
  const f = { pr: '57', sha: SHA, action, exp: future, ...o };
  const sig = o.sig ?? (await sign(SECRET, f));
  return new URLSearchParams({ ...f, sig });
};
const get = async (q, e = env) => fn.onRequestGet({ request: new Request(`https://coana.co.jp/column-approval?${q}`), env: e });
const post = async (q, e = env, headers = {}) => fn.onRequestPost({ request: new Request('https://coana.co.jp/column-approval', { method: 'POST', body: q, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers } }), env: e });
const mutated = () => calls.filter((c) => !c.startsWith('GET'));

let ok = 0, ng = 0;
const t = async (name, fnc) => { try { await fnc(); ok++; console.log('OK', name); } catch (e) { ng++; console.log('NG', name, '—', e.message); } };
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

await t('設定がないと 503（何もしない）', async () => { reset(); const r = await get(await link('publish'), {}); expect(r.status === 503 && !mutated().length, r.status); });
await t('署名が違うと 400', async () => { reset(); const r = await post(await link('publish', { sig: 'x' })); expect(r.status === 400 && !mutated().length, r.status); });
await t('操作を書き換えると 400（decline の署名で publish）', async () => { reset(); const q = await link('decline'); q.set('action', 'publish'); const r = await post(q); expect(r.status === 400 && !mutated().length, r.status); });
await t('期限切れは 410', async () => { reset(); const f = { pr: '57', sha: SHA, action: 'publish', exp: past }; const q = new URLSearchParams({ ...f, sig: await sign(SECRET, f) }); const r = await post(q); expect(r.status === 410 && !mutated().length, r.status); });
await t('GET（リンクを開く・先読み）は確認画面だけ', async () => { reset(); const r = await get(await link('publish')); const h = await r.text(); expect(r.status === 200 && h.includes('method="post"') && !mutated().length, `${r.status} ${mutated()}`); });
await t('POST で公開：sha 指定でマージ・コメント・ブランチ削除', async () => { reset(); const r = await post(await link('publish')); const h = await r.text(); expect(r.status === 200 && h.includes('公開しました') && calls.includes('PUT /pulls/57/merge'), `${r.status} ${calls}`); });
await t('ラベルなしの PR はマージしない（403）', async () => { reset(); state.pr.labels = []; const r = await post(await link('publish')); expect(r.status === 403 && !mutated().length, r.status); });
await t('main 以外へのマージは拒否（403）', async () => { reset(); state.pr.base.ref = 'dev'; const r = await post(await link('publish')); expect(r.status === 403 && !mutated().length, r.status); });
await t('記事が更新された（sha が違う）ら 409', async () => { reset(); state.pr.head.sha = 'b'.repeat(40); const r = await post(await link('publish')); expect(r.status === 409 && !mutated().length, r.status); });
await t('チェックが不合格ならマージしない（409）', async () => { reset(); state.runs = [{ name: 'Cloudflare Pages', status: 'completed', conclusion: 'failure' }]; const r = await post(await link('publish')); expect(r.status === 409 && !mutated().length, r.status); });
await t('チェックが実行中ならマージしない（409）', async () => { reset(); state.runs = [{ name: 'Cloudflare Pages', status: 'in_progress', conclusion: null }]; const r = await post(await link('publish')); expect(r.status === 409 && !mutated().length, r.status); });
await t('チェックが1つもなければマージしない（409）', async () => { reset(); state.runs = [{ name: 'approval-mail', status: 'completed', conclusion: 'success' }]; const r = await post(await link('publish')); expect(r.status === 409 && !mutated().length, r.status); });
await t('トークンに Checks の権限がない（403）ときは署名を根拠に公開', async () => { reset(); state.checksStatus = 403; const r = await post(await link('publish')); expect(r.status === 200 && calls.includes('PUT /pulls/57/merge'), `${r.status}`); });
await t('チェックの API が 500 ならマージしない', async () => { reset(); state.checksStatus = 500; const r = await post(await link('publish')); expect(r.status === 502 && !mutated().length, r.status); });
await t('二度目（マージ済み）は何もしない', async () => { reset(); state.pr.merged = true; state.pr.state = 'closed'; const r = await post(await link('publish')); const h = await r.text(); expect(r.status === 200 && h.includes('公開済み') && !mutated().length, r.status); });
await t('見送り：PR をクローズ（マージしない）', async () => { reset(); const r = await post(await link('decline')); expect(r.status === 200 && calls.includes('PATCH /pulls/57') && !calls.includes('PUT /pulls/57/merge'), calls.join(',')); });
await t('別サイトからの POST は 403', async () => { reset(); const r = await post(await link('publish'), env, { origin: 'https://evil.example' }); expect(r.status === 403 && !mutated().length, r.status); });
await t('プレビュー以外の URL は確認画面に出さない', async () => { reset(); const q = await link('publish'); q.set('preview', 'https://evil.example/x'); const h = await (await get(q)).text(); expect(!h.includes('evil.example'), 'leaked'); });

console.log(`${ok} OK / ${ng} NG`);
process.exitCode = ng ? 1 : 0;
