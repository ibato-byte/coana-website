const { chromium } = require('playwright');
const [,, path, sel, w, out, wait] = process.argv;
(async () => {
  const b = await chromium.launch(); const mob = +w < 1000;
  const p = await (await b.newContext({ viewport: { width: +w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob })).newPage();
  await p.goto('http://localhost:4173' + path, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} .site-header,.chat-launcher,.lp-sticky{visibility:hidden!important}' });
  await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - 60); }, sel);
  console.log(path, w, 'h=', Math.round((await p.locator(sel).first().boundingBox()).height));
  const waits = (wait || '0').split(',');
  for (const [i, t] of waits.entries()) { await p.waitForTimeout(+t); await p.locator(sel).first().screenshot({ path: out.replace('.png', `-${i}.png`) }); }
  await b.close();
})();
