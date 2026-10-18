// 「終点 → 再スタート」の録画（PR の GIF 用）：node finalevid.cjs <path> <pc|sp> <outdir> <name> <selector>
// 一周目の終点（全工程がそろう）の少し前から、次の周で起点を出発するまでを切り出せるよう、時刻を <name>-<dev>.json に書く。
// 時刻は「黒い目印が消えた瞬間」からの秒（動画では blackframe で目印を見つけて合わせる）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:4173';
const [,, path, dev, out, name, sel] = process.argv;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pc = dev === 'pc';
  const vp = pc ? { width: 1280, height: 800 } : { width: 390, height: 1100 };
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: !pc, hasTouch: !pc, recordVideo: { dir: out + '/raw', size: vp } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html { scroll-behavior: auto !important; } .site-header, .chat-launcher, .back-to-top, .lp-sticky, .scroll-progress { visibility: hidden !important; }' });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'cut-mark'; d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'; document.body.append(d); });
  await p.waitForTimeout(400);
  await p.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); scrollTo(0, r.top + scrollY - Math.max(20, (innerHeight - r.height) / 2)); document.getElementById('cut-mark').remove(); }, sel);
  const t0 = Date.now();
  await p.mouse.move(2, 2);
  const bb = await p.locator(sel).first().boundingBox();
  const snap = () => p.evaluate((s) => { const r = document.querySelector(s); const keys = (q) => new Set([...r.querySelectorAll(q)].map((e) => e.getAttribute('data-story') || e.querySelector('[data-story]')?.getAttribute('data-story') || e.className)).size; return { done: keys('.is-done'), now: keys('.is-now') }; }, sel);
  let finale = null, reset = null, depart = null, lastDone = 0;
  while ((Date.now() - t0) < 90000 && depart === null) {
    const s = await snap(); const t = (Date.now() - t0) / 1000;
    if (finale === null && s.now === 0 && s.done > 1) finale = t;
    if (finale !== null && reset === null && s.done === 0) reset = t;
    if (reset !== null && s.done >= 2 && lastDone < 2) depart = t;
    lastDone = s.done;
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(1800);
  const video = p.video();
  await ctx.close();
  fs.renameSync(await video.path(), `${out}/${name}-${dev}.webm`);
  fs.writeFileSync(`${out}/${name}-${dev}.json`, JSON.stringify({ finale, reset, depart, x: bb.x, y: bb.y, w: bb.width, h: bb.height, vw: vp.width, vh: vp.height }));
  await b.close();
})();
