// レスポンシブの総点検：全ページ × 多数の画面サイズ（スマホの縦・横、折りたたみ、タブレット、区切りの前後、ノートPC、大画面）
// （2026-11-22 オーナー依頼「さまざまなレスポンシブで問題がないか、見にくいところがないか」）
//
//   node tools/qa/responsive.cjs                         … 全ページ × 全サイズ
//   ONLY=/,/services/bookkeeping VP=320x568,768x1024 node tools/qa/responsive.cjs
//   SHOW=warn node tools/qa/responsive.cjs               … 「注意」も1件ずつ表示（既定は NG だけ詳しく、注意は件数）
//   FONTSOURCE_DIR=… を付けると、本番と同じ書体で測る（tools/qa/fonts.cjs。付けないと作業環境の代わりの書体）
//
// NG（1件でもあれば終了コード 1）
//   横スクロール／画面からはみ出す要素／文字どうしの重なり／文字が枠で切れている／12px 未満の文字／
//   画像の欠け・ゆがみ／ヘッダーの下に見出しが潜る／カードから文字がはみ出す／1行が1〜2文字の細長い文字の列
// 注意（目で確かめる候補。終了コードには数えない）
//   見出しの最後の行が短い／押す場所が小さい（スマホ・タブレットで高さ 36px 未満）／1行が長すぎる／
//   文字が画面の端に近い／何もない縦のすき間が大きい
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const { useLocalFonts, settleFonts, available } = require('./fonts.cjs');

const BASE = process.env.BASE || 'http://localhost:4173';
const DIST = process.env.DIST || path.join(__dirname, '../../dist');
const list = (dir) => (fs.existsSync(path.join(DIST, dir)) ? fs.readdirSync(path.join(DIST, dir)).filter((f) => f.endsWith('.html')).map((f) => `/${dir}/${f.replace('.html', '')}`) : []);
const topics = list('topics');
// 記事は形が同じなので、代表を2本（図の多いもの・短いもの）
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ['/', '/services', '/pricing', ...list('services'), '/about', '/topics', ...topics.slice(0, 1), ...topics.slice(-1), '/contact', '/privacy', '/this-page-does-not-exist'];
const VIEWPORTS = (process.env.VP || [
  // スマホ（縦）：小さい順。344 は折りたたみ（閉じた状態）
  '320x568', '344x882', '360x740', '375x667', '390x844', '412x915', '430x932',
  // スマホ（横）
  '568x320', '667x375', '844x390', '932x430',
  // 大きなスマホ・小さなタブレット、区切り（640・760）の前後
  '480x854', '540x720', '600x960', '640x960', '641x960', '700x900', '760x1000', '761x1000',
  // タブレット（縦・横）、区切り（980・1100）の前後
  '768x1024', '820x1180', '912x1368', '980x1200', '981x1200', '1024x768', '1024x1366', '1100x800', '1101x800', '1180x820',
  // ノートPC・デスクトップ・大画面（高さの低い画面を含む）
  '1280x600', '1280x720', '1366x768', '1440x900', '1536x864', '1680x1050', '1920x1080', '2560x1440',
].join(',')).split(',').map((s) => s.split('x').map(Number));
const SHOW = process.env.SHOW || '';
const JOBS = +(process.env.JOBS || 4);

