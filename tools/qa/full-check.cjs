// 公開前の全体検査（最終チェック）：全ページ × 全幅 ×（使えるなら）複数のブラウザエンジン
//   node tools/qa/full-check.cjs                 … Chromium、全幅
//   ENGINES=chromium,webkit,firefox node …      … WebKit（Safari 相当）・Firefox も（Playwright のブラウザが入っている環境で）
//   W=390,1280 ONLY=/services/bookkeeping node … … 幅・ページを絞る
// 結果は標準出力に「NG …」の行と、最後に項目ごとの件数。OUT=path を付けると JSON でも書き出す。
//
// 確かめること
//  A. 静的（dist の HTML）：title・description の欠け／重複、canonical、OGP 画像の実在、構造化データ（JSON-LD）の構文、h1 が1つ、
//     sitemap.xml の全URLが実在、robots.txt・llms.txt、電話番号が載っていない
//  B. 表示（ページ × 幅）：横スクロール、画面からはみ出す要素、文字どうしの重なり、画像の欠け、コンソールエラー、
//     404 のリソース、出現アニメーションの取り残し、固定表示（スマホの固定バー・チャットボタン・トップへ戻る）が
//     リンクやボタン・入力欄を隠していないか（ページを下までスクロールしながら）、スマホで入力欄の文字が 16px 未満（iOS のズーム）、
//     info@ がフッター1か所だけか（例外：プライバシーポリシーの「お問い合わせ窓口」、送信失敗時のエラー文）
//  C. 操作：内部リンク・アンカーのリンク切れ、ハンバーガーメニューの開閉（Esc でも閉じる）、
//     お問い合わせフォーム（未入力のエラー → 入力 → 確認 → 送信 → 完了画面。送信先はテスト用に差し替え、実際には送らない）、
//     スパム対策欄が見えない、横向きスマホ（844×390）
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:4173';
const DIST = process.env.DIST || path.join(__dirname, '../../dist');
const ENGINES = (process.env.ENGINES || 'chromium').split(',');
const WIDTHS = (process.env.W || '1440,1280,1024,768,430,390,360,320').split(',').map(Number);
const out = []; const counts = {};
const ng = (kind, msg) => { out.push(`NG [${kind}] ${msg}`); counts[kind] = (counts[kind] || 0) + 1; };
const ok = (kind) => { counts[kind] = counts[kind] || 0; };

// ── ページの一覧（dist から） ──
const list = (dir) => fs.existsSync(path.join(DIST, dir)) ? fs.readdirSync(path.join(DIST, dir)).filter((f) => f.endsWith('.html')).map((f) => `/${dir}/${f.replace('.html', '')}`) : [];
let PAGES = ['/', '/about', '/services', ...list('services'), '/topics', ...list('topics'), '/contact', '/privacy', '/this-page-does-not-exist'];
if (process.env.ONLY) PAGES = PAGES.filter((p) => process.env.ONLY.split(',').includes(p));
const htmlFile = (p) => p === '/' ? 'index.html' : p === '/this-page-does-not-exist' ? '404.html' : p.slice(1) + '.html';

