// 仕組みのアニメーションを撮る：node storygif.cjs <slug> <pc|sp> <outdir> [seconds] [fps]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [,, slug, dev, out, secs = '14', fps = '6'] = process.argv;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pc = dev === 'pc';
  const ctx = await b.newContext({ viewport: pc ? { width: 1280, height: 1000 } : { width: 390, height: 1700 }, deviceScaleFactor: 1, isMobile: !pc, hasTouch: !pc });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:4173/services/${slug}`, { waitUntil: 'networkidle' });
  const sel = '.lp-scheme .container';
  await p.addStyleTag({ content: 'html { scroll-behavior: auto !important; } .site-header, .chat-launcher, .back-to-top, .lp-sticky { visibility: hidden !important; }' });
  await p.evaluate(() => { const e = document.querySelector('.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); });
  await p.waitForTimeout(300);
  await p.mouse.move(2, 2);
  const el = p.locator('.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap').first();
  const n = Math.round(+secs * +fps);
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const bb = await el.boundingBox();
    await p.screenshot({ path: `${out}/${slug}-${dev}-${String(i).padStart(3, '0')}.png`, clip: { x: Math.max(0, bb.x - 12), y: Math.max(0, bb.y - 24), width: Math.min(bb.width + 24, pc ? 1280 : 390), height: bb.height + 48 } });
    const dt = 1000 / +fps - (Date.now() - t0); if (dt > 0) await p.waitForTimeout(dt);
  }
  if (errs.length) console.log('ERR', errs.join(' / '));
  await b.close();
})();
