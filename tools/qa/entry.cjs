// トップのヒーロー：入り方を変えても、鳩→下線→回転ワードの順で同じ演出になるか
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const startTrace = () => {
  const T = window.__T = { t0: performance.now(), doveSeen: null, ulMin: 2, ulMid: false, ulEnd: null, done: null, word: null, words0: null };
  const word = () => document.querySelector('.solve-box .solve-word:last-child')?.textContent;
  const loop = () => {
    if (window.__T !== T) return;
    const now = performance.now() - T.t0;
    const line = document.querySelector('.hero .title-underline');
    // ヒーローが作り直されたら（ページ移動・戻る）、そこから測り直す
    if (line && T.line !== line) { if (T.line) { Object.assign(T, { doveSeen: null, ulMin: 2, ulMid: false, ulEnd: null, done: null, word: null, words0: null }); } T.line = line; }
    const dove = document.querySelector('.hero .hero-dove');
    if (line) {
      const ul = parseFloat(line.style.getPropertyValue('--ul') || getComputedStyle(line).getPropertyValue('--ul'));
      if (!isNaN(ul)) { T.ulMin = Math.min(T.ulMin, ul); if (ul > 0.2 && ul < 0.8) T.ulMid = true; if (ul >= 1 && T.ulEnd === null) T.ulEnd = now; }
    }
    if (dove && T.doveSeen === null && +getComputedStyle(dove).opacity > 0.5) T.doveSeen = now;
    const w = word(); if (T.words0 === null && w) T.words0 = w; else if (w && w !== T.words0 && T.word === null) T.word = now;
    requestAnimationFrame(loop);
  };
  addEventListener('coana:dove-done', () => { if (window.__T === T && T.done === null) T.done = performance.now() - T.t0; });
  loop();
};
const check = async (p, name, reduce = false) => {
  await p.waitForTimeout(6500);
  const T = await p.evaluate(() => { const { line, ...rest } = window.__T || {}; return window.__T ? rest : null; });
  if (!T) return ok(name, false, 'no trace');
  const r = (v) => (v === null ? '-' : Math.round(v));
  const info = `dove=${r(T.doveSeen)} 線途中=${T.ulMid} 線完了=${r(T.ulEnd)} 合図=${r(T.done)} ワード=${r(T.word)}`;
  if (reduce) return ok(name, T.doveSeen === null && T.ulMin >= 1, info);
  ok(name, T.doveSeen !== null && T.ulMin < 0.05 && T.ulMid && T.ulEnd !== null && T.done !== null && T.word !== null && T.word > T.done, info);
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [w, h, tag] of [[1280, 860, 'PC'], [390, 844, 'スマホ']]) {
    const mobile = w < 500;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(startTrace);
    const trace = () => p.evaluate(startTrace);
    const homeLink = async () => { if (mobile) { await p.click('.menu-button'); await p.waitForTimeout(300); await p.click('nav a:has-text("ホーム") >> visible=true'); } else await p.click('header nav a:has-text("ホーム")'); };
    // 1. 再読み込み
    await p.goto(BASE + '/', { waitUntil: 'load' }); await check(p, `${tag} 再読み込み`);
    // 同じページ内のスクロールでは繰り返さない
    await p.evaluate(() => { window.__T.doveSeen = null; window.__T.ulMin = 2; window.__T.ulMid = false; });
    await p.evaluate(() => scrollTo(0, 2500)); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(2000);
    const again = await p.evaluate(() => ({ dove: window.__T.doveSeen, ulMin: window.__T.ulMin }));
    ok(`${tag} スクロールで上に戻っても繰り返さない`, again.dove === null && again.ulMin >= 1, JSON.stringify(again));
    // 2. トップでロゴ（下までスクロールしてから）
    await p.evaluate(() => scrollTo(0, 3000)); await p.waitForTimeout(300);
    await trace(); await p.click('header .wordmark'); await check(p, `${tag} トップでロゴ`);
    // 3. 会社概要 → ロゴ
    await p.goto(BASE + '/about', { waitUntil: 'load' }); await p.waitForTimeout(500);
    await trace(); await p.click('header .wordmark'); await check(p, `${tag} 会社概要→ロゴ`);
    // 4. サービスLP → メニューの「ホーム」
    await p.goto(BASE + '/services/bookkeeping', { waitUntil: 'load' }); await p.waitForTimeout(500);
    await trace(); await homeLink(); await check(p, `${tag} LP→メニューのホーム`);
    // 5. トップ → サービス一覧（サイト内リンク）→ 戻る
    await p.click('header .wordmark'); await p.waitForTimeout(300);
    if (mobile) await p.evaluate(() => document.querySelector('a[href="/services"]').click()); else await p.click('header nav a[href="/services"]');
    await p.waitForTimeout(800);
    await trace(); await p.goBack(); await check(p, `${tag} 戻る`);
    // 6. 進む（サービス一覧）→ 戻る → 進む…：トップへ「進む」
    await p.goForward(); await p.waitForTimeout(800); await p.goBack(); await p.waitForTimeout(500);
    await p.goto(BASE + '/topics', { waitUntil: 'load' }); await p.waitForTimeout(300);
    await p.evaluate(() => { history.pushState({}, '', '/'); history.pushState({}, '', '/about'); dispatchEvent(new PopStateEvent('popstate')); });
    await p.waitForTimeout(500); await p.goBack(); await p.waitForTimeout(500); // → /
    await p.evaluate(() => history.back()); await p.waitForTimeout(500); // → /topics
    await trace(); await p.goForward(); await check(p, `${tag} 進む`);
    // 7. 他ページの本文リンクからトップへ（404 ページの「トップへ」）
    await p.goto(BASE + '/no-such-page', { waitUntil: 'load' }); await p.waitForTimeout(500);
    await trace(); await p.evaluate(() => [...document.querySelectorAll('main a')].find((a) => a.getAttribute('href') === '/').click()); await check(p, `${tag} 404→トップへのリンク`);
    // 8. 別サイトから「戻る」（ページが保存されたまま戻る：pageshow persisted）
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await trace(); await p.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await check(p, `${tag} 別サイトから戻る（保存されたページ）`);
    // 9. トップに #付きで入る（ヒーローが画面外）→ 上へ戻ったときに再生
    await p.goto(BASE + '/#services', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const off = await p.evaluate(() => ({ dove: window.__T.doveSeen, done: window.__T.done, y: scrollY }));
    ok(`${tag} ヒーローが画面外なら飛ばない`, off.dove === null && off.done === null && off.y > 200, JSON.stringify(off));
    await trace(); await p.evaluate(() => scrollTo(0, 0)); await check(p, `${tag} 上へ戻ってヒーローが見えたら飛ぶ`);
    ok(`${tag} エラーなし`, errs.length === 0, errs.join(' / '));
    await ctx.close();
  }
  // 動きを減らす設定
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.addInitScript(startTrace);
  await p.goto(BASE + '/', { waitUntil: 'load' }); await check(p, '動きを減らす：再読み込み（鳩なし・下線は最初から）', true);
  await p.goto(BASE + '/about', { waitUntil: 'load' }); await p.evaluate(startTrace); await p.click('header .wordmark'); await check(p, '動きを減らす：ロゴ（鳩なし・下線は最初から）', true);
  await b.close();
  console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('NG')) ? 'NG' : 'ALL OK');
})();