// ── A. 静的な検査 ──
function staticChecks() {
  const titles = new Map(), descs = new Map();
  const PHONE = /(?:0\d{1,4}[-‐ー−（(]\d{1,4}[-‐ー−）)]\d{3,4}|\+81[-\s]?\d)/;
  for (const p of PAGES) {
    const f = path.join(DIST, htmlFile(p));
    if (!fs.existsSync(f)) { ng('static', `${p}: HTML がない`); continue; }
    const t = fs.readFileSync(f, 'utf8');
    const title = (t.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const desc = (t.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    const can = (t.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const og = (t.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    if (!title) ng('meta', `${p}: title がない`); else titles.set(title, [...(titles.get(title) || []), p]);
    if (!desc) ng('meta', `${p}: description がない`); else descs.set(desc, [...(descs.get(desc) || []), p]);
    if (p !== '/this-page-does-not-exist') {
      if (!can) ng('meta', `${p}: canonical がない`);
      else if (!/^https:\/\/coana\.co\.jp/.test(can)) ng('meta', `${p}: canonical が本番のURLでない ${can}`);
      if (!og) ng('meta', `${p}: og:image がない`);
      else { const local = path.join(DIST, decodeURIComponent(og.replace(/^https:\/\/coana\.co\.jp/, ''))); if (!fs.existsSync(local)) ng('meta', `${p}: og:image のファイルがない ${og}`); }
    }
    for (const j of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(j[1]); } catch (e) { ng('meta', `${p}: JSON-LD の構文エラー ${e.message}`); } }
    const h1 = (t.match(/<h1[\s>]/g) || []).length; if (h1 > 1) ng('meta', `${p}: 静的HTMLに h1 が ${h1} 個`);
    if (PHONE.test(t.replace(/<script[\s\S]*?<\/script>/g, ''))) ng('content', `${p}: 電話番号らしき文字列 ${t.match(PHONE)[0]}`);
  }
  for (const [k, v] of titles) if (v.length > 1) ng('meta', `title の重複「${k}」: ${v.join(', ')}`);
  for (const [k, v] of descs) if (v.length > 1) ng('meta', `description の重複: ${v.join(', ')}`);
  // sitemap・robots・llms
  const sm = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  for (const loc of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) { const u = loc[1].replace(/^https:\/\/coana\.co\.jp/, '') || '/'; if (!fs.existsSync(path.join(DIST, htmlFile(u)))) ng('meta', `sitemap の URL が実在しない ${loc[1]}`); }
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'); if (!/Sitemap: https:\/\/coana\.co\.jp\/sitemap\.xml/.test(robots)) ng('meta', 'robots.txt に sitemap がない');
  if (!fs.existsSync(path.join(DIST, 'llms.txt')) || fs.statSync(path.join(DIST, 'llms.txt')).size < 500) ng('meta', 'llms.txt がない・短すぎる');
  for (const f of ['sitemap.xml', 'llms.txt', 'feed.xml']) { const t = fs.readFileSync(path.join(DIST, f), 'utf8'); if (PHONE.test(t)) ng('content', `${f}: 電話番号らしき文字列`); }
  ok('static'); ok('meta'); ok('content');
}

// ── B. 表示の検査（ページを開いて下までスクロールしながら） ──
async function renderChecks(engine, b, w, h, mobile, tag) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(engine === 'firefox' ? {} : { isMobile: mobile }), hasTouch: mobile });
  const p = await ctx.newPage();
  let cur = '';
  p.on('console', (m) => { if (m.type() === 'error' && !/googletagmanager|gtag|ERR_CONNECTION|net::ERR_(?!FILE)/.test(m.text())) ng('console', `${tag} ${cur}: ${m.text().slice(0, 160)}`); });
  p.on('pageerror', (e) => ng('console', `${tag} ${cur}: pageerror ${e.message.slice(0, 160)}`));
  p.on('response', (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400 && !cur.includes('does-not-exist')) ng('404', `${tag} ${cur}: ${r.status()} ${u.replace(BASE, '')}`); });
  const links = new Map();
  for (const url of PAGES) {
    cur = url;
    try { await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { ng('load', `${tag} ${url}: ${e.message.slice(0, 80)}`); continue; }
    await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const covered = new Set();
    // 途中までスクロールしながら（出現アニメーションを起こす）、固定表示の覆いは「先頭」と「いちばん下（フッター）」で確かめる
    //（途中では、本文は固定表示の下をくぐってスクロールで出てくるので問題にならない）
    for (let y = 0; y <= H; y += Math.round(h * 0.6)) {
      await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120);
    }
    for (const y of [0, H]) {
      await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(700);
      // 固定表示の要素が、見えているリンク・ボタン・入力欄の中心を覆っていないか
      const c = await p.evaluate((atTop) => {
        const vh = innerHeight, vw = innerWidth; const res = [];
        const fixedOf = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'fixed' || ps === 'sticky') return n; } return null; };
        for (const el of document.querySelectorAll('main a, main button, main input, main select, main textarea, footer a, footer button')) {
          const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
          if (getComputedStyle(el).visibility === 'hidden' || el.closest('[aria-hidden="true"]') || el.closest('.form-honeypot')) continue;
          const pts = [[r.left + r.width / 2, r.top + r.height / 2]];
          for (const [x, y] of pts) {
            if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
            const top = document.elementFromPoint(x, y);
            if (!top || el.contains(top) || top.contains(el)) continue;
            const fx = fixedOf(top);
            // 上の固定ヘッダーは、ページの先頭でだけ問題にする（スクロールの途中・最下部では本文は下をくぐる）
            if (fx && !atTop && fx.getBoundingClientRect().top < 4 && fx.getBoundingClientRect().bottom < vh / 2) continue;
            if (fx && !fixedOf(el)) res.push(`${(fx.className || fx.tagName).toString().split(' ')[0]} が「${(el.textContent || el.getAttribute('aria-label') || el.name || el.tagName).trim().slice(0, 16)}」を隠す`);
          }
        }
        return res;
      }, y === 0);
      c.forEach((x) => covered.add(x));
    }
    for (const x of covered) ng('fixed-cover', `${tag} ${url}: ${x}`);
    await p.waitForTimeout(400);
    const r = await p.evaluate(({ mobile, url }) => {
      const vw = document.documentElement.clientWidth;
      const inScroller = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || s.overflow === 'hidden') return true; } return false; };
      const wide = [];
      for (const el of document.querySelectorAll('main *, header *, footer *')) {
        const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
        if ((rc.right > vw + 1 || rc.left < -1) && !inScroller(el) && getComputedStyle(el).position !== 'fixed' && !el.closest('[aria-hidden="true"]')) wide.push((typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : el.tagName) + `(${Math.round(rc.left)}..${Math.round(rc.right)})`);
      }
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().height > 0).map((i) => i.getAttribute('src'));
      // 文字どうしの重なり（見えている文字だけ。どちらかがもう一方を含む場合・鳩の重ね絵は除く）
      const vis = (e) => { if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) return false; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || +cs.opacity < 0.2 || cs.display === 'none') return false; } return true; };
      const textEls = [...document.querySelectorAll('main *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !e.closest('.dove-layer, .sr-only, .visually-hidden, [aria-hidden="true"]') && vis(e));
      // 祖先の overflow で切り取られた部分（閉じた開閉UIの中身など）は見えていないので除く
      const clip = (e, x) => { let l = x.left, t = x.top, r = x.right, b = x.bottom; for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip|auto|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) { const c = n.getBoundingClientRect(); l = Math.max(l, c.left); t = Math.max(t, c.top); r = Math.min(r, c.right); b = Math.min(b, c.bottom); } } return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t }; };
      const rects = textEls.map((e) => { const rr = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(n); rr.push(...[...range.getClientRects()].map((x) => clip(e, x)).filter((x) => x.width > 2 && x.height > 2)); } return rr; });
      const overlaps = [];
      for (let i = 0; i < textEls.length; i++) for (let j = i + 1; j < textEls.length; j++) {
        const a = textEls[i], c = textEls[j]; if (a.contains(c) || c.contains(a)) continue;
        let hit = false;
        for (const r1 of rects[i]) { for (const r2 of rects[j]) { if (Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left) > 3 && Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top) > 3) { hit = true; break; } } if (hit) break; }
        if (hit) overlaps.push(`「${a.textContent.trim().slice(0, 10)}」×「${c.textContent.trim().slice(0, 10)}」`);
      }
      const hidden = [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('in') && e.getBoundingClientRect().height > 0).length;
      const smallInputs = mobile ? [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')].filter((e) => e.getBoundingClientRect().height > 0 && !e.closest('.form-honeypot') && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.name || e.id || e.tagName) : [];
      // info@ はフッター1か所だけ（重複表示はしない）。プライバシーポリシーの窓口は例外
      const mailOut = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /info@/.test(n.textContent)) && !e.closest('footer') && !e.closest('.seo-fallback') && vis(e)).length;
      const mailHref = [...document.querySelectorAll('a[href^="mailto:"]')].filter((a) => !a.closest('footer') && vis(a)).length;
      const honeypotVisible = [...document.querySelectorAll('.form-honeypot, input[name="website"]')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && vis(e) && r.left > -100; });
      const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      return { docOverflow: document.documentElement.scrollWidth > vw + 1, wide: [...new Set(wide)].slice(0, 5), imgs, overlaps: overlaps.slice(0, 4), hidden, smallInputs, mail: url === '/privacy' ? 0 : mailOut + mailHref, honeypotVisible, hrefs, h1: document.querySelectorAll('h1').length };
    }, { mobile, url });
    if (r.docOverflow) ng('overflow', `${tag} ${url}: 横スクロールが出る`);
    if (r.wide.length) ng('overflow', `${tag} ${url}: はみ出し ${r.wide.join(', ')}`);
    if (r.imgs.length) ng('image', `${tag} ${url}: 画像の欠け ${r.imgs.join(', ')}`);
    if (r.overlaps.length) ng('overlap', `${tag} ${url}: 文字の重なり ${r.overlaps.join(' / ')}`);
    if (r.hidden) ng('reveal', `${tag} ${url}: 表示されないまま ${r.hidden} 件`);
    if (r.smallInputs.length) ng('form', `${tag} ${url}: 入力欄の文字が 16px 未満 ${r.smallInputs.join(', ')}`);
    if (r.mail) ng('content', `${tag} ${url}: info@ がフッター以外にも ${r.mail} か所（重複表示）`);
    if (r.honeypotVisible) ng('form', `${tag} ${url}: スパム対策欄が見えている`);
    if (r.h1 !== 1) ng('meta', `${tag} ${url}: 表示中の h1 が ${r.h1} 個`);
    for (const l of r.hrefs) if (!links.has(l)) links.set(l, url);
  }
  await ctx.close();
  ['overflow', 'image', 'overlap', 'reveal', 'form', 'console', '404', 'fixed-cover', 'load'].forEach(ok);
  return links;
}

