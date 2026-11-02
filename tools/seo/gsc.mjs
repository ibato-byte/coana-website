// Search Console（検索パフォーマンス）のデータを取る。GitHub Actions「SEO の監視」の週次で実行し、seo-data の Issue に残す。
//   node tools/seo/gsc.mjs --out gsc.json
// 必要なもの（オーナーが一度だけ設定。手順は docs/SEO_PLAYBOOK.md「7.」）：
//   GitHub の Secrets に GSC_SERVICE_ACCOUNT_JSON（Google Cloud のサービスアカウントの鍵 JSON。Search Console にそのアカウントを「制限付き」で追加しておく）
//   任意：GSC_SITE（既定 sc-domain:coana.co.jp）
// 鍵がなければ何もせず終了コード 0（レポートでは「Search Console：未設定」）。依存パッケージは使わない（Node の標準機能だけ）。
// 取るもの：直近28日（データの遅れを見て3日前まで）と、その前の28日の合計・クエリ上位・ページ上位。社名での検索（coana を含む）を分けて数える。
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const OUT = opt('out', 'gsc.json');
const SITE = process.env.GSC_SITE || 'sc-domain:coana.co.jp';
const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
if (!raw) { console.log('GSC_SERVICE_ACCOUNT_JSON がない（Search Console は未設定）。何もしない'); process.exit(0); }

const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function signedJwt(key, now = Math.floor(Date.now() / 1000)) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key);
  return `${head}.${claim}.${b64url(sig)}`;
}

const day = (offset) => new Date(Date.now() + 9 * 3600e3 - offset * 864e5).toISOString().slice(0, 10); // 日本時間の日付
const range = { start: day(30), end: day(3) };
const prevRange = { start: day(58), end: day(31) };
const BRAND = /coana|コアナ/i;

async function main() {
  const key = JSON.parse(raw);
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt(key) }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error('トークンを取れない：' + JSON.stringify(tok).slice(0, 300));
  const query = async (r, body) => {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
      method: 'POST', headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate: r.start, endDate: r.end, ...body }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`Search Console API ${res.status}：${JSON.stringify(j).slice(0, 300)}`);
    return (j.rows || []).map((x) => ({ key: x.keys?.[0], clicks: x.clicks, impressions: x.impressions, ctr: +(x.ctr * 100).toFixed(1), position: +x.position.toFixed(1) }));
  };
  const total = async (r) => (await query(r, {}))[0] || { clicks: 0, impressions: 0, ctr: 0, position: null };
  const queries = await query(range, { dimensions: ['query'], rowLimit: 100 });
  const prevQueries = await query(prevRange, { dimensions: ['query'], rowLimit: 100 });
  const brandClicks = (qs) => qs.filter((q) => BRAND.test(q.key)).reduce((s, q) => s + q.clicks, 0);
  const nonBrandClicks = (qs) => qs.filter((q) => !BRAND.test(q.key)).reduce((s, q) => s + q.clicks, 0);
  const out = {
    site: SITE, at: new Date().toISOString(), range, prevRange,
    totals: await total(range), prevTotals: await total(prevRange),
    brandClicks: brandClicks(queries), prevBrandClicks: brandClicks(prevQueries),
    // 社名以外は、クエリが分かるものだけの合計（Google が伏せたクエリは入らない）
    nonBrandClicks: nonBrandClicks(queries), prevNonBrandClicks: nonBrandClicks(prevQueries),
    queries, pages: await query(range, { dimensions: ['page'], rowLimit: 50 }),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Search Console ${range.start}〜${range.end}：クリック ${out.totals.clicks}（社名 ${out.brandClicks}）・表示 ${out.totals.impressions} → ${OUT}`);
}
main().catch((e) => { console.error('Search Console の取得に失敗（監視の結果には影響しない）：' + e.message); process.exit(0); });
