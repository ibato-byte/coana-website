// コラム公開ボタンの署名（HMAC-SHA256）。GitHub Actions（リンクを作る側）と Cloudflare Pages Functions（確かめる側）で共用する。
// Web Crypto だけを使うので、Node 20 以上と Workers の両方で動く。
//
// 署名する内容：PR 番号・その時点の head の SHA・操作（publish／decline）・期限（UNIX 秒）。
// - head の SHA を含めるので、記事が更新される（新しいコミットが入る）と古いリンクは使えなくなる。
// - リンクは CI（Cloudflare Pages のチェック）が合格した SHA に対してだけ発行する（.github/workflows/column-approval.yml）。
// - 一度実行すると PR は閉じる（マージ or クローズ）ので、同じリンクは二度と効かない。

export const LABEL = 'コラム公開待ち';
export const ACTIONS = ['publish', 'decline'];
export const APPROVAL_PATH = '/column-approval';

const enc = new TextEncoder();

export function payload({ pr, sha, action, exp }) {
  return `coana-column:v1:${pr}:${sha}:${action}:${exp}`;
}

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function sign(secret, fields) {
  return b64url(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(payload(fields))));
}

/** 署名が正しいか（長さの違いも含めて、比較にかかる時間が中身で変わらないようにする） */
export async function verify(secret, fields, sig) {
  if (typeof sig !== 'string' || !sig) return false;
  const expected = await sign(secret, fields);
  let diff = expected.length ^ sig.length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (sig.charCodeAt(i) || 0);
  return diff === 0;
}

/** 入力の形を確かめる（署名の確認より前に、変な値を弾く） */
export function parseFields(params) {
  const pr = String(params.get('pr') || '');
  const sha = String(params.get('sha') || '');
  const action = String(params.get('action') || '');
  const exp = String(params.get('exp') || '');
  if (!/^\d{1,7}$/.test(pr) || !/^[0-9a-f]{40}$/.test(sha) || !ACTIONS.includes(action) || !/^\d{10}$/.test(exp)) return null;
  return { pr, sha, action, exp };
}

export async function buildLink(base, secret, { pr, sha, action, exp, preview }) {
  const sig = await sign(secret, { pr, sha, action, exp });
  const q = new URLSearchParams({ pr: String(pr), sha, action, exp: String(exp), sig });
  if (preview) q.set('preview', preview);
  return `${base}${APPROVAL_PATH}?${q}`;
}
