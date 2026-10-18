// 鳩（と荷物）が文字に重ならないか：HOW IT WORKS と FLOW、止まっている間も飛んでいる間も 100ms ごとに確認
// 使い方：node tools/qa/dove-overlap.cjs [幅]（省略すると 1280・390・768）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const SLUGS = ['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'];
const ONLY = process.env.ONLY;
const TARGETS = [['/services', '.flowx'], ...SLUGS.flatMap((s) => [[`/services/${s}`, '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap, .relay'], [`/services/${s}`, '.flowx']])].filter(([u, s]) => !ONLY || (u + ' ' + s).includes(ONLY));
const WIDTHS = process.argv[2] ? [+process.argv[2]] : [1280, 390, 768];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let bad = 0;
  for (const w of WIDTHS) {
    const mob = w < 1000;
    await Promise.all(TARGETS.map(async ([u, sel]) => {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 120000 });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} .dove-layer, .dove-layer *{pointer-events:auto!important}' });
      await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); }, sel);
      await p.mouse.move(1, 1);
      const hits = new Set(); let seen = 0, maxX = 0;
      for (let i = 0; i < (+process.env.SAMPLES || 170); i++) {
        await p.waitForTimeout(100);
        const r = await p.evaluate(([s, dbg]) => {
          const root = document.querySelector(s);
          const layer = root.querySelector('.dove-layer');
          if (!layer) return { out: [], any: false, sw: document.documentElement.scrollWidth };
          const vis = (e, stop = root) => { let o = 1, n = e; while (n && n !== stop) { if (getComputedStyle(n).visibility === 'hidden') return false; o *= +getComputedStyle(n).opacity; n = n.parentElement; } return o > 0.2; };
          const movers = [...layer.querySelectorAll('.dove-shape, .cargo-card, .fx-bubble')].filter(vis);
          const sec = root.closest('section');
          const walk = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
          const rects = [];
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            if (!n.textContent.trim() || n.parentElement.closest('.dove-layer') || !vis(n.parentElement, document.body)) continue;
            const range = document.createRange(); range.selectNodeContents(n);
            // 行の高さ（上下の余白）ではなく、文字そのものの高さ（font-size）で判定する
            const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
            const svgText = n.parentElement.closest('text'); // SVG の文字は textLength で詰めているので、描かれた箱で測る
            for (const tr of svgText ? [svgText.getBoundingClientRect()] : range.getClientRects()) if (tr.width && tr.height) { const cy = (tr.top + tr.bottom) / 2, hh = Math.min(tr.height, fs) / 2; rects.push([{ left: tr.left, right: tr.right, top: cy - hh, bottom: cy + hh }, n.textContent.trim().slice(0, 12)]); }
          }
          const out = [];
          for (const m of movers) {
            const a = m.getBoundingClientRect(); const pad = 2;
            for (const [tr, label] of rects) {
              if (!(a.right - pad > tr.left && a.left + pad < tr.right && a.bottom - pad > tr.top && a.top + pad < tr.bottom)) continue;
              const cx = (Math.max(a.left, tr.left) + Math.min(a.right, tr.right)) / 2, cy = (Math.max(a.top, tr.top) + Math.min(a.bottom, tr.bottom)) / 2;
              const top = document.elementsFromPoint(cx, cy).find((e) => vis(e, document.body)); // 見えていない要素（透明の吹き出し・輪）は除く
              if (top && top.closest('.dove-layer')) out.push(dbg ? `${label}@${m.getAttribute('class')} ${layer.querySelector('.dove').className} t=${Math.round(performance.now())} ${Math.round(a.left)},${Math.round(a.top)}-${Math.round(a.right)},${Math.round(a.bottom)} text ${Math.round(tr.left)},${Math.round(tr.top)}-${Math.round(tr.right)},${Math.round(tr.bottom)}` : label);
            }
          }
          return { out, any: movers.length > 0, sw: document.documentElement.scrollWidth };
        }, [sel, !!process.env.DEBUG]);
        if (r.any) seen++;
        if (process.env.SHOT && r.out.length && !hits.size) {
          await p.screenshot({ path: process.env.SHOT });
          console.log(await p.evaluate(() => { const d = document.querySelector('.flowx .dove'); const n = document.querySelector('.flowx-node'); const s = (e) => { const c = getComputedStyle(e); return `z=${c.zIndex} pe=${c.pointerEvents} pos=${c.position}`; }; return 'dove ' + s(d) + ' node ' + s(n) + ' layer ' + s(d.parentElement); }));
        }
        r.out.forEach((x) => hits.add(x)); maxX = Math.max(maxX, r.sw);
      }
      const ok = hits.size === 0 && seen > 30 && maxX <= w && errs.length === 0;
      if (!ok) bad++;
      console.log(ok ? 'OK' : 'NG', w, u, sel.includes('flowx') ? 'FLOW' : 'HOW', `seen=${seen}`, hits.size ? 'overlap: ' + [...hits].join(' / ') : '', maxX > w ? 'overflow ' + maxX : '', errs.join(' / '));
      await ctx.close();
    }));
  }
  console.log(bad ? 'NG ' + bad : 'ALL OK'); await b.close();
})();
