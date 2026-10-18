const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
 for (const url of ['/', '/about', '/services', '/services/bookkeeping', '/services/backoffice-dx', '/topics', '/contact']) {
  const c = await b.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' }); const q = await c.newPage();
  await q.goto('http://localhost:4173' + url, { waitUntil: 'networkidle' }); await q.waitForTimeout(300);
  const r = await q.evaluate(() => [...document.querySelectorAll('main *')].filter(e => { const s = getComputedStyle(e); return e.getBoundingClientRect().height > 0 && parseFloat(s.opacity) < 0.99 && !e.closest('.solve-word:not(.is-active)'); })
    .map(e => (e.className.baseVal ?? e.className) + '<' + (e.parentElement.className.baseVal ?? e.parentElement.className) + '> op=' + getComputedStyle(e).opacity));
  console.log(url, [...new Set(r)].join(' | ')); await c.close(); }
 await b.close(); })();
