const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const pages = ['/', '/about', '/services', '/contact', '/topics', '/privacy', '/services/bookkeeping', '/services/backoffice-dx', '/services/startup-support-en', '/topics/20260804-outsourcing-checklist'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let ng = 0;
  for (const w of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    for (const u of pages) {
      await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' }); await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }); await p.waitForTimeout(300);
      const seen = []; const bad = [];
      for (let i = 0; i < 200; i++) {
        await p.keyboard.press('Tab'); await p.waitForFunction(() => new Promise((res) => { let y = scrollY, n = 0; const t = () => { if (scrollY === y && ++n > 3) return res(true); if (scrollY !== y) n = 0; y = scrollY; requestAnimationFrame(t); }; t(); }));
        const f = await p.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return { body: true };
          const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || /rgb/.test(cs.boxShadow) && cs.boxShadow !== 'none';
          const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
          const hidden = !!e.closest('[aria-hidden="true"], .form-honeypot, [inert]') || cs.visibility === 'hidden' || +cs.opacity === 0;
          const name = e.tagName + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 20);
          return { name, ring, inView, hidden, size: r.width > 1 && r.height > 1, key: e.outerHTML.slice(0, 120) };
        });
        if (f.body) { if (seen.length) break; else continue; }
                seen.push(f.key);
        if (!f.ring || !f.inView || f.hidden || !f.size) bad.push(f.name + ` ring=${f.ring} view=${f.inView} hidden=${f.hidden} size=${f.size}`);
      }
      if (bad.length) ng++;
      // スマホでは、LP は固定バーのチャット、お問い合わせページはフォームが主役なのでチャットのボタンを出さない（設計どおり）
      const launcher = seen.some((k) => k.includes('chat-launcher')) || (u.startsWith('/services/') || u === '/contact') && w < 500;
      if (!launcher) { ng++; bad.push('chat-launcher unreachable'); }
      console.log(w, u, 'stops=' + seen.length, bad.length ? 'NG ' + bad.slice(0, 4).join(' | ') : 'ok');
    }
    await ctx.close();
  }
  console.log(ng ? 'NG' : 'ALL OK'); await b.close();
})();
