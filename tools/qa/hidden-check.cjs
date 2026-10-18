// usage: node hidden-check.cjs http://localhost:4174 — 全ページで「隠すべき要素」が画面に見えていないかを点検
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2];
const PAGES = ['/', '/about', '/services', '/topics', '/contact', '/privacy', ...['backoffice-dx','bookkeeping','cloud-accounting','sales-support','seminar-event','sns-management','startup-support','startup-support-en','web-production'].map((s) => '/services/' + s)];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let bad = 0;
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    for (const u of PAGES) {
      await p.goto(base + u, { waitUntil: 'networkidle' });
      const r = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('[class*="hidden"],[class*="honeypot"],[class*="sr-only"],[class*="skip"],[aria-hidden="true"] input,[aria-hidden="true"] label').forEach((el) => {
          const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
          const tiny = rc.width <= 1 && rc.height <= 1; const off = rc.right < 0 || rc.left > innerWidth + 1;
          const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && !tiny && !off && el.closest('.form-honeypot, .visually-hidden') === null || (el.matches('.form-honeypot, .visually-hidden') && !tiny && !off);
          if (visible && (el.matches('.form-honeypot, .visually-hidden, [class*="sr-only"], [class*="honeypot"]') || el.closest('.form-honeypot'))) out.push(`${el.className} pos=${cs.position} ${Math.round(rc.left)},${Math.round(rc.top)} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
        });
        const hp = document.querySelector('.form-honeypot');
        const hpInfo = hp ? (() => { const cs = getComputedStyle(hp); const rc = hp.getBoundingClientRect(); return `honeypot pos=${cs.position} left=${Math.round(rc.left)} ${rc.width}x${rc.height} input-tabindex=${hp.querySelector('input').tabIndex} aria-hidden=${hp.getAttribute('aria-hidden')}`; })() : '';
        return { out, hpInfo, n: document.querySelectorAll('.visually-hidden').length, ovf: document.documentElement.scrollWidth > innerWidth };
      });
      if (r.out.length || r.ovf) bad++;
      console.log(w, u, `visually-hidden x${r.n}`, r.ovf ? 'H-OVERFLOW' : '', r.out.length ? 'VISIBLE: ' + r.out.join(' | ') : 'ok', r.hpInfo);
      if (u === '/contact') await p.screenshot({ path: `hf-contact-${w}.png`, fullPage: true });
    }
    await p.close();
  }
  console.log(bad ? `NG ${bad}` : 'ALL OK');
  await b.close();
})();
