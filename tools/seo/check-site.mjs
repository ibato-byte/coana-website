// SEO の点検（技術面）。ビルド成果物を配信したローカル（wrangler pages dev）でも、本番でも動く。依存なし（Node 20 以上）。
//
//   node tools/seo/check-site.mjs --base http://localhost:8789 --dist dist --out /tmp/local.json
//   node tools/seo/check-site.mjs --base https://coana.co.jp --prod --external --out prod.json
//   node tools/seo/check-site.mjs --base https://coana.co.jp --prod --light       … 毎日の軽い監視（GitHub Actions）
//
// 結果：errors（直すべきもの）・warnings（確認したいもの）・metrics（数値）・pages（ページごとの要点）を JSON で出す。
// 終了コード：errors があれば 1。
//
// 確かめること
//  サイト全体：robots.txt（Sitemap 行・全体の Disallow がない）、sitemap.xml（URL の重複・ドメイン・noindex のページが入っていない）、
//    llms.txt・feed.xml、ファビコン・site.webmanifest、存在しない URL が 404 を返す、public/_redirects の転送（ローカルのみ）
//  ページごと（sitemap の全URL）：200 で返る、lang、title（有無・長さ・重複）、description（有無・長さ・重複）、canonical（絶対URL・自分自身）、
//    robots の noindex がない、OGP（og:title・og:description・og:image が実在・og:url）、構造化データ（JSON-LD の構文と種類）、
//    h1 が1つ、hreflang の相手が実在、内部リンク（リンク切れ・転送を挟むリンク）、画像（実在・alt・大きすぎないか）、
//    電話番号が載っていない、/cdn-cgi/l/email-protection が出ていない
//  本番のみ（--prod）：http→https・www の扱い、応答時間（TTFB）、主なヘッダー。--external で外部リンクの生存確認
//  --dist：dist の画像・JS・CSS の大きさ
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const BASE = String(opt('base', 'http://localhost:8789')).replace(/\/$/, '');
const SITE = 'https://coana.co.jp';
const PROD = !!opt('prod', false);
const LIGHT = !!opt('light', false);
const EXTERNAL = !!opt('external', false);
const DIST = opt('dist', null);
const OUT = opt('out', null);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

const errors = [], warnings = [];
const err = (kind, where, msg) => errors.push({ kind, where, msg });
const warn = (kind, where, msg) => warnings.push({ kind, where, msg });
const metrics = {};
const pages = {};

const UA = 'Mozilla/5.0 (compatible; COANA-SEO-Check/1.0; +https://coana.co.jp/)';
async function get(url, { method = 'GET', redirect = 'manual', body = true } = {}) {
  const t0 = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { method, redirect, headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(30000) });
      const ttfb = Date.now() - t0;
      const buf = body && method !== 'HEAD' ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
      return { status: r.status, headers: r.headers, text: buf.toString('utf8'), size: buf.length, ttfb, location: r.headers.get('location') };
    } catch (e) {
      if (attempt === 2) return { status: 0, headers: new Headers(), text: '', size: 0, ttfb: Date.now() - t0, error: String(e.cause?.code || e.message || e) };
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
}
const toLocal = (u) => u.replace(/^https?:\/\/(www\.)?coana\.co\.jp/, BASE);
const pathOf = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, attr, name) => { const m = html.match(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`, 'i')) || html.match(new RegExp(`<meta\\s+content="([^"]*)"\\s+${attr}="${name}"`, 'i')); return m ? decode(m[1]) : null; };
const link = (html, rel) => { const m = html.match(new RegExp(`<link\\s+rel="${rel}"[^>]*href="([^"]+)"`, 'i')); return m ? decode(m[1]) : null; };
const len = (s) => [...(s || '')].length;
// 表示幅（全角＝1、半角＝0.5）。title は検索結果で幅により切られるため、こちらで測る
const width = (s) => Math.round([...(s || '')].reduce((w, c) => w + (/[\x20-\x7e｡-ﾟ]/.test(c) ? 0.5 : 1), 0));
const PHONE = /(?:0\d{1,4}[-‐ー−（(]\d{1,4}[-‐ー−）)]\d{3,4}|\+81[-\s]?\d)/;

// 長さの目安（日本語の全角を1文字。Google の表示幅に収まりやすい範囲）
const TITLE_MAX = 40, TITLE_MIN = 10, DESC_MIN = 50, DESC_MAX = 160;