// ── C. 操作の検査 ──
async function interactionChecks(engine, b, links) {
  // 内部リンク・アンカー
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  for (const [l, from] of links) {
    if (!(l.startsWith('/') || l.startsWith('#'))) continue;
    const target = l.startsWith('#') ? from + l : l;
    const [pth, hash] = target.split('#');
    const res = await p.goto(BASE + (pth || '/'), { waitUntil: 'networkidle' }).catch(() => null);
    const st = res ? res.status() : 0;
    const isFile = /\.[a-z0-9]+$/i.test(pth) && !pth.endsWith('.html');
    const info = await p.evaluate((hash) => ({ notfound: /ページが見つかりません/.test(document.querySelector('h1')?.textContent || ''), anchor: hash ? !!document.getElementById(decodeURIComponent(hash)) : true }), hash).catch(() => ({ notfound: true, anchor: false }));
    if (isFile ? st >= 400 : (info.notfound || !info.anchor)) ng('link', `${engine} ${l}（${from} から）status=${st} notfound=${info.notfound} anchor=${info.anchor}`);
  }
  const external = [...links.keys()].filter((l) => /^https?:/.test(l) && !l.startsWith(BASE));
  const bad = [...links.keys()].filter((l) => /^tel:/.test(l)); if (bad.length) ng('content', `電話のリンク ${bad.join(', ')}`);
  await ctx.close();
  // ハンバーガーメニュー（スマホ）
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, ...(engine === 'firefox' ? {} : { isMobile: true }), hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.tap('.menu-button');
  const opened = await mp.locator('.mobile-nav').isVisible();
  await mp.tap('.menu-button');
  const closed = !(await mp.locator('.mobile-nav').isVisible());
  await mp.tap('.menu-button'); await mp.keyboard.press('Escape');
  const esc = !(await mp.locator('.mobile-nav').isVisible());
  await mp.tap('.menu-button'); await mp.locator('.mobile-nav a').nth(1).tap(); await mp.waitForLoadState('networkidle');
  const navigated = mp.url().endsWith('/about') && !(await mp.locator('.mobile-nav').isVisible());
  if (!(opened && closed && esc && navigated)) ng('menu', `${engine} ハンバーガーメニュー open=${opened} close=${closed} esc=${esc} 遷移=${navigated}`);
  ok('menu');
  // お問い合わせフォーム（送信先はテスト用に差し替え）
  await mp.route(/script\.google\.com|\/api\/contact|formspree|getform|workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await mp.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  await mp.locator('form button[type=submit]').first().tap();
  const errs = await mp.locator('.field-error').count();
  await mp.locator('input[placeholder*="山田"]').fill('テスト 太郎');
  await mp.locator('input[type=email]').fill('test@example.com');
  await mp.locator('form select').first().selectOption({ index: 1 });
  await mp.locator('form textarea').first().fill('最終チェックのテストです（実際には送信されません）。');
  await mp.locator('label.consent:not(.meeting-check) input[type=checkbox]').check();
  await mp.locator('form button[type=submit]').first().tap();
  await mp.waitForTimeout(500);
  const confirm = await mp.locator('text=入力内容の確認').count() + await mp.locator('text=この内容で送信').count();
  await mp.locator('button:has-text("送信")').last().tap().catch(() => {});
  await mp.waitForTimeout(1500);
  const done = await mp.locator('text=お問い合わせを受け付けました').count();
  if (errs < 3 || !confirm || !done) ng('form', `${engine} フォーム：未入力のエラー ${errs} 件・確認画面 ${confirm ? 'あり' : 'なし'}・完了画面 ${done ? 'あり' : 'なし'}`);
  else {
    // 完了画面も表示の検査（はみ出し）
    const o = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (o) ng('overflow', `${engine} 390 /contact（完了画面）: 横スクロール`);
  }
  await m.close();
  return external;
}

(async () => {
  staticChecks();
  let external = [];
  for (const engine of ENGINES) {
    let b;
    try { b = await pw[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROME_PATH || undefined } : {}); } catch (e) { ng('engine', `${engine} を起動できない（${e.message.split('\n')[0].slice(0, 120)}）`); continue; }
    let links = new Map();
    for (const w of WIDTHS) {
      const mobile = w <= 430;
      const h = mobile ? 844 : w <= 1024 ? 1024 : 900;
      const l = await renderChecks(engine, b, w, h, mobile, `${engine} ${w}`);
      if (w === 1280 || !links.size) links = new Map([...links, ...l]);
    }
    // 横向きのスマホ
    if (!process.env.W) await renderChecks(engine, b, 844, 390, true, `${engine} 844x390`);
    external = await interactionChecks(engine, b, links);
    await b.close();
  }
  console.log(out.join('\n'));
  console.log('\n── 項目ごとの NG 件数 ──');
  for (const [k, v] of Object.entries(counts)) console.log(`${v ? 'NG' : 'OK'} ${k}: ${v}`);
  console.log(`外部リンク ${external.length} 件（別途 curl で確認）:\n` + external.join('\n'));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ out, counts, external }, null, 1));
})();
