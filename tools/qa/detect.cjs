// 不自然な改行の検出：各ブロック要素の実際の改行位置を取り、BudouX の文節境界と比べる
//  - 文節の途中での改行（例「クラウ/ド」「会/計」）
//  - 最終行が1〜2文字だけ（句読点を除く）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { loadDefaultJapaneseParser } = require('../../node_modules/budoux');
const parser = loadDefaultJapaneseParser();
const [,, tag, mode] = process.argv;
const BASE = process.env.BASE || 'http://localhost:4173';
const pages = [['home','/'],['about','/about'],['services','/services'],['contact','/contact'],['privacy','/privacy'],['topics','/topics'],
  ...['bookkeeping','cloud-accounting','backoffice-dx','startup-support','startup-support-en','sales-support','seminar-event','sns-management','web-production'].map(s => [s, '/services/' + s])];
const widths = (process.env.W || '375,390,414,768,1280').split(',').map(Number);
const JA = /[぀-ヿ㐀-鿿＀-￯]/;
const PUNCT = /^[、。，．・！？：；）」』】〕〉》"'.,!?:;)\]\s　]*$/;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const issues = [];
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    for (const [n, u] of pages) {
      await p.goto(BASE + u, { waitUntil: 'networkidle' });
      if (mode === 'safari') await p.addStyleTag({ content: '*{word-break:normal!important}' });
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
      const blocks = await p.evaluate(() => {
        const JA = /[぀-ヿ㐀-鿿]/;
        const isInline = (el) => /^inline/.test(getComputedStyle(el).display) && el.tagName !== 'BR';
        const out = [];
        const all = [...document.querySelectorAll('main *, header *, footer *')].filter(el => !(el instanceof SVGElement) && !el.closest('svg, .seo-fallback, .article-body, .privacy-body, [aria-hidden="true"], .solve-word:not(.is-active)'));
        for (const el of all) {
          if (isInline(el)) continue;
          // 直下（インライン子孫まで）のテキストだけを対象。ブロック子要素は別に扱う
          const texts = [];
          const walk = (node) => { for (const c of node.childNodes) { if (c.nodeType === 3) texts.push(c); else if (c.nodeType === 1 && c.tagName === 'BR') texts.push(document.createTextNode('\n')); else if (c.nodeType === 1 && isInline(c) && !(c instanceof SVGElement)) walk(c); } };
          walk(el);
          const full = texts.map(t => t.data).join('');
          if (!JA.test(full) || full.trim().length < 3) continue;
          const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
          let s = '', lineStarts = [], prevTop = null, idx = 0;
          for (const t of texts) {
            for (let i = 0; i < t.data.length; i++) {
              const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1);
              const rects = range.getClientRects();
              const ch = t.data[i];
              if (rects.length && ch.trim()) {
                const top = rects[0].top;
                if (prevTop !== null && top > prevTop + rects[0].height * 0.5) lineStarts.push(s.length);
                prevTop = top;
              }
              s += ch;
            }
          }
          const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
          out.push({ name, text: s.replace(/\s+/g, ' '), raw: s, lineStarts });
        }
        return out;
      });
      for (const blk of blocks) {
        if (!blk.lineStarts.length) continue;
        const raw = blk.raw;
        // 文節境界（BudouX）。空白・改行の位置も境界とみなす
        const bounds = new Set([0]); let acc = 0;
        for (const seg of raw.split(/(\s+)/)) { if (!seg) continue; if (/^\s+$/.test(seg)) { acc += seg.length; bounds.add(acc); continue; } let a2 = acc; for (const ph of parser.parse(seg).flatMap((x) => (x.length >= 8 ? x.split(/(?<=[\u30a0-\u30ffー])(?=[\u4e00-\u9fff])|(?<=問い合わせ)(?=[\u4e00-\u9fff])/g) : [x]))) { a2 += ph.length; bounds.add(a2); } bounds.add(acc); acc += seg.length; }
        for (const st of blk.lineStarts) {
          // 改行直前・直後が英数字同士（英単語の途中）は英語の改行ルールに任せる
          if (bounds.has(st)) continue;
          // 自然な改行位置：「・」や閉じかっこ・句読点の後、開きかっこの前、<br> の直後
          if (/[・」』）】〕〉》、。，．：！？｜→＋\n]/.test(raw[st - 1] || '') || /[「『（【〔〈《\n]/.test(raw[st] || '')) continue;
          if (raw.slice(0, st).endsWith('\n')) continue;
          const before = raw.slice(Math.max(0, st - 6), st), after = raw.slice(st, st + 6);
          if (!JA.test(raw[st - 1] || '') && !JA.test(raw[st] || '')) continue;
          issues.push({ w, page: n, kind: '文節の途中', el: blk.name, at: before + '｜' + after });
        }
        const last = raw.slice(blk.lineStarts[blk.lineStarts.length - 1]).trim();
        const core = last.replace(/[、。，．・！？：；）」』】"'.,!?:;)\]\s　]/g, '');
        if (core.length <= 2 && JA.test(last)) issues.push({ w, page: n, kind: '最終行が短い', el: blk.name, at: '…' + raw.slice(Math.max(0, blk.lineStarts[blk.lineStarts.length - 1] - 8)).trim() });
      }
    }
    await ctx.close();
  }
  await b.close();
  require('fs').writeFileSync(`${__dirname}/issues-${tag}.json`, JSON.stringify(issues, null, 1));
  const by = {}; for (const i of issues) { const k = i.kind; by[k] = (by[k] || 0) + 1; }
  console.log(tag, 'total', issues.length, JSON.stringify(by));
  const byW = {}; for (const i of issues) byW[i.w] = (byW[i.w] || 0) + 1; console.log('by width', JSON.stringify(byW));
})();
