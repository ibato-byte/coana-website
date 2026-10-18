// 仕組みのアニメーション：全LPで、進む・一度に1つ・止まる条件・繰り返し・動きを減らす・CLS・エラー
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SLUGS = ['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'];
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const ROOT = '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap';
const snap = (p) => p.evaluate((R) => {
  const root = document.querySelector(R);
  // 鳩（見えているもの）の数と、位置＋運んでいるもの
  const chips = [...root.querySelectorAll('.dove')].filter((c) => +getComputedStyle(c).opacity > 0.05);
  // 工程のキーで数える（中心型の図は、PC の図とスマホのリストに同じ工程が2つある）
  const keysOf = (sel) => new Set([...root.querySelectorAll(sel)].map((e) => e.getAttribute('data-story') || e.querySelector('[data-story]')?.getAttribute('data-story'))).size;
  return { done: keysOf('.is-done'), now: keysOf('.is-now'), chips: chips.length, labels: chips.map((c) => c.style.transform + (c.querySelector('.cargo-glyph')?.getAttribute('d') || '')).join('|') };
}, ROOT);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [dev, vp] of [['PC', { width: 1280, height: 900 }], ['スマホ', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const { isMobile, hasTouch, ...viewport } = vp;
    for (const slug of SLUGS) {
      const ctx = await b.newContext({ viewport, isMobile, hasTouch });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await p.goto(`http://localhost:4173/services/${slug}`, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await p.mouse.move(1, 1);
      // 初期表示：画面に入る前から、起点で鳩が待っていて起点だけ点灯。画面外では動かない
      const before = await snap(p); await p.waitForTimeout(2500); const before2 = await snap(p);
      ok(`${dev} ${slug} 初期表示は起点で待機（起点だけ点灯・経路と起点の印あり）・画面外では動かない`, before.chips === 1 && before.done === 1 && before.now === 1 && before.labels === before2.labels && before2.done === 1 && (await p.evaluate((R) => document.querySelector(R).querySelectorAll('.route-base path').length > 0 && !!document.querySelector(R).querySelector('.dove-start'), ROOT)), JSON.stringify(before));
      if (dev === 'スマホ') {
        // 起点が画面の上に外れていて、図の下のほうだけ見えている → 出発しない。起点が入ったら出発する
        await p.evaluate((R) => { const e = document.querySelector(R); const r = e.getBoundingClientRect(); scrollTo(0, r.bottom + scrollY - innerHeight + 40); }, ROOT);
        const startOut = await p.evaluate((R) => { const t = document.querySelector(R).querySelector('[data-story].is-now, .is-now [data-story], .is-now'); return t ? t.getBoundingClientRect().bottom < 0 : false; }, ROOT);
        await p.waitForTimeout(5000); const w = await snap(p);
        ok(`${dev} ${slug} 起点が画面外のままでは出発しない`, !startOut || (w.done === 1 && w.labels === before.labels), `startOut=${startOut} done=${w.done}`);
      }
      await p.evaluate((R) => { const e = document.querySelector(R); scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }, ROOT);
      // 進む：3秒・6秒で完了した工程が増える。チップは常に1つ（経理代行の最後の分かれ道だけ2つ）
      let maxChips = 0; const dones = [];
      for (let t = 0; t < 30; t++) { await p.waitForTimeout(250); const s = await snap(p); maxChips = Math.max(maxChips, s.chips); if (t % 6 === 5) dones.push(s.done); }
      ok(`${dev} ${slug} 工程が順に進む`, dones[0] >= 1 && dones[dones.length - 1] > dones[0], JSON.stringify(dones));
      ok(`${dev} ${slug} 一度に動くのは1つ`, maxChips <= 1, String(maxChips));
      // カーソルを当てると止まる（PC）
      if (dev === 'PC') {
        const box = await p.locator(ROOT).first().boundingBox();
        // カードの上でカーソルを動かし続けている間（読んでいる間）は止まる
        const cb = await p.locator(`:is(${ROOT}) [data-story]`).nth(1).boundingBox();
        for (let k = 0; k < 12; k++) { await p.mouse.move(cb.x + cb.width / 2 + (k % 2 ? 5 : -5), cb.y + cb.height / 2, { steps: 3 }); await p.waitForTimeout(300); }
        const h1 = await snap(p);
        for (let k = 0; k < 10; k++) { await p.mouse.move(cb.x + cb.width / 2 + (k % 2 ? 5 : -5), cb.y + cb.height / 2, { steps: 3 }); await p.waitForTimeout(300); }
        const h2 = await snap(p);
        ok(`${dev} ${slug} カードを読んでいる間は止まる`, h1.done === h2.done && (h1.labels === h2.labels || h2.chips === 0), `${h1.done}→${h2.done}`);
        void box;
        await p.mouse.move(1, 1);
      }
      // 画面外で止まる
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(3000);
      const o1 = await snap(p); await p.waitForTimeout(3500); const o2 = await snap(p);
      ok(`${dev} ${slug} 画面外では止まる`, o1.done === o2.done && (o1.labels === o2.labels || o2.chips === 0), `${o1.done}→${o2.done}`);
      // タブが非表示のときも止まる
      await p.evaluate((R) => { const e = document.querySelector(R); scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }, ROOT);
      await p.waitForTimeout(800);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await p.waitForTimeout(3000); const v1 = await snap(p); await p.waitForTimeout(3000); const v2 = await snap(p);
      ok(`${dev} ${slug} タブが非表示の間は止まる`, v1.done === v2.done && (v1.labels === v2.labels || v2.chips === 0), `${v1.done}→${v2.done}`);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      // 一周したら、ひと息おいて繰り返す（最大35秒見る）
      let reset = false, again = false;
      for (let t = 0; t < 70 && !again; t++) { await p.waitForTimeout(500); const s = await snap(p); if (s.done === 0) reset = true; else if (reset && s.done > 0) again = true; }
      ok(`${dev} ${slug} 一周したら繰り返す`, reset && again);
      // スマホ：説明を開いている間は止まる（経理代行）
      if (dev === 'スマホ' && slug === 'bookkeeping') {
        await p.tap('.lanes-item:nth-child(3) button.lanes-card'); await p.waitForTimeout(3000);
        const d1 = await snap(p); await p.waitForTimeout(3000); const d2 = await snap(p);
        ok('スマホ bookkeeping 説明を開いている間は止まる', d1.done === d2.done && (d1.labels === d2.labels || d2.chips === 0), `${d1.done}→${d2.done}`);
      }
      ok(`${dev} ${slug} レイアウトのずれなし（CLS）`, (await p.evaluate(() => window.__cls)) < 0.02, (await p.evaluate(() => window.__cls)).toFixed(4));
      ok(`${dev} ${slug} エラーなし`, errs.length === 0, errs.join(' / '));
      await ctx.close();
    }
  }
  // 動きを減らす設定
  for (const slug of SLUGS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(`http://localhost:4173/services/${slug}`, { waitUntil: 'networkidle' });
    await p.evaluate((R) => document.querySelector(R).scrollIntoView(), ROOT); await p.waitForTimeout(2500);
    const s = await snap(p); const total = await p.evaluate((R) => document.querySelector(R).querySelectorAll('[data-story]').length, ROOT);
    ok(`動きを減らす ${slug}：最初から全工程が完了・鳩なし`, s.chips === 0 && s.done > 0 && s.now === 0, `${s.done}/${total}`);
    await ctx.close();
  }
  await b.close();
  console.log(out.filter((l) => l.startsWith('NG')).join('\n') || ''); console.log(`${out.filter((l) => l.startsWith('OK')).length} OK / ${out.filter((l) => l.startsWith('NG')).length} NG`);
})();
