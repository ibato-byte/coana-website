// 実時間で録画：node vid.cjs <path> <pc|sp> <outdir> <name> <seconds>
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const [,, path, dev, out, name, secs] = process.argv;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pc = dev === 'pc';
  const vp = pc ? { width: 1280, height: 640 } : { width: 390, height: 1000 };
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: !pc, hasTouch: !pc, recordVideo: { dir: out + '/raw', size: vp } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173' + path, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html { scroll-behavior: auto !important; } .site-header, .chat-launcher, .back-to-top, .lp-sticky { visibility: hidden !important; }' });
  const t0 = Date.now();
  await p.evaluate((pc) => { const e = document.querySelector('.flowx'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - (pc ? 150 : 110)); }, pc);
  await p.mouse.move(2, 2);
  const bb = await p.locator('.flowx-list').boundingBox();
  const startOffset = (Date.now() - t0) / 1000;
  await p.waitForTimeout(+secs * 1000);
  const video = p.video();
  await ctx.close();
  const file = await video.path();
  fs.renameSync(file, `${out}/${name}-${dev}.webm`);
  // 録画の開始からスクロールまでの時間（切り出し用）と、流れの位置（2倍）
  fs.writeFileSync(`${out}/${name}-${dev}.json`, JSON.stringify({ x: bb.x, y: bb.y, w: bb.width, h: bb.height, vw: vp.width }));
  await b.close();
})();
