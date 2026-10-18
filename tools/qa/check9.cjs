const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const BASE = 'http://localhost:4173';
const dist = __dirname + '/../../dist';
const svc = fs.readdirSync(dist + '/services').map(f => '/services/' + f.replace('.html', ''));
const topics = fs.readdirSync(dist + '/topics').map(f => '/topics/' + f.replace('.html', ''));
const pages = ['/', '/about', '/services', ...svc, '/topics', ...topics, '/contact', '/privacy', '/this-page-does-not-exist'];
const report = { errors: [], overflow: [], wide: [], images: [], failedReq: [], links: new Map() };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [vp, w, h] of [320,375,390,414,768,1024,1280,1440,1920].map((w) => [String(w), w, w < 700 ? 800 : w < 1100 ? 1024 : 900])) {
    const mobile = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    let cur = '';
    p.on('console', m => { if (m.type() === 'error') report.errors.push(`${vp} ${cur} console: ${m.text().slice(0, 160)}`); });
    p.on('pageerror', e => report.errors.push(`${vp} ${cur} pageerror: ${e.message}`));
    p.on('requestfailed', r => { const u = r.url(); if (u.startsWith(BASE)) report.failedReq.push(`${vp} ${cur} ${u} ${r.failure()?.errorText}`); });
    p.on('response', r => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400 && !u.includes('this-page-does-not-exist')) report.failedReq.push(`${vp} ${cur} ${r.status()} ${u}`); });
    for (const url of pages) {
      cur = url;
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
      // スクロールして遅延読み込み・出現アニメーションを発火
      const H = await p.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(40); }
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const docOverflow = document.documentElement.scrollWidth > vw;
        // 横スクロール容器（overflow-x:auto）の中身と、意図的にはみ出す装飾は除外
        const inScroller = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX) || s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'clip') return true; } return false; };
        const wide = [];
        for (const el of document.querySelectorAll('main *, header *, footer *')) {
          const rc = el.getBoundingClientRect();
          if (rc.width === 0 || rc.height === 0) continue;
          if ((rc.right > vw + 1 || rc.left < -1) && !inScroller(el) && getComputedStyle(el).position !== 'fixed') {
            wide.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName) + ` (${Math.round(rc.left)}..${Math.round(rc.right)})`);
          }
        }
        const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy' || (i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().height > 0)).map(i => i.src);
        const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
        // 文字どうしの重なり（どちらかがもう一方を含む場合と、固定表示の要素は除く）
        const textEls = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li, main a, main button, main dt, main dd, main small, main strong, main label, main span')]
          .filter((e) => { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const clipped = (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflow !== 'visible' || ac.overflowY !== 'visible') { const ar = a.getBoundingClientRect(); if (r.bottom <= ar.top + 1 || r.top >= ar.bottom - 1) return true; } } return !!e.closest('details:not([open]) > :not(summary)'); })(); return !clipped && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.1 && !e.closest('.visually-hidden, .form-honeypot, [aria-hidden="true"], .lp-sticky, .chat-panel, .hero-rotate, svg'); });
        const rects = textEls.map((e) => { const range = document.createRange(); range.selectNodeContents(e); return [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2); });
        const overlaps = [];
        for (let i = 0; i < textEls.length; i++) for (let j = i + 1; j < textEls.length; j++) {
          const a = textEls[i], bb = textEls[j]; if (a.contains(bb) || bb.contains(a)) continue;
          let hit = false;
          for (const r1 of rects[i]) { for (const r2 of rects[j]) { const ox = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left); const oy = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top); if (ox > 3 && oy > 3) { hit = true; break; } } if (hit) break; }
          if (hit) overlaps.push((a.className || a.tagName) + ' × ' + (bb.className || bb.tagName) + ' "' + a.textContent.trim().slice(0, 10) + '"');
        }
        const notfound = !!document.querySelector('h1') && document.querySelector('h1').textContent.includes('ページが見つかりません');
        const hidden = [...document.querySelectorAll('[data-reveal]')].filter(e => !e.classList.contains('in')).length;
        return { docOverflow, wide: [...new Set(wide)].slice(0, 6), imgs, links, notfound, hidden, overlaps: overlaps.slice(0, 5) };
      });
      if (r.docOverflow) report.overflow.push(`${vp} ${url}`);
      if (r.wide.length) report.wide.push(`${vp} ${url}: ${r.wide.join(', ')}`);
      if (r.overlaps.length) (report.overlaps ||= []).push(`${vp} ${url}: ${r.overlaps.join(' | ')}`);
      if (r.imgs.length) report.images.push(`${vp} ${url}: ${r.imgs.join(', ')}`);
      if (r.hidden) report.errors.push(`${vp} ${url}: reveal残り ${r.hidden}`);
      if (r.notfound && !url.includes('does-not-exist')) report.errors.push(`${vp} ${url}: NotFound表示`);
      if (vp === '1280') for (const l of r.links) { if (!report.links.has(l)) report.links.set(l, url); }
    }
    await ctx.close();
  }
  // ── リンク・アンカー確認 ──
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const broken = [];
  const internal = [...report.links.entries()].filter(([l]) => l.startsWith('/') || l.startsWith('#') || l.startsWith(BASE));
  const external = [...report.links.keys()].filter(l => /^(https?:|mailto:|tel:)/.test(l));
  for (const [l, from] of internal) {
    const target = l.startsWith('#') ? from + l : l;
    const [path, hash] = target.split('#');
    const res = await p.goto(BASE + (path || '/'), { waitUntil: 'networkidle' });
    const st = res ? res.status() : 0;
    const info = await p.evaluate((hash) => ({
      notfound: (document.querySelector('h1')?.textContent || '').includes('ページが見つかりません'),
      anchor: hash ? !!document.getElementById(decodeURIComponent(hash)) : true,
    }), hash);
    // 静的ファイル（画像・xml 等）は HTTP ステータスで判定
    const isFile = /\.[a-z0-9]+$/i.test(path) && !path.endsWith('.html');
    if (isFile ? st >= 400 : (info.notfound || !info.anchor)) broken.push(`${l} (from ${from}) notfound=${info.notfound} anchor=${info.anchor} status=${st}`);
  }
  console.log(JSON.stringify({ pages: pages.length, ...report, links: undefined, internalLinks: internal.length, broken, external }, null, 1));
  await b.close();
})();
