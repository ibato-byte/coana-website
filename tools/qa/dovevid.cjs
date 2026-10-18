// 鳩のアニメーションを実時間で録画（PR の GIF 用）：node dovevid.cjs <path> <pc|sp> <outdir> <name> <seconds> <selector>
// 出力：<name>-<dev>.webm と、切り出し用の <name>-<dev>.json（スクロールした時刻と、図の位置）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:4173';
const [,, path, dev, out, name, secs, sel] = process.argv;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pc = dev === 'pc';
  const vp = pc ? { width: 1280, height: 760 } : { width: 390, height: 1100 };
  const t0 = Date.now();
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: !pc, hasTouch: !pc, recordVideo: { dir: out + '/raw', size: vp } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html { scroll-behavior: auto !important; } .site-header, .chat-launcher, .back-to-top, .lp-sticky, .scroll-progress { visibility: hidden !important; }' });
  // 切り出しの目印：スクロールの直前に0.4秒だけ画面を黒くする（GIF は黒が消えた次のコマから）
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'cut-mark'; d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'; document.body.append(d); });
  await p.waitForTimeout(400);
  await p.evaluate((s) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); document.getElementById('cut-mark').remove(); }, sel);
  const scrolled = (Date.now() - t0) / 1000;
  await p.mouse.move(2, 2);
  const bb = await p.locator(sel).first().boundingBox();
  await p.waitForTimeout(+secs * 1000);
  const video = p.video();
  await ctx.close();
  fs.renameSync(await video.path(), `${out}/${name}-${dev}.webm`);
  fs.writeFileSync(`${out}/${name}-${dev}.json`, JSON.stringify({ scrolled, x: bb.x, y: bb.y, w: bb.width, h: bb.height, vw: vp.width, vh: vp.height }));
  await b.close();
})();
