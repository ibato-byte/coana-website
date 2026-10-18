// 3パターン（普通にスクロール／一気に最下部へ／ページ内リンク・戻る）で、文字が隠れたままの部分がないかを点検
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2] || 'http://localhost:4173';
const reduced = process.argv[3] === 'reduce';
const PAGES = ['/', '/services', '/about', ...['backoffice-dx','bookkeeping','cloud-accounting','sales-support','seminar-event','sns-management','startup-support','startup-support-en','web-production'].map((s) => '/services/' + s)];
const hiddenText = () => {
  // 画面内（と、画面より上）の文字のうち、スクロール表示（[data-reveal]）で隠れている・まだ動いているもの
  const out = [];
  document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li, main a, main button, main strong, main small, main dt, main dd, main text').forEach((el) => {
    if (!el.textContent.trim()) return;
    if (el.closest('.form-honeypot, .visually-hidden, .lp-sticky, .chat-panel')) return;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
    if (r.top > innerHeight) return; // まだ画面に入っていないものは対象外
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (!e.matches('[data-reveal]')) continue;
      const cs = getComputedStyle(e);
      if (!e.classList.contains('in') || parseFloat(cs.opacity) < 0.99) { out.push(`${el.tagName}.${el.className && el.className.baseVal === undefined ? el.className : ''} "${el.textContent.trim().slice(0, 18)}" reveal=${e.className.baseVal ?? e.className} in=${e.classList.contains('in')} op=${cs.opacity} top=${Math.round(r.top)}`); break; }
    }
  });
  return out;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let ng = 0;
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    for (const u of PAGES) {
      const res = [];
      // 1. 普通にスクロール：0.6画面ずつ、0.6秒待って画面内の文字を確認
      await p.goto(base + u, { waitUntil: 'networkidle' });
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      let worst = [];
      for (let y = 0; y < H; y += Math.round(h * 0.6)) {
        await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
        await p.waitForTimeout(600);
        const hid = await p.evaluate(hiddenText); if (hid.length) worst = worst.concat(hid.map((x) => `y=${y} ${x}`));
      }
      res.push(['normal', worst]);
      // 2. 一気に最下部へ → 0.15秒後に上の方も含めて確認、さらに一気に途中へ戻って確認
      await p.goto(base + u, { waitUntil: 'networkidle' });
      await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await p.waitForTimeout(150);
      let jump = await p.evaluate(hiddenText);
      for (const f of [0.75, 0.5, 0.25]) {
        await p.evaluate((f) => window.scrollTo({ top: document.documentElement.scrollHeight * f, behavior: 'instant' }), f);
        await p.waitForTimeout(150);
        jump = jump.concat((await p.evaluate(hiddenText)).map((x) => `back${f} ${x}`));
      }
      res.push(['jump', jump]);
      // 3. ページ内リンク：ページ下半分にある id 付き要素へ #付きURLで直接移動（スムーズスクロール後に確認）→ 別ページへ移って「戻る」
      const id = await p.evaluate(() => { const H = document.documentElement.scrollHeight; const c = [...document.querySelectorAll('main [id]')].filter((e) => e.getBoundingClientRect().top + scrollY > H * 0.3); return c.length ? c[Math.floor(c.length / 2)].id : ''; });
      let anchor = [];
      if (id) {
        await p.goto(base + u + '#' + id, { waitUntil: 'networkidle' });
        await p.waitForTimeout(1500);
        anchor = (await p.evaluate(hiddenText)).map((x) => `#${id} ${x}`);
      }
      const hrefBack = await p.evaluate(() => { scrollTo({ top: document.documentElement.scrollHeight * 0.6, behavior: 'instant' }); return scrollY; });
      await p.waitForTimeout(700);
      await p.goto(base + '/privacy', { waitUntil: 'networkidle' });
      await p.goBack({ waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      anchor = anchor.concat((await p.evaluate(hiddenText)).map((x) => `back ${x}`));
      res.push([`anchor(#${id || '-'})+back`, anchor]);
      const line = res.map(([k, v]) => `${k}:${v.length ? 'NG' + v.length : 'ok'}`).join('  ');
      console.log(w, u.padEnd(32), line);
      res.forEach(([k, v]) => v.slice(0, 4).forEach((x) => console.log('     ', k, x)));
      if (res.some(([, v]) => v.length)) ng++;
    }
    await ctx.close();
  }
  console.log(ng ? `NG pages: ${ng}` : 'ALL OK');
  await b.close();
})();