const scan = () => {
  const ng = [], warn = [];
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const main = document.querySelector('main') || document.body;
  const touch = matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0;
  const idOf = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + '「' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14) + '」';
  const vis = (e) => { if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) return false; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || +cs.opacity < 0.2 || cs.display === 'none') return false; } return true; };
  const skip = (e) => !!e.closest('[aria-hidden="true"], .visually-hidden, .sr-only, .seo-fallback, .form-honeypot, svg');
  const clipBox = (e) => { let l = -1e9, t = -1e9, r = 1e9, b = 1e9; for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip|auto|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) { const c = n.getBoundingClientRect(); l = Math.max(l, c.left); t = Math.max(t, c.top); r = Math.min(r, c.right); b = Math.min(b, c.bottom); } } return { l, t, r, b }; };
  const inScroller = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || s.overflow === 'hidden') return true; } return false; };

  // 1. 横スクロール・画面からはみ出す要素
  if (document.documentElement.scrollWidth > vw + 1) ng.push('横スクロール（' + document.documentElement.scrollWidth + ' > ' + vw + '）');
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
    if ((rc.right > vw + 1 || rc.left < -1) && !inScroller(el) && getComputedStyle(el).position !== 'fixed' && !el.closest('[aria-hidden="true"]')) ng.push('画面からはみ出し ' + idOf(el));
  }

  // 文字を直接持つ、見えている要素
  const textEls = [...document.querySelectorAll('main *, header *, footer *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !skip(e) && vis(e));
  const linesOf = (e) => { const rr = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(n); rr.push(...[...range.getClientRects()].filter((x) => x.width > 1 && x.height > 1)); } return rr; };
  const rectsRaw = textEls.map(linesOf);

  // 2. 文字が枠（overflow: hidden など）で切れている／12px 未満
  const rects = textEls.map((e, i) => {
    const c = clipBox(e); const out = [];
    for (const x of rectsRaw[i]) {
      const l = Math.max(x.left, c.l), t = Math.max(x.top, c.t), r = Math.min(x.right, c.r), b = Math.min(x.bottom, c.b);
      if (r - l <= 2 || b - t <= 2) continue; // まるごと隠れている（閉じた開閉UIなど）
      // 横に送れる一覧（トピックスの絞り込み）は、切れて見えるのが正しいので除く
      if (((x.right - x.left) - (r - l) > 3 || (x.bottom - x.top) - (b - t) > x.height * 0.3) && !e.closest('.filter-row')) ng.push('文字が枠で切れている ' + idOf(e));
      out.push({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
    }
    return out;
  });
  textEls.forEach((e, i) => { if (!rects[i].length) return; const f = parseFloat(getComputedStyle(e).fontSize); if (f < 12 && !e.closest('.sky-hero, .filter-row')) ng.push('12px 未満の文字 ' + f + 'px ' + idOf(e)); });

  // 3. 文字どうしの重なり（小さい方の行の 35% 以上が重なる）
  for (let i = 0; i < textEls.length; i++) for (let j = i + 1; j < textEls.length; j++) {
    const a = textEls[i], c = textEls[j]; if (a.contains(c) || c.contains(a)) continue;
    if (a.getAnimations().some((x) => x instanceof CSSTransition) || c.getAnimations().some((x) => x instanceof CSSTransition)) continue;
    // 固定表示（ヘッダー・固定バー）と本文の重なりは、スクロールの途中では当たり前なので数えない
    const fixed = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) if (/fixed|sticky/.test(getComputedStyle(n).position)) return n; return null; };
    if (fixed(a) !== fixed(c)) continue;
    let hit = false;
    for (const r1 of rects[i]) { for (const r2 of rects[j]) { const ov = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top); if (Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left) > 3 && ov > 3 && ov > 0.35 * Math.min(r1.height, r2.height)) { hit = true; break; } } if (hit) break; }
    if (hit) ng.push('文字の重なり ' + idOf(a) + ' × ' + idOf(c));
  }

  // 4. 細長い文字の列（3行以上で、1行に2文字ほどしか入っていない）／1行が長すぎる
  textEls.forEach((e, i) => {
    // 行ごとにまとめる（<wbr> で分かれた文字は、同じ行でも別々の箱になる）
    const rows = []; for (const x of rects[i]) { const last = rows[rows.length - 1]; if (last && Math.abs(last.top - x.top) < x.height * 0.5) { last.left = Math.min(last.left, x.left); last.right = Math.max(last.right, x.right); } else rows.push({ top: x.top, left: x.left, right: x.right }); }
    if (rows.length < 3) return;
    const f = parseFloat(getComputedStyle(e).fontSize);
    const w = Math.max(...rows.map((x) => x.right - x.left));
    if (w < f * 2.6 && (e.textContent || '').trim().length >= 8) ng.push('細長い文字の列（1行に約' + Math.max(1, Math.round(w / f)) + '文字） ' + idOf(e));
  });
  for (const p of main.querySelectorAll('p, li, dd')) {
    if (skip(p) || !vis(p) || p.closest('.article-body, .privacy-body')) continue;
    const rr = linesOf(p); if (rr.length < 2) continue;
    const f = parseFloat(getComputedStyle(p).fontSize); const w = Math.max(...rr.map((x) => x.width));
    const en = document.documentElement.lang === 'en' || /^[\x00-\x7f]+$/.test((p.textContent || '').trim().slice(0, 40));
    if (w / f > (en ? 52 : 46)) warn.push('1行が長い（約' + Math.round(w / f * (en ? 2 : 1)) + '文字） ' + idOf(p));
  }

  // 5. 見出し：最後の行が1文字（NG）／短い（注意）。ヘッダーの下に潜る（NG）
  for (const h of main.querySelectorAll('h1, h2, h3')) {
    if (skip(h) || !vis(h)) continue;
    const rg = document.createRange(); rg.selectNodeContents(h);
    const lines = []; for (const r of [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0)) { const last = lines[lines.length - 1]; if (last && Math.abs(last.top - r.top) < r.height * 0.5) { last.left = Math.min(last.left, r.left); last.right = Math.max(last.right, r.right); } else lines.push({ top: r.top, left: r.left, right: r.right, height: r.height }); }
    if (lines.length < 2) continue;
    const f = parseFloat(getComputedStyle(h).fontSize); const last = lines[lines.length - 1]; const lw = last.right - last.left; const maxw = Math.max(...lines.map((l) => l.right - l.left));
    if (lw < f * 1.3) ng.push('見出しの最後の行が1文字 ' + idOf(h));
    else if (lw < f * 3.2 && lw < maxw * 0.34) warn.push('見出しの最後の行が短い（約' + Math.round(lw / f) + '文字） ' + idOf(h));
  }
  const header = document.querySelector('.site-header .header-inner');
  if (header && scrollY < 4) {
    const hb = header.getBoundingClientRect().bottom;
    for (const e of main.querySelectorAll('h1, .lpx-crumbs, .sky-crumbs, .lpx-hero-label')) { if (!vis(e)) continue; const t = e.getBoundingClientRect().top; if (t < hb + 4 && t > -50) ng.push('ヘッダーの下に潜る ' + idOf(e) + '（' + Math.round(t - hb) + 'px）'); }
  }

  // 6. カードから文字がはみ出す
  const CARDS = '.hv-case, .hv-case-step, .hv-case-result, .lpx-plan, .lpx-case, .lpx-scope-card, .lpx-ba-cell, .lpx-tools li, .lpx-relay-side, .lpx-relay-areas li, .lpx-relay-center, .lpx-relay-team, .lpx-lane-node, .lpx-hero-facts li, .lpx-point, .lpx-steps li, .lpx-flow-list li, .lpx-worry-list li, .lpx-faq-item, a.lpx-other, a.lpx-column, .hv-svc, .case-card, .service-card, .finder-card, .faq-ask, .pricing-box, .button, a.line-button, .tool-pills li, .topic-tile, .article-row, .contact-form-card, .header-inner';
  textEls.forEach((e, i) => {
    // カードの縁に載せる札（おすすめ・受け取るもの など）は、はみ出して見せるものなので除く
    if (e.closest('.lpx-plan-tag, .lpx-relay-head, .lpx-relay-goal-tag, .service-tag')) return;
    const box = e.closest(CARDS); if (!box || box === e || !rects[i].length) return;
    const br = box.getBoundingClientRect();
    for (const x of rects[i]) if (x.right > br.right + 2 || x.left < br.left - 2 || x.bottom > br.bottom + 3 || x.top < br.top - 3) { ng.push('カードから文字がはみ出す ' + idOf(e)); break; }
  });

  // 7. 画像：欠け・ゆがみ
  for (const im of document.images) {
    const r = im.getBoundingClientRect(); if (!r.width || !r.height || !vis(im)) continue;
    if (im.complete && im.naturalWidth === 0) { ng.push('画像が読めない ' + im.getAttribute('src')); continue; }
    const fit = getComputedStyle(im).objectFit;
    if (im.naturalWidth && (fit === 'fill' || fit === '') && Math.abs(r.width / r.height - im.naturalWidth / im.naturalHeight) > 0.04 * (im.naturalWidth / im.naturalHeight)) ng.push('画像がゆがんでいる ' + im.getAttribute('src'));
  }

  // 8. 押す場所の大きさ（タッチの画面）。文章の中のリンクは除く
  if (touch) for (const el of document.querySelectorAll('main a, main button, main summary, header a, header button, footer a, .lp-sticky a, .lp-sticky button')) {
    if (skip(el) || !vis(el)) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' && el.closest('p, li, dd, .article-body')) continue;
    if (r.height < 36 - 0.5) warn.push('押す場所が小さい（高さ ' + Math.round(r.height) + 'px） ' + idOf(el));
  }

  // 9. 文字が画面の端に近い（スマホで左右 10px 未満）
  // 横に送れる一覧（トピックスの絞り込みなど。右端をぼかして続きがあると見せる）の中は、端に触れるのが正しいので除く
  const inHScroll = (el) => { for (let n = el.parentElement; n; n = n.parentElement) if (/(auto|scroll)/.test(getComputedStyle(n).overflowX) && n.scrollWidth > n.clientWidth + 1) return true; return false; };
  if (vw <= 760) textEls.forEach((e, i) => { if (e.closest('.site-header, .lp-sticky, .sky-tape, .sky-tape-wrap, .contact-band-big') || inHScroll(e)) return; for (const x of rects[i]) if (x.left < 10 || x.right > vw - 10) { warn.push('文字が画面の端に近い ' + idOf(e)); break; } });

  // 10. 何もない縦のすき間（本文の中で 420px 以上。トップの固定ヒーローは除く）
  const spans = [];
  for (const e of main.querySelectorAll('*')) { if (e.closest('.sky-hero, .sky-hero-stick') || !vis(e)) continue; const has = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(IMG|SVG|svg|INPUT|TEXTAREA|SELECT|BUTTON|CANVAS|VIDEO)$/.test(e.tagName); if (!has) continue; const r = e.getBoundingClientRect(); if (r.height > 0 && r.width > 0) spans.push([r.top + scrollY, r.bottom + scrollY]); }
  spans.sort((a, b) => a[0] - b[0]);
  let end = spans.length ? spans[0][1] : 0;
  for (const [t, b] of spans) { if (t - end > 420) warn.push('何もない縦のすき間 ' + Math.round(t - end) + 'px（ページの上から ' + Math.round(end) + 'px）'); end = Math.max(end, b); }

  return { ng: [...new Set(ng)], warn: [...new Set(warn)] };
};

