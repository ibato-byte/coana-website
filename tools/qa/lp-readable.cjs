// サービスLPとホームページ（トップ・サービス一覧・会社概要・トピックス・お問い合わせ）の「読みやすさ」の検査
// （2026-11-13 オーナー指摘「LP が見ていて疲れる」の再発防止）
//   node tools/qa/lp-readable.cjs            … 全LP＋ホームページ5ページ × 10の幅
//   W=390,1280 ONLY=/services/bookkeeping node tools/qa/lp-readable.cjs
// 確かめること（1件でもあれば「NG」を出し、終了コード 1）
//  1. 12px 未満の文字がない（説明の字が小さいと読み疲れる）
//  2. 横スクロール・画面からのはみ出し・カードからの文字のはみ出しがない（業務の一覧・FAQ・工程の説明・導入前 も開いた状態で）
//  3. ヒーローの見出し・リード・3つの特徴・ボタン・注記が重ならない。注記が背景の大きな英字に重ならない
//  4. 紺のカード（COANA TOKYO チーム）の説明が白い（濃い色にすると読めない）
//  5. 見出しの最後の行が1文字だけにならない
//  6. 関連するコラムが4本以上並ばない
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:4173';
const dir = path.join(__dirname, '../../content/solutions');
const PAGES = (process.env.ONLY ? process.env.ONLY.split(',') : fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => '/services/' + f.replace('.json', '')).concat(['/', '/services', '/about', '/topics', '/contact']));
const WIDTHS = (process.env.W || '320,360,390,430,768,966,1024,1280,1440,1920').split(',').map(Number);

(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  let ng = 0;
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, reducedMotion: 'reduce', hasTouch: w < 800 });
    const p = await ctx.newPage();
    for (const u of PAGES) {
      await p.goto(BASE + u, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('main');
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(() => {
        document.querySelectorAll('details.lp-scope').forEach((d) => { d.open = true; });
        document.querySelectorAll('.faq-q[aria-expanded="false"]').forEach((q) => q.click());
        const l = document.querySelector('button.lanes-card'); if (l) l.click();
      });
      await p.waitForTimeout(600);
      const scan = () => p.evaluate(() => {
        const out = [];
        const vw = document.documentElement.clientWidth;
        const main = document.querySelector('main');
        if (document.documentElement.scrollWidth > vw + 1) out.push('横スクロール');
        for (const e of main.querySelectorAll('*')) {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (e.closest('[aria-hidden="true"], .visually-hidden, svg, .seo-fallback, .lanes-handoff, .sky-hero, .filter-row')) continue;
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const id = e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' 「' + e.textContent.trim().slice(0, 16) + '」';
          const fsz = parseFloat(cs.fontSize);
          if (fsz < 12) out.push('12px 未満の文字 ' + fsz + 'px ' + id);
          if ((r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') out.push('画面からはみ出し ' + id);
          const box = e.closest('.lp-plan, .lp-case, .lp-scope-card, .lp-ba-grid li, .lp-tools li, .relay-card, .lanes-card, .lp-hero-facts');
          if (box && box !== e) { const br = box.getBoundingClientRect(); if (r.right > br.right + 2 || r.left < br.left - 2) out.push('カードからはみ出し ' + id); }
        }
        const vis = (s) => [...document.querySelectorAll(s)].filter((e) => getComputedStyle(e).display !== 'none');
        const hs = vis('.lp-hero-title, .lp-hero-lead, .lp-hero-facts, .lp-hero-actions, .lp-hero-note, .lp-hero-kicker, .sky-crumbs').map((e) => [e.className, e.getBoundingClientRect()]);
        for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
          const a = hs[i][1], c = hs[j][1];
          if (a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) out.push('ヒーローの重なり ' + hs[i][0] + ' × ' + hs[j][0]);
        }
        const big = vis('.lp-hero-big')[0];
        if (big) {
          const f = parseFloat(getComputedStyle(big).fontSize);
          const top = big.getBoundingClientRect().bottom - f * 0.2 - f * 0.74; // 英字の上端（おおよそ）
          let low = 0;
          for (const e of vis('.lp-hero-note, .lp-hero-english, .lp-hero-actions, .lp-hero-facts')) low = Math.max(low, e.getBoundingClientRect().bottom);
          if (top - low < 4) out.push('ヒーローの注記が背景の大きな英字に重なる（' + Math.round(top - low) + 'px）');
        }
        // 紺の地（トップ「状況から探す」）の説明文が暗い色になっていないか
        const dark = document.querySelector('.sky-dark .num-head-side p');
        if (dark) { const m = getComputedStyle(dark).color.match(/[\d.]+/g).map(Number); if (m[0] < 200) out.push('紺の地の説明文が暗い ' + getComputedStyle(dark).color); }
        // ヒーローの3項目：横に並んでいるのに上の線、縦に並んでいるのに左の線、になっていないか
        const facts = vis('.lp-hero-facts li');
        if (facts.length > 1) {
          const row = Math.abs(facts[0].getBoundingClientRect().top - facts[1].getBoundingClientRect().top) < 4;
          const c = getComputedStyle(facts[1]);
          if (row && parseFloat(c.borderTopWidth) > 0) out.push('ヒーローの3項目：横並びなのに上に区切り線');
          if (!row && parseFloat(c.borderLeftWidth) > 0) out.push('ヒーローの3項目：縦並びなのに左に区切り線');
        }
        // リード文が英字の社名（COANA TOKYO）の途中で折れていないか
        for (const lead of vis('.section-title .section-lead')) {
          const tw = document.createTreeWalker(lead, NodeFilter.SHOW_TEXT); let n;
          while ((n = tw.nextNode())) { const i = n.textContent.indexOf('COANA TOKYO'); if (i < 0) continue; const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 11); if (rg.getClientRects().length > 1) out.push('リード文が社名の途中で折れる 「' + lead.textContent.slice(0, 18) + '」'); }
        }
        const sub = document.querySelector('.relay-center .relay-sub');
        if (sub && getComputedStyle(sub).color !== 'rgb(255, 255, 255)') out.push('紺のカードの説明が白くない ' + getComputedStyle(sub).color);
        for (const h of main.querySelectorAll('h1, h2, h3')) {
          const rg = document.createRange(); rg.selectNodeContents(h);
          const rects = [...rg.getClientRects()].filter((r) => r.width > 0);
          if (rects.length < 2) continue;
          const f = parseFloat(getComputedStyle(h).fontSize), last = rects[rects.length - 1], prev = rects[rects.length - 2];
          if (last.width < f * 1.3 && Math.abs(last.top - prev.top) > f * 0.5) out.push('見出しの最後の行が1文字 「' + h.textContent.slice(0, 20) + '」');
        }
        const rows = document.querySelectorAll('.solution-more .article-row').length;
        if (rows > 3) out.push('関連するコラムが ' + rows + ' 本（3本まで）');
        return [...new Set(out)];
      });
      let r = await scan();
      // 導入前の表示でも確かめる
      if (await p.$('.lp-ba-toggle')) { await p.evaluate(() => document.querySelector('.lp-ba-toggle').click()); await p.waitForTimeout(700); r = [...new Set([...r, ...(await scan())])]; }
      if (r.length) { ng += r.length; console.log(`NG ${w} ${u}\n   ` + r.slice(0, 15).join('\n   ')); }
    }
    await ctx.close();
  }
  await b.close();
  console.log(ng ? `NG ${ng} 件` : `ALL OK（${PAGES.length} ページ × ${WIDTHS.length} 幅）`);
  process.exit(ng ? 1 : 0);
})();