async function main() {
  // ── サイト全体 ──
  const robots = await get(BASE + '/robots.txt');
  if (robots.status !== 200) err('robots', '/robots.txt', `status ${robots.status}`);
  else {
    if (!/^Sitemap:\s*https:\/\/coana\.co\.jp\/sitemap\.xml/mi.test(robots.text)) err('robots', '/robots.txt', 'Sitemap 行がない');
    if (/^Disallow:\s*\/\s*$/mi.test(robots.text)) err('robots', '/robots.txt', 'サイト全体を Disallow している');
  }
  const sm = await get(BASE + '/sitemap.xml');
  if (sm.status !== 200) { err('sitemap', '/sitemap.xml', `status ${sm.status}`); return; }
  const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
  metrics.sitemapUrls = locs.length;
  if (!locs.length) err('sitemap', '/sitemap.xml', 'URL が1件もない');
  const dup = locs.filter((u, i) => locs.indexOf(u) !== i);
  if (dup.length) err('sitemap', '/sitemap.xml', `重複: ${[...new Set(dup)].join(', ')}`);
  for (const u of locs) if (!u.startsWith(SITE + '/') && u !== SITE) err('sitemap', u, 'coana.co.jp（https・www なし）以外の URL');
  const lastmods = (sm.text.match(/<lastmod>/g) || []).length;
  if (lastmods < locs.length) warn('sitemap', '/sitemap.xml', `lastmod がない URL が ${locs.length - lastmods} 件`);

  if (!LIGHT) {
    const llms = await get(BASE + '/llms.txt');
    if (llms.status !== 200) err('llms', '/llms.txt', `status ${llms.status}`);
    else {
      const missing = locs.filter((u) => !llms.text.includes(u) && !llms.text.includes(pathOf(u) + ')'));
      if (missing.length) warn('llms', '/llms.txt', `sitemap にあって llms.txt にない URL: ${missing.map(pathOf).join(', ')}`);
      if (PHONE.test(llms.text)) err('content', '/llms.txt', '電話番号らしき文字列');
    }
    const feed = await get(BASE + '/feed.xml');
    if (feed.status !== 200) err('feed', '/feed.xml', `status ${feed.status}`);
    else metrics.feedItems = (feed.text.match(/<item>/g) || []).length;
  }
  for (const f of ['/favicon.ico', '/favicon.svg', '/favicon-v2-48.png', '/favicon-v2-192.png', '/favicon-v2-512.png', '/apple-touch-icon.png', '/site.webmanifest', '/og-image.jpg']) {
    const r = await get(BASE + f, { body: false, method: 'GET' });
    if (r.status !== 200) err('icon', f, `status ${r.status}${r.location ? ' → ' + r.location : ''}`);
  }
  const nf = await get(BASE + '/this-page-should-not-exist-' + Date.now(), { body: true });
  if (nf.status !== 404) err('404', '/存在しないURL', `404 でなく ${nf.status} を返す（ソフト404）`);
  else if (!/noindex/i.test(meta(nf.text, 'name', 'robots') || '')) warn('404', '/存在しないURL', '404 ページに noindex がない');

  // ── ページごと ──
  const titles = new Map(), descs = new Map();
  const internal = new Map(); // path -> [from pages]
  const images = new Map();
  const externals = new Map();
  let ttfbSum = 0, ttfbN = 0;
  for (const u of locs) {
    const p = pathOf(u);
    const r = await get(toLocal(u));
    const info = (pages[p] = { status: r.status });
    if (r.status !== 200) { err('status', p, `status ${r.status}${r.location ? ' → ' + r.location : ''}${r.error ? ' ' + r.error : ''}`); continue; }
    ttfbSum += r.ttfb; ttfbN++; info.ttfbMs = r.ttfb; info.htmlKB = Math.round(r.size / 1024);
    const h = r.text;
    const lang = (h.match(/<html[^>]*\slang="([^"]+)"/i) || [])[1];
    if (!lang) err('lang', p, '<html lang> がない');
    const title = decode((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
    const desc = meta(h, 'name', 'description');
    info.title = title; info.titleLen = width(title); info.descLen = len(desc);
    if (!title) err('title', p, 'title がない');
    else {
      if (titles.has(title)) err('title', p, `title が ${titles.get(title)} と重複`); else titles.set(title, p);
      if (lang !== 'en' && width(title) > TITLE_MAX) warn('title', p, `title が長い（全角換算 ${width(title)} 文字。目安 ${TITLE_MAX} 以内。検索結果で末尾が切れる）`);
      if (len(title) < TITLE_MIN) warn('title', p, `title が短い（${len(title)}文字）`);
    }
    if (!desc) err('description', p, 'description がない');
    else {
      if (descs.has(desc)) err('description', p, `description が ${descs.get(desc)} と重複`); else descs.set(desc, p);
      if (lang !== 'en' && len(desc) < DESC_MIN) warn('description', p, `description が短い（${len(desc)}文字。目安 ${DESC_MIN}〜${DESC_MAX}）`);
      if (lang !== 'en' && len(desc) > DESC_MAX) warn('description', p, `description が長い（${len(desc)}文字。目安 ${DESC_MIN}〜${DESC_MAX}）`);
    }
    if (LIGHT) continue;
    const can = link(h, 'canonical');
    if (!can) err('canonical', p, 'canonical がない');
    else if (!can.startsWith(SITE)) err('canonical', p, `canonical が coana.co.jp でない: ${can}`);
    else if (pathOf(can).replace(/\/$/, '') !== p.replace(/\/$/, '')) err('canonical', p, `canonical が別のURL: ${can}`);
    const rb = meta(h, 'name', 'robots') || '';
    if (/noindex/i.test(rb)) err('robots-meta', p, 'sitemap にあるのに noindex');
    const ogt = meta(h, 'property', 'og:title'), ogd = meta(h, 'property', 'og:description'), ogi = meta(h, 'property', 'og:image'), ogu = meta(h, 'property', 'og:url');
    if (!ogt || !ogd || !ogi) err('ogp', p, `OGP が欠けている（${[!ogt && 'og:title', !ogd && 'og:description', !ogi && 'og:image'].filter(Boolean).join('・')}）`);
    if (ogi) images.set(toLocal(ogi), [...(images.get(toLocal(ogi)) || []), p + '（og:image）']);
    if (ogu && can && ogu !== can) warn('ogp', p, `og:url と canonical が違う（${ogu}）`);
    if (!meta(h, 'name', 'twitter:card')) warn('ogp', p, 'twitter:card がない');
    const types = [];
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o['@type']) types.push([].concat(o['@type']).join('/')); if (o['@graph']) walk(o['@graph']); } };
        walk(j);
      } catch (e) { err('jsonld', p, `JSON-LD の構文エラー: ${e.message}`); }
    }
    info.jsonld = [...new Set(types)];
    if (!types.length) warn('jsonld', p, '構造化データがない');
    if (p !== '/' && !types.includes('BreadcrumbList')) warn('jsonld', p, 'BreadcrumbList がない');
    const h1 = (h.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) err('h1', p, `h1 が ${h1} 個（クローラー向け本文）`);
    for (const m of h.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g)) internal.set(pathOf(m[2]), [...(internal.get(pathOf(m[2])) || []), p + `（hreflang ${m[1]}）`]);
    for (const m of h.matchAll(/href="([^"#]+)(#[^"]*)?"/g)) {
      const href = decode(m[1]);
      if (/^(mailto:|tel:|javascript:|data:)/.test(href)) { if (href.startsWith('tel:')) err('content', p, '電話番号のリンク（tel:）'); continue; }
      const asset = (x) => /\.(css|js|png|svg|ico|jpg|jpeg|webp|avif|xml|txt|json|webmanifest|woff2?)$/.test(x);
      if (href.startsWith('/') && !href.startsWith('//')) { const x = href.split('?')[0]; if (!asset(x)) internal.set(x, [...(internal.get(x) || []), p]); }
      else if (/^https?:\/\/(www\.)?coana\.co\.jp/.test(href)) { const x = pathOf(href).split('?')[0]; if (!asset(x)) internal.set(x, [...(internal.get(x) || []), p]); }
      else if (/^https?:\/\//.test(href) && !/fonts\.(googleapis|gstatic)\.com|googletagmanager\.com|schema\.org/.test(href)) externals.set(href, [...(externals.get(href) || []), p]);
    }
    for (const m of h.matchAll(/<img\b([^>]*)>/g)) {
      const a = m[1];
      const src = (a.match(/\ssrc="([^"]+)"/) || [])[1];
      if (!/\salt="/.test(a)) err('img-alt', p, `alt のない画像: ${src}`);
      if (src && (src.startsWith('/') || src.includes('coana.co.jp'))) images.set(toLocal(src.startsWith('/') ? BASE + src : src), [...(images.get(toLocal(src.startsWith('/') ? BASE + src : src)) || []), p]);
    }
    const textOnly = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    if (PHONE.test(textOnly)) err('content', p, '電話番号らしき文字列');
    if (h.includes('/cdn-cgi/l/email-protection')) err('email-obfuscation', p, 'Cloudflare のメール書き換え（/cdn-cgi/l/email-protection）が出ている');
  }
  if (ttfbN) metrics.avgTtfbMs = Math.round(ttfbSum / ttfbN);
  metrics.pages = Object.keys(pages).length;

  // ── 内部リンク・画像 ──
  if (!LIGHT) {
    const pageSet = new Set(locs.map((u) => pathOf(u).replace(/\/$/, '') || '/'));
    metrics.internalLinks = internal.size;
    for (const [href, from] of internal) {
      const r = await get(BASE + href, { body: false });
      const where = `${href}（${[...new Set(from)].slice(0, 3).join(', ')}${from.length > 3 ? ' ほか' : ''}）`;
      if (r.status >= 300 && r.status < 400) warn('internal-redirect', where, `転送を挟むリンク → ${r.location}`);
      else if (r.status !== 200) err('broken-link', where, `status ${r.status}`);
      else if (!pageSet.has(href.replace(/\/$/, '') || '/') && !href.startsWith('/admin') && !/\.(pdf|html)$/.test(href)) warn('sitemap', href, 'リンクされているが sitemap にない');
    }
    metrics.images = images.size;
    for (const [src, from] of images) {
      const r = await get(src, { body: true });
      const where = `${pathOf(src)}（${[...new Set(from)].slice(0, 2).join(', ')}）`;
      if (r.status !== 200) { err('image', where, `status ${r.status}`); continue; }
      if (!/^image\//.test(r.headers.get('content-type') || '')) err('image', where, `画像でない Content-Type: ${r.headers.get('content-type')}`);
      if (r.size > 400 * 1024) warn('image-size', where, `${Math.round(r.size / 1024)}KB（400KB 超）`);
    }
  }

  // ── 転送（ローカル：public/_redirects のとおりか） ──
  if (!PROD && !LIGHT) {
    const file = path.join(ROOT, 'public/_redirects');
    if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^(\/\S*)\s+(\S+)\s+(\d{3})/);
      if (!m) continue;
      const [, src, dst, code] = m;
      const r = await get(BASE + src.replace(/\*/g, 'foo/bar').replace(/:\w+/g, 'x'), { body: false });
      const loc = pathOf(r.location || '');
      if (String(r.status) !== code || (!dst.includes(':') && !dst.includes('*') && loc !== dst && r.location !== dst)) err('redirect', src, `期待 ${code} → ${dst}、実際 ${r.status} → ${r.location}`);
    }
  }

  // ── 本番のみ ──
  if (PROD) {
    const http = await get('http://coana.co.jp/', { body: false });
    if (!(http.status >= 300 && http.status < 400 && /^https:\/\/coana\.co\.jp\/?$/.test(http.location || ''))) err('https', 'http://coana.co.jp/', `https へ転送されない（${http.status} → ${http.location}）`);
    const www = await get('https://www.coana.co.jp/', { body: false });
    metrics.www = `${www.status}${www.location ? ' → ' + www.location : ''}`;
    if (www.status === 200) warn('www', 'https://www.coana.co.jp/', 'www が転送されず 200 を返す（canonical で正規化はされている）');
    else if (!(www.status >= 300 && www.status < 400) && www.status !== 0) err('www', 'https://www.coana.co.jp/', `status ${www.status}`);
    const wicon = await get('https://www.coana.co.jp/favicon-v2-192.png', { body: false, redirect: 'follow' });
    if (wicon.status !== 200) warn('www', 'https://www.coana.co.jp/favicon-v2-192.png', `status ${wicon.status}`);
    const home = await get(SITE + '/', { body: false });
    metrics.headers = Object.fromEntries(['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'cache-control', 'server'].map((k) => [k, home.headers.get(k)]));
  }
  if (EXTERNAL) {
    metrics.externalLinks = externals.size;
    for (const [href, from] of externals) {
      let r = await get(href, { method: 'HEAD', redirect: 'follow', body: false });
      if (r.status === 0 || r.status >= 400) r = await get(href, { method: 'GET', redirect: 'follow', body: false });
      if (r.status === 0 || r.status >= 400) (r.status === 404 || r.status === 410 ? err : warn)('external-link', `${href}（${from[0]}）`, r.status ? `status ${r.status}` : `接続できない ${r.error || ''}`);
    }
  }

  // ── dist の大きさ ──
  if (DIST && fs.existsSync(DIST)) {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    const files = walk(DIST).filter((f) => !f.includes(`${path.sep}admin${path.sep}`));
    const kb = (re) => Math.round(files.filter((f) => re.test(f)).reduce((s, f) => s + fs.statSync(f).size, 0) / 1024);
    metrics.jsKB = kb(/\.js$/); metrics.cssKB = kb(/\.css$/);
    for (const f of files) if (/\.(png|jpe?g|webp|avif|gif)$/i.test(f) && fs.statSync(f).size > 400 * 1024) warn('image-size', path.relative(DIST, f), `${Math.round(fs.statSync(f).size / 1024)}KB（400KB 超のファイル）`);
  }
}

await main();
const result = { base: BASE, at: new Date().toISOString(), mode: LIGHT ? 'light' : PROD ? 'prod' : 'local', errors, warnings, metrics, pages };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`${BASE}（${result.mode}）: errors ${errors.length} / warnings ${warnings.length}`);
for (const e of errors) console.log(`NG [${e.kind}] ${e.where}: ${e.msg}`);
for (const w of warnings) console.log(`注意 [${w.kind}] ${w.where}: ${w.msg}`);
process.exitCode = errors.length ? 1 : 0;