(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  const jobs = [];
  for (const [w, h] of VIEWPORTS) for (const u of PAGES) jobs.push({ w, h, u });
  const found = new Map(); // 種類＋ページ → { level, msg, vps:Set }
  const add = (level, u, msg, vp) => { const k = level + '|' + u + '|' + msg.replace(/\d+(\.\d+)?px/g, 'Npx').replace(/（[^）]*）/g, ''); if (!found.has(k)) found.set(k, { level, u, msg, vps: new Set() }); found.get(k).vps.add(vp); };
  let done = 0;
  const worker = async () => {
    for (;;) {
      const job = jobs.shift(); if (!job) return;
      const { w, h, u } = job; const vp = w + 'x' + h;
      const mobile = w <= 932 || (w <= 1366 && h > w);
      const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', hasTouch: mobile, isMobile: mobile && w < 1000 });
      await useLocalFonts(ctx);
      const p = await ctx.newPage();
      try {
        await p.goto(BASE + u, { waitUntil: 'domcontentloaded' });
        await p.waitForSelector('main');
        await settleFonts(p);
        // 画面外の文字の書体も読み込ませる（ページの下まで送ってから戻る）
        const total = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < total; y += Math.max(400, h)) { await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(40); }
        await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await settleFonts(p); await p.waitForTimeout(250);
        const r1 = await p.evaluate(scan);
        // 開閉をすべて開いた状態でも
        await p.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); document.querySelectorAll('.faq-q[aria-expanded="false"], .lpx-faq-q[aria-expanded="false"]').forEach((q) => q.click()); });
        await p.waitForTimeout(500); await settleFonts(p);
        const r2 = await p.evaluate(scan);
        for (const m of new Set([...r1.ng, ...r2.ng])) add('NG', u, m, vp);
        for (const m of new Set([...r1.warn, ...r2.warn])) add('注意', u, m, vp);
      } catch (e) { add('NG', u, '読み込みに失敗 ' + String(e).slice(0, 80), vp); }
      await ctx.close();
      if (++done % 40 === 0) process.stderr.write(`… ${done}/${done + jobs.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  await b.close();
  const rows = [...found.values()].sort((a, b2) => (a.level === b2.level ? (a.u + a.msg).localeCompare(b2.u + b2.msg) : a.level === 'NG' ? -1 : 1));
  const fmt = (r) => `${r.level} ${r.u}  ${r.msg}\n      画面：${[...r.vps].join(' ')}`;
  const ngs = rows.filter((r) => r.level === 'NG'), warns = rows.filter((r) => r.level === '注意');
  for (const r of ngs) console.log(fmt(r));
  if (SHOW === 'warn') for (const r of warns) console.log(fmt(r));
  else { const kinds = {}; for (const r of warns) { const k = r.msg.split(/[ （]/)[0]; kinds[k] = (kinds[k] || 0) + 1; } if (warns.length) console.log('注意（SHOW=warn で1件ずつ表示）：' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(' ／ ')); }
  console.log(`${ngs.length ? 'NG ' + ngs.length + ' 種類' : 'NG なし'}（${PAGES.length} ページ × ${VIEWPORTS.length} 画面サイズ、書体：${available() ? '本番と同じ' : '作業環境の代わりの書体'}）`);
  process.exit(ngs.length ? 1 : 0);
})();
