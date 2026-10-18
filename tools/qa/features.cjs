// 今回つくった演出・パーツの個別の回帰確認（本番と同じビルド）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const shapesDrawn = (sel) => [...document.querySelectorAll(sel)].every((s) => { const cs = getComputedStyle(s); return cs.strokeDasharray === 'none' || parseFloat(cs.strokeDashoffset) < 0.02; });
(async () => {
 const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
 for (const [w, h, tag] of [[1280, 860, 'PC'], [390, 844, 'スマホ']]) {
  const mobile = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { window.__log = []; addEventListener('coana:dove-done', () => __log.push(['dove', performance.now()])); });
  // ── トップ：鳩の下線・回転ワード・ヒーローの挿絵 ──
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForFunction(() => { const v = parseFloat(document.querySelector('.title-underline')?.style.getPropertyValue('--ul')); return v > 0.05; }, null, { timeout: 5000, polling: 'raf' }).catch(() => {});
  const dv = await p.evaluate(() => ({ dove: !!document.querySelector('.hero-dove'), op: parseFloat(getComputedStyle(document.querySelector('.hero-dove') || document.body).opacity), ul: document.querySelector('.title-underline').style.getPropertyValue('--ul') }));
  ok(`${tag} 鳩：飛行中に見え、下線が途中まで引かれている`, dv.dove && dv.op > 0.5 && parseFloat(dv.ul) > 0 && parseFloat(dv.ul) < 1, JSON.stringify(dv));
  const word0 = await p.evaluate(() => document.querySelector('.solve-box .solve-word:last-child').textContent);
  await p.waitForTimeout(4200);
  const after = await p.evaluate(() => ({ ul: document.querySelector('.title-underline').style.getPropertyValue('--ul'), done: document.querySelector('.title-underline').classList.contains('is-done'), op: getComputedStyle(document.querySelector('.hero-dove')).opacity, word: document.querySelector('.solve-box .solve-word:last-child').textContent, log: window.__log }));
  ok(`${tag} 鳩：飛び去ったあと下線が完成・鳩は消える`, after.ul === '1' && after.done && after.op === '0');
  ok(`${tag} 回転ワード：鳩のあとで切り替わる`, after.word !== word0 && after.log.length === 1, `${word0} → ${after.word}`);
  const art = await p.evaluate(() => { const s = document.querySelector('.hero-scene'); const an = s ? s.getAnimations({ subtree: true }) : []; return { scene: !!s, running: an.filter((a) => a.playState === 'running').length, dash: !!s && !!s.querySelector('.art-dash') }; });
  ok(`${tag} ヒーローの挿絵（グラフ・点線）：表示され、ゆっくり動いている`, art.scene && art.running > 0 && art.dash, JSON.stringify(art));
  // ボタンの「矢印 → 鳥」（PC のホバーのみ）
  if (!mobile) {
   const btn = p.locator('.hero .button-fly, .hero .button').first();
   const sel = '.hero .bird-arrow .bird-wing';
   const has = await p.$(sel);
   if (has) {
    const d0 = await p.$eval(sel, (e) => e.getAttribute('d'));
    await btn.hover(); await p.waitForTimeout(800);
    const d1 = await p.$eval(sel, (e) => e.getAttribute('d'));
    await p.mouse.move(5, 5); await p.waitForTimeout(1200);
    const d2 = await p.$eval(sel, (e) => e.getAttribute('d'));
    ok('PC ボタン：ホバーで矢印が鳥に変わり、外すと矢印に戻る', d0 !== d1 && d2 === d0);
   } else ok('PC ボタン：ヒーローに鳥に変わるボタンがある', false);
  }
  // ヒーローを通り過ぎたら挿絵の動きは止まる
  await p.evaluate(() => scrollTo(0, 2600)); await p.waitForTimeout(500);
  ok(`${tag} 画面外の挿絵は止まる（.art-paused）`, await p.evaluate(() => document.querySelector('.hero-scene .art, .hero-scene.art, .hero-scene svg')?.closest('.art-paused, .art.art-paused') !== null || !!document.querySelector('.hero-scene .art-paused, .hero-scene.art-paused, .art.art-paused')));
  // 雲のアイコン（クラウド会計のカードの挿絵）
  const cloud = await p.evaluate(() => { const a = document.querySelector('a[href="/services/cloud-accounting"] svg'); if (!a) return null; const r = a.getBoundingClientRect(); const card = a.closest('a').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= card.left - 1 && r.right <= card.right + 1 && r.top >= card.top - 1 }; });
  ok(`${tag} 雲のアイコン（クラウド会計のカード）：表示され、カードからはみ出さない`, !!cloud && cloud.w > 20 && cloud.inside, JSON.stringify(cloud));
  // 「迷ったら」の帯（トップ）
  ok(`${tag} 「迷ったら」の帯（トップ）：診断だけ`, await p.evaluate(() => { const bnd = document.querySelector('.diagnose-banner.is-home'); return !!bnd && bnd.querySelectorAll('button, a').length === 1 && /診断/.test(bnd.textContent); }));
  // OUR STYLE
  await p.evaluate(() => document.querySelector('.style-section').scrollIntoView({ block: 'start' })); await p.waitForTimeout(1600);
  const st = await p.evaluate((fn) => { const f = new Function('return ' + fn)(); return { lines: [...document.querySelectorAll('.style-mission-line')].every((e) => e.classList.contains('in') && getComputedStyle(e).opacity === '1'), cards: [...document.querySelectorAll('.style-grid li')].filter((e) => e.classList.contains('in')).length, icons: f('.style-icon svg *'), live: document.querySelector('.style-section').classList.contains('is-live') }; }, shapesDrawn.toString());
  ok(`${tag} OUR STYLE：見出しの行・カード4枚が表示、アイコンが描かれている`, st.lines && st.cards === 4 && st.icons && st.live, JSON.stringify(st));
  if (!mobile) {
   { const bb = await p.locator('.style-card >> nth=1').boundingBox(); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.3); await p.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.25, { steps: 4 }); await p.waitForTimeout(200); }
   const tilt = await p.evaluate(() => { const c = document.querySelector('.style-card.is-tilting'); return c ? c.style.getPropertyValue('--rx') : null; });
   ok('PC OUR STYLE：カーソルでカードがわずかに傾く', !!tilt, String(tilt));
   ok('PC OUR STYLE：ツールをつなぐ線が引かれている', await p.evaluate(() => getComputedStyle(document.querySelector('.style-tools-line')).transform === 'none'));
  }
  // ── LP：PROBLEMS・HOW IT WORKS（リレー型）・FLOW ──
  await p.goto(BASE + '/services/backoffice-dx', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelector('.lp-problems').scrollIntoView({ block: 'start' })); await p.waitForTimeout(1500);
  const pr = await p.evaluate((fn) => { const f = new Function('return ' + fn)(); return { cards: [...document.querySelectorAll('.lp-problem-grid li')].every((e) => e.classList.contains('in')), icons: f('.lp-problem-icon svg *'), funnel: getComputedStyle(document.querySelector('.lp-funnel')).display !== 'none' && f('.lp-funnel path:not([style*="none"])'), arrow: getComputedStyle(document.querySelector('.lp-bridge-arrow')).opacity }; }, shapesDrawn.toString());
  ok(`${tag} PROBLEMS：カード表示・アイコンと線が描かれ・矢印が降りている`, pr.cards && pr.icons && pr.funnel && pr.arrow === '1', JSON.stringify(pr));
  await p.evaluate(() => document.querySelector('.lp-scheme').scrollIntoView({ block: 'start' })); await p.waitForTimeout(2600);
  // HOW IT WORKS（リレー型）：番号付きの意味のある線（PC は矢印の線、スマホは上から下の1列）
  const rl = await p.evaluate(() => ({ lines: document.querySelectorAll('.relay-lines .relay-line').length, arrows: document.querySelectorAll('.relay-lines [marker-end]').length, steps: [...document.querySelectorAll('.relay-step .relay-num, .relay-return .relay-num')].map((n) => n.textContent).join(','), areas: document.querySelectorAll('.relay-area').length, startLit: document.querySelector('.relay-client').classList.contains('is-now'), column: getComputedStyle(document.querySelector('.relay')).display }));
  if (!mobile) ok('PC HOW IT WORKS（リレー型）：左→右の線と矢印・番号 1〜4・起点だけ点灯', rl.lines >= 9 && rl.arrows >= 8 && rl.steps === '1,2,3,4' && rl.areas === 5 && rl.startLit && rl.column === 'grid', JSON.stringify(rl));
  else ok('スマホ HOW IT WORKS（リレー型）：上から下の1列・番号 1〜4・起点だけ点灯', rl.lines === 0 && rl.steps === '1,2,3,4' && rl.areas === 5 && rl.startLit && rl.column === 'flex', JSON.stringify(rl));
  // FLOW（静止画＋PC のホバー）
  await p.evaluate(() => document.querySelector('.lp-flow').scrollIntoView({ block: 'start' })); await p.waitForTimeout(800);
  const fl = await p.evaluate(() => ({ progress: !!document.querySelector('[data-progress]'), steps: [...document.querySelectorAll('.lp-flow .flowx-step')].filter((s) => s.getBoundingClientRect().height > 0 && getComputedStyle(s.querySelector('h3')).opacity === '1').length, nums: [...document.querySelectorAll('.lp-flow .flowx-num')].map((n) => n.textContent).join(','), cta: document.querySelectorAll('.lp-flow .flowx-cta a').length, lead: document.querySelector('.lp-flow .flowx-lead')?.textContent }));
  ok(`${tag} FLOW：スクロール連動なし・全ステップが最初から読める・線の先に相談ボタン1つ`, !fl.progress && fl.steps === 5 && fl.nums === '01,02,03,04,05' && fl.cta === 1 && fl.lead === 'まずは無料相談から', JSON.stringify(fl));
  if (!mobile) {
   await p.hover('.lp-flow .flowx-step >> nth=1'); await p.waitForTimeout(500);
   const hv = await p.evaluate(() => { const n = document.querySelectorAll('.lp-flow .flowx-node')[1]; return { bg: getComputedStyle(n).backgroundColor, tr: getComputedStyle(n).transform }; });
   ok('PC FLOW：ホバーでステップが浮き、丸が黄色に', hv.bg === 'rgb(255, 216, 90)' && hv.tr !== 'none', JSON.stringify(hv));
  }
  // 一本の流れ型（営業支援）
  await p.goto(BASE + '/services/sales-support', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelector('.lp-scheme').scrollIntoView({ block: 'start' })); await p.waitForTimeout(2200);
  const sf = await p.evaluate(() => ({ in: document.querySelector('.lp-scheme-flow').classList.contains('in'), lit: [...document.querySelectorAll('.lp-scheme-flow-icon')].every((i) => getComputedStyle(i, '::before').opacity === '1'), badges: [...document.querySelectorAll('.lp-scheme-flow-icon b')].every((b) => getComputedStyle(b).opacity === '1') }));
  ok(`${tag} HOW IT WORKS（一本の流れ型）：各ステージが点灯`, sf.in && sf.lit && sf.badges, JSON.stringify(sf));
  // サービス一覧：帯・料金→流れ→相談
  await p.goto(BASE + '/services', { waitUntil: 'networkidle' });
  const sv = await p.evaluate(() => { const order = [...document.querySelectorAll('.flow-section .pricing-box, .flow-section .section-title, .flow-section .flowx-cta')].map((e) => e.className.split(' ')[0]); const bnd = document.querySelector('.diagnose-banner'); return { order: order.join('>'), band: !!bnd && bnd.querySelectorAll('button, a').length === 1, icons: [...document.querySelectorAll('.flow-section .flowx-icon svg *')].every((s) => getComputedStyle(s).strokeDasharray === 'none') }; });
  ok(`${tag} サービス一覧：料金→流れ→相談の順・帯は診断だけ・流れのアイコンが見える`, sv.order === 'pricing-box>section-title>flowx-cta' && sv.band && sv.icons, JSON.stringify(sv));
  // 会社概要のヘッダー
  await p.goto(BASE + '/about', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const ab = await p.evaluate(async () => { const h = document.querySelector('.page-hero'); const bg = getComputedStyle(h).backgroundImage; const url = (bg.match(/url\("?([^")]+)"?\)/) || [])[1]; const res = url ? await fetch(url) : null; return { h1: h.querySelector('h1').textContent, img: res && res.ok, intro: getComputedStyle(h.querySelector('.page-intro')).opacity }; });
  ok(`${tag} 会社概要のヘッダー：写真が読み込まれ、見出しと導入文が表示`, ab.h1 === '会社概要' && ab.img && ab.intro === '1', JSON.stringify(ab));
  ok(`${tag} ページの JavaScript エラーなし`, errs.length === 0, errs.slice(0, 3).join(' / '));
  await ctx.close();
 }
 console.log(out.join('\n')); console.log(out.some((x) => x.startsWith('NG')) ? 'NG あり' : 'ALL OK');
 await b.close();
})();
