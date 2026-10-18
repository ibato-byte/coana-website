// 各ページ：再読み込みとサイト内の移動（ロゴ→リンク、戻る）で、画面内の演出が同じか
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = 'http://localhost:4173';
const PAGES = ['/about', '/services', '/topics', '/contact', ...['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'].map((s) => '/services/' + s)];
const snap = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
  const anims = document.getAnimations().filter((a) => a.effect?.target && a.effect.target.isConnected && vis(a.effect.target.nodeType === 1 ? a.effect.target : a.effect.target.parentElement))
    .map((a) => (a.animationName || a.transitionProperty || 'waapi')).filter((n) => !(['left','width'].includes(n))).sort();
  const uniq = [...new Set(anims)];
  return { anims: uniq.join(','), inView: [...document.querySelectorAll('[data-reveal]')].filter(vis).filter((e) => e.classList.contains('in')).length, notIn: [...document.querySelectorAll('[data-reveal]')].filter(vis).filter((e) => !e.classList.contains('in')).length };
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let ng = 0;
  for (const [w, h, tag] of [[1280, 860, 'PC'], [390, 844, 'SP']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    for (const u of PAGES) {
      const shots = {};
      await p.goto(BASE + u, { waitUntil: 'load' }); await p.waitForTimeout(250); shots.reload = await p.evaluate(snap);
      await p.waitForTimeout(2500); shots.reloadEnd = await p.evaluate(snap);
      // トップからサイト内の移動
      await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(300);
      await p.evaluate((u) => { const a = document.createElement('a'); a.href = u; document.querySelector('main').append(a); }, u);
      await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); }, u);
      await p.waitForTimeout(250); shots.nav = await p.evaluate(snap);
      await p.waitForTimeout(2500); shots.navEnd = await p.evaluate(snap);
      const same = shots.reload.anims === shots.nav.anims && shots.reloadEnd.inView === shots.navEnd.inView && shots.navEnd.notIn === 0;
      if (!same) ng++;
      console.log(tag, u, same ? 'same' : 'DIFF', same ? `(${shots.reload.anims || 'none'})` : JSON.stringify(shots));
    }
    await ctx.close();
  }
  console.log(ng ? 'NG ' + ng : 'ALL OK'); await b.close();
})();
