// FLOW：マウスを動かさずホイールだけで来て進むか／ステップの上でカーソルを動かすと止まり、約2.5秒で再開するか
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const PAGES = ['/services', ...['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'].map((s) => '/services/' + s)];
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const u of PAGES) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await p.goto(BASE + u, { waitUntil: 'networkidle' });
    const target = await p.evaluate(() => { const e = document.querySelector('.flowx-list'); return e.getBoundingClientRect().top + scrollY - 500 + 30; });
    await p.mouse.move(640, 500); // 以後マウスは動かさない
    let y = 0; while (y < target) { await p.mouse.wheel(0, 100); y += 100; await p.waitForTimeout(40); }
    const under = await p.evaluate(() => !!document.elementFromPoint(640, 500)?.closest('.flowx'));
    const st = () => p.evaluate(() => [document.querySelectorAll('.flowx-step.is-done').length, document.querySelector('.flowx .dove')?.style.transform || ''].join('/'));
    await p.waitForTimeout(6000);
    const d = await p.evaluate(() => document.querySelectorAll('.flowx-step.is-done').length + (document.querySelector('.flowx-step.is-now') ? 1 : 0));
    ok(`${u} ホイールだけ（カーソルは流れの上：${under}）→ 6秒で進む`, d >= 2, String(d));
    // ステップの上でカーソルを動かし続けている間は止まる
    const bb = await p.locator('.flowx-step').nth(2).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + 40, { steps: 5 });
    let frozen = true; let last = '';
    for (let k = 0; k < 13; k++) { await p.mouse.move(bb.x + bb.width / 2 + (k % 2 ? 5 : -5), bb.y + 40, { steps: 3 }); await p.waitForTimeout(300); } // 進行中の出来事（最長 約3秒）が終わるまで、カーソルを動かし続ける
    for (let k = 0; k < 8; k++) { await p.mouse.move(bb.x + bb.width / 2 + (k % 2 ? 6 : -6), bb.y + 40, { steps: 3 }); await p.waitForTimeout(300); const s = await st(); if (k > 0 && s !== last) frozen = false; last = s; }
    ok(`${u} ステップの上でカーソルを動かしている間は止まる`, frozen);
    await p.waitForTimeout(5000); const after = await st();
    ok(`${u} カーソルを止めて約2.5秒で再開`, after !== last, '');
    await p.context().close();
  }
  await b.close();
  console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('NG')) ? 'NG' : 'ALL OK');
})();
