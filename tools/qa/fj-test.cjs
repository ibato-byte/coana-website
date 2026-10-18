const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PAGES = ['/services', ...['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'].map((s) => '/services/' + s)];
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const st = (p) => p.evaluate(() => ({ done: document.querySelectorAll('.flowx-step.is-journey-done').length, now: [...document.querySelectorAll('.flowx-step')].findIndex((s) => s.classList.contains('is-journey-now')), tr: document.querySelector('.flowj-traveler')?.style.transform || '' }));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [dev, vp, mob] of [['PC', { width: 1280, height: 900 }, false], ['スマホ', { width: 390, height: 844 }, true]]) {
    for (const u of PAGES) {
      const p = await (await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob })).newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await p.mouse.move(1, 1);
      const h0 = await p.evaluate(() => document.documentElement.scrollHeight);
      const s0 = await st(p);
      ok(`${dev} ${u} 画面外では始まらない`, s0.done === 0 && s0.now === -1);
      await p.evaluate(() => { const e = document.querySelector('.flowx'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 160); });
      await p.waitForTimeout(7000);
      const s1 = await st(p);
      ok(`${dev} ${u} 画面に入ると進む`, s1.done >= 1, JSON.stringify(s1));
      if (dev === 'PC') {
        await p.hover('.flowx-step:nth-child(2) .flowx-node'); await p.waitForTimeout(3500);
        const a = await st(p); await p.waitForTimeout(3000); const c = await st(p);
        const lifted = await p.evaluate(() => getComputedStyle(document.querySelector('.flowx-step:nth-child(2) .flowx-node')).backgroundColor);
        ok(`${dev} ${u} ステップにカーソルで止まる・ホバーの表現はそのまま`, a.done === c.done && a.tr === c.tr && /255, 216, 90|252, 201, 52/.test(lifted), `${a.done}→${c.done} ${lifted}`);
        await p.mouse.move(1, 1);
      }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(3500);
      const o1 = await st(p); await p.waitForTimeout(3000); const o2 = await st(p);
      ok(`${dev} ${u} 画面外で止まる`, o1.done === o2.done && o1.tr === o2.tr);
      await p.evaluate(() => { const e = document.querySelector('.flowx'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 160); });
      await p.waitForTimeout(500);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await p.waitForTimeout(3500); const v1 = await st(p); await p.waitForTimeout(3000); const v2 = await st(p);
      ok(`${dev} ${u} タブ非表示で止まる`, v1.done === v2.done && v1.tr === v2.tr);
      const h1 = await p.evaluate(() => document.documentElement.scrollHeight);
      ok(`${dev} ${u} 横はみ出しなし`, (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), `cls=${(await p.evaluate(() => window.__cls)).toFixed(4)}`);
      ok(`${dev} ${u} エラーなし`, errs.length === 0, errs.join(' / '));
      await p.context().close();
    }
  }
  for (const u of ['/services', '/services/bookkeeping']) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
    await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('.flowx').scrollIntoView()); await p.waitForTimeout(3000);
    ok(`動きを減らす ${u}：アニメーションなし`, await p.evaluate(() => !document.querySelector('.flowj') && !document.querySelector('.is-journey-now')));
    await p.context().close();
  }
  await b.close();
  console.log(out.filter((l) => l.startsWith('NG')).join('\n')); console.log(`${out.filter((l) => l.startsWith('OK')).length} OK / ${out.filter((l) => l.startsWith('NG')).length} NG`);
})();
