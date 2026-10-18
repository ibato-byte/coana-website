const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const res = [];
  for (let r = 0; r < 3; r++) for (const u of ['/services/bookkeeping', '/services/backoffice-dx', '/services/startup-support']) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await p.addInitScript(() => { window.__cls = 0; window.__all = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__all += e.value; if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' });
    // 1. ゆっくりスクロールで FLOW まで（指で読み進める操作の代わりにマウスホイール）
    const target = await p.evaluate(() => document.querySelector('.flowx').getBoundingClientRect().top + scrollY - 200);
    let y = 0; while (y < target) { await p.mouse.wheel(0, 120); y += 120; await p.waitForTimeout(60); }
    // 2. 見ている間（40秒、操作なし）
    await p.waitForTimeout(40000);
    // 3. さらに読み進めて、戻る
    for (let k = 0; k < 20; k++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(80); }
    for (let k = 0; k < 20; k++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(80); }
    await p.waitForTimeout(8000);
    res.push(`${u} cls=${(await p.evaluate(() => window.__cls)).toFixed(4)} (操作直後を含む合計 ${(await p.evaluate(() => window.__all)).toFixed(4)})`);
    await p.context().close();
  }
  console.log(res.join('\n')); await b.close();
})();
