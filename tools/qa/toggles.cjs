// サイト内の開閉UI：開く→閉じる→もう一度開く（クリック・タップ・Enter・Space）、aria-expanded
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const visible = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return e.checkVisibility({ contentVisibilityAuto: true }) && cs.visibility !== 'hidden' && +cs.opacity > 0.5 && r.height > 8; }, sel);
const seq = async (name, p, act, state) => {
  const r = [];
  for (let k = 0; k < 3; k++) { await act(); await p.waitForTimeout(650); r.push(await state()); }
  ok(name, JSON.stringify(r.map((x) => x.open)) === '[true,false,true]' && r.every((x) => x.aria === undefined || x.aria === String(x.open)), JSON.stringify(r));
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const devices = [
    { tag: 'PC', viewport: { width: 1280, height: 860 } },
    { tag: 'スマホ', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { tag: 'タブレット横', viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true },
  ];
  for (const d of devices) {
    const ctx = await b.newContext(d); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!d.hasTouch;
    const press = async (sel) => (touch ? p.tap(sel) : p.click(sel));
    // FAQ（トップ・LP）
    for (const u of ['/', '/services/bookkeeping']) {
      await p.goto(BASE + u, { waitUntil: 'networkidle' });
      for (const i of [0, 2]) {
        const q = `#faq-a-${i}`; const btn = `button[aria-controls="faq-a-${i}"]`;
        await p.locator(btn).scrollIntoViewIfNeeded();
        const state = async () => ({ open: await visible(p, q), aria: await p.getAttribute(btn, 'aria-expanded') });
        if ((await state()).open) await press(btn), await p.waitForTimeout(650); // 最初から開いている質問は、まず閉じる
        await seq(`${d.tag} FAQ ${u} #${i} ${touch ? 'タップ' : 'クリック'}`, p, () => press(btn), state);
        await press(btn); await p.waitForTimeout(650);
        await p.focus(btn);
        await seq(`${d.tag} FAQ ${u} #${i} Enter`, p, () => p.keyboard.press('Enter'), state);
        await p.keyboard.press('Enter'); await p.waitForTimeout(650);
        await seq(`${d.tag} FAQ ${u} #${i} Space`, p, () => p.keyboard.press('Space'), state);
      }
    }
    // 業務の一覧（details）
    await p.goto(BASE + '/services/backoffice-dx', { waitUntil: 'networkidle' });
    const sum = '.lp-scope summary';
    await p.locator(sum).scrollIntoViewIfNeeded();
    const sstate = async () => ({ open: await visible(p, '.lp-scope-grid'), label: await p.textContent('.lp-scope-open') });
    await seq(`${d.tag} 業務の一覧 ${touch ? 'タップ' : 'クリック'}`, p, () => press(sum), sstate);
    await press(sum); await p.waitForTimeout(400);
    await p.focus(sum);
    await seq(`${d.tag} 業務の一覧 Enter`, p, () => p.keyboard.press('Enter'), sstate);
    await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    await seq(`${d.tag} 業務の一覧 Space`, p, () => p.keyboard.press('Space'), sstate);
    const labels = await p.evaluate(() => document.querySelector('.lp-scope-open').textContent); ok(`${d.tag} 業務の一覧：開いているときは「閉じる」`, /閉じる/.test(labels), labels);
    await p.keyboard.press('Space'); await p.waitForTimeout(400);
    const closedLabel = await p.textContent('.lp-scope-open'); ok(`${d.tag} 業務の一覧：閉じているときは件数つき`, /業務の一覧を見る（\d+件）/.test(closedLabel), closedLabel);
    // HOW IT WORKS の工程の説明（経理代行）
    await p.goto(BASE + '/services/bookkeeping', { waitUntil: 'networkidle' });
    await p.locator('.lanes').scrollIntoViewIfNeeded(); await p.waitForTimeout(4500);
    const item = '.lanes-item:nth-child(2)'; const det = item + ' .lanes-detail';
    if (!touch) {
      await p.hover(item + ' .lanes-card'); await p.waitForTimeout(400);
      const a = await visible(p, det);
      await p.mouse.move(5, 5); await p.waitForTimeout(400);
      const b2 = await visible(p, det);
      await p.click(item + ' .lanes-card'); await p.mouse.move(5, 5); await p.waitForTimeout(400);
      const c = await visible(p, det);
      await p.hover(item + ' .lanes-card'); await p.waitForTimeout(400);
      const d2 = await visible(p, det);
      ok('PC 工程の説明：カーソルで出る→外すと消える→クリック後も外せば消える→もう一度出る', a && !b2 && !c && d2, JSON.stringify([a, b2, c, d2]));
      await p.mouse.move(5, 5); await p.focus(item + ' .lanes-card'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(400);
      const f = await visible(p, det); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      const g = await visible(p, det);
      ok('PC 工程の説明：キーボードのフォーカスで出る・Esc で消える', f && !g, JSON.stringify([f, g]));
      ok('PC 工程の説明：＋の印・開閉ボタンなし', await p.evaluate(() => !document.querySelector('.lanes-more') && !document.querySelector('.lanes-card[aria-expanded]')));
    } else {
      const btn = item + ' button.lanes-card';
      const lstate = async () => ({ open: await visible(p, det), aria: await p.getAttribute(btn, 'aria-expanded'), label: await p.textContent(item + ' .lanes-more') });
      await seq(`${d.tag} 工程の説明 タップ`, p, () => p.tap(btn), lstate);
      await p.tap(btn); await p.waitForTimeout(300);
      await p.focus(btn);
      await seq(`${d.tag} 工程の説明 Enter`, p, () => p.keyboard.press('Enter'), lstate);
      await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      await seq(`${d.tag} 工程の説明 Space`, p, () => p.keyboard.press('Space'), lstate);
      const lbl = await p.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent), '.lanes-more');
      ok(`${d.tag} 工程の説明：文字で「詳しく見る／閉じる」`, lbl.length > 0 && lbl.every((t) => /詳しく見る|閉じる/.test(t)), JSON.stringify(lbl.slice(0, 3)));
    }
    // メニュー（スマホ）
    if (d.tag === 'スマホ') {
      await p.goto(BASE + '/', { waitUntil: 'networkidle' });
      const mstate = async () => ({ open: !!(await p.$('.mobile-nav')), aria: await p.getAttribute('.menu-button', 'aria-expanded') });
      await seq('スマホ メニュー タップ', p, () => p.tap('.menu-button'), mstate);
      await p.tap('.menu-button'); await p.waitForTimeout(300); await p.focus('.menu-button');
      await seq('スマホ メニュー Enter', p, () => p.keyboard.press('Enter'), mstate);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok('スマホ メニュー Esc で閉じる', !(await p.$('.mobile-nav')));
    }
    ok(`${d.tag} エラーなし`, errs.length === 0, errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('NG')) ? 'NG' : 'ALL OK');
})();
