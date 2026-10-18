const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PAGES = ['/services', '/services/bookkeeping', '/services/startup-support-en', '/services/web-production'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let bad = 0;
  for (const [w, h, mob] of [[1280, 900, false], [390, 844, true], [768, 1000, true]]) {
    for (const u of PAGES) {
      const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} .flowj, .flowj *{pointer-events:auto!important}' });
      await p.evaluate(() => { const e = document.querySelector('.flowx'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 160); });
      await p.mouse.move(1, 1);
      const hits = new Set(); let seen = 0, maxX = 0;
      for (let i = 0; i < 160; i++) {
        await p.waitForTimeout(120);
        const r = await p.evaluate(() => {
          const flowx = document.querySelector('.flowx');
          const sec = flowx.closest('section');
          const texts = [...flowx.querySelectorAll('.flowx-body h3, .flowx-body small, .flowx-body p, .flowx-num'), ...sec.querySelectorAll('.section-title h2, .section-title p, .section-title span')];
          const movers = [...flowx.querySelectorAll('.flowj-body svg, .flowj-bubble svg')].filter((e) => { let o = 1, n = e; while (n && n !== flowx) { o *= +getComputedStyle(n).opacity; n = n.parentElement; } return o > 0.2; });
          const out = []; let any = movers.length > 0;
          for (const m of movers) {
            const a = m.getBoundingClientRect(); const pad = 2;
            for (const t of texts) {
              const range = document.createRange(); range.selectNodeContents(t);
              for (const tr of range.getClientRects()) {
                if (!(a.right - pad > tr.left && a.left + pad < tr.right && a.bottom - pad > tr.top && a.top + pad < tr.bottom)) continue;
                // 重なった部分の中心で、いちばん上に見えているのがアニメーションのときだけ「文字に重なった」とする
                const cx = (Math.max(a.left, tr.left) + Math.min(a.right, tr.right)) / 2, cy = (Math.max(a.top, tr.top) + Math.min(a.bottom, tr.bottom)) / 2;
                const top = document.elementFromPoint(cx, cy);
                if (top && top.closest('.flowj')) out.push((t.textContent || '').trim().slice(0, 12));
              }
            }
          }
          return { out, any, sw: document.documentElement.scrollWidth };
        });
        if (r.any) seen++;
        r.out.forEach((x) => hits.add(x)); maxX = Math.max(maxX, r.sw);
      }
      const ok = hits.size === 0 && seen > 20 && maxX <= w && errs.length === 0;
      if (!ok) bad++;
      console.log(ok ? 'OK' : 'NG', w, u, `seen=${seen}`, hits.size ? 'overlap: ' + [...hits].join(' / ') : '', maxX > w ? 'overflow ' + maxX : '', errs.join(' / '));
    }
  }
  console.log(bad ? 'NG ' + bad : 'ALL OK'); await b.close();
})();
