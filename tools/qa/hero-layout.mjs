// トップのヒーローの崩れ（重なり・真ん中の空き・横はみ出し）を、実際のブラウザで測って見つける。
//
//   node tools/qa/hero-layout.mjs --base https://coana.co.jp [--merge prod.json] [--full] [--css 追加CSS]
//
// 2026-11-04 オーナー指摘：
//   ① 「ヒーローの真ん中が空いてしまう」：画面の高さが低いと大きな動詞（整える。つくる。任せる。）が小さくなるのに、
//      列の幅はそのままで、動詞と右のカードの間が 400〜600px 空いていた。
//   ② 「文字と白い枠（カード）が重なっている」：高さ800〜860px の画面で、中央に寄せたカードが下のリード文に重なっていた。
//   「どのレスポンシブでも絶対に問題が起きないように」とのことなので、スマホから 2560px まで、幅×高さの組み合わせで
//   ヒーローの要素どうしの重なりをすべて測る。
//   - 文字の要素（見出し・英字の一文・動詞・リード文・チェック項目）とカード・ボタン・下の帯が、互いに重ならない
//   - PC（幅1101px以上。固定する・しないとも）では、動詞の文字の右端とカードの左端の間が HERO_MAX_GAP 以下
//   - ページが横にはみ出さない
// 毎日の監視（--merge）は代表的な画面サイズだけ。--full は全組み合わせ（直したとき・公開前に使う）。
// --merge を付けると、NG を「SEO の監視」の prod.json の errors に足す（Issue の作成・解消は tools/seo/notify.mjs に任せる）。
// Playwright が使えないときは、何もせずに終わる（監視そのものは止めない）。
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const BASE = String(opt('base') || 'https://coana.co.jp').replace(/\/$/, '');
const MERGE = opt('merge');
const FULL = !!opt('full');
const EXTRA_CSS = opt('css') ? fs.readFileSync(opt('css'), 'utf8') : '';
const HERO_MAX_GAP = 160; // px。直したあとは 44〜112px
const TOL = 3; // px。これ以下の重なりは見た目に出ない

const FULL_WIDTHS = [320, 360, 375, 390, 414, 430, 600, 700, 768, 820, 900, 1024, 1100, 1101, 1180, 1280, 1366, 1440, 1470, 1512, 1536, 1600, 1680, 1728, 1920, 2240, 2560];
const FULL_HEIGHTS = [568, 667, 699, 700, 720, 745, 760, 768, 800, 831, 860, 880, 899, 900, 1000, 1080, 1300];
const DAILY = [
  [375, 667], [390, 844], [768, 1024], [1024, 768], [1101, 700], [1280, 720], [1366, 768], [1440, 800], [1470, 745],
  [1512, 831], [1536, 864], [1680, 700], [1728, 1000], [1920, 850], [1920, 1080], [2560, 1300],
];

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.log('hero-layout: Playwright がないので点検しない');
  process.exit(0);
}

// ブラウザの中で測る
function measure({ maxGap, tol: TOL_ }) {
  const tolBase = TOL_;
  const R = (r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom });
  const textRect = (el) => {
    if (!el) return null;
    const range = document.createRange();
    let box = null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const p = n.parentElement;
      if (p.closest('[aria-hidden="true"]:not(.sky-hero *)') || getComputedStyle(p).visibility === 'hidden') continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        box = box ? { l: Math.min(box.l, r.left), r: Math.max(box.r, r.right), t: Math.min(box.t, r.top), b: Math.max(box.b, r.bottom) } : R(r);
      }
    }
    return box;
  };
  const q = (s) => document.querySelector(s);
  const verbsText = (() => {
    // 縦書きの小さなラベル（small）は除き、動詞の文字だけ
    let box = null;
    const range = document.createRange();
    for (const v of document.querySelectorAll('.sky-verb')) for (const n of v.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      range.selectNodeContents(n);
      const r = R(range.getBoundingClientRect());
      box = box ? { l: Math.min(box.l, r.l), r: Math.max(box.r, r.r), t: Math.min(box.t, r.t), b: Math.max(box.b, r.b) } : r;
    }
    return box;
  })();
  const items = {
    見出し: textRect(q('.sky-hero-title')),
    英字の一文: textRect(q('.sky-kicker')),
    動詞: verbsText,
    カード: q('.sky-card') && R(q('.sky-card').getBoundingClientRect()),
    リード文: textRect(q('.hero-lead')),
    チェック項目: textRect(q('.sky-chk')),
    ボタン: q('.sky-hero-bottom .button-row') && R(q('.sky-hero-bottom .button-row').getBoundingClientRect()),
    下の帯: q('.sky-tape-wrap') && R(q('.sky-tape') ? q('.sky-tape').getBoundingClientRect() : q('.sky-tape-wrap').getBoundingClientRect()),
  };
  const problems = [];
  if (Object.values(items).slice(0, 7).some((v) => !v)) problems.push('ヒーローの要素が見つからない：' + Object.keys(items).filter((k) => !items[k]).join('・'));
  const names = Object.keys(items).filter((k) => items[k]);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = items[names[i]], b = items[names[j]];
    // 下の帯は斜めで、ボタンの下に少しかかる作り。帯は文字の要素とボタンの文字に重ならなければよい
    const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    const t = names[j] === '下の帯' ? 12 : tolBase;
    if (ix > t && iy > t) problems.push(`${names[i]}と${names[j]}が重なっている（${Math.round(ix)}×${Math.round(iy)}px）`);
  }
  const pin = !!q('.sky-hero-pin.is-pin');
  let gap = null;
  // 固定するとき（PC・高さ900px以上）も、固定しない PC（幅1101px以上）も、言葉とカードの間が空きすぎないこと（2026-11-04 オーナー指摘）
  if ((pin || innerWidth >= 1101) && items.カード && items.動詞) {
    gap = Math.round(items.カード.l - items.動詞.r);
    if (gap > maxGap) problems.push(`ヒーローの真ん中が空いている（動詞とカードの間 ${gap}px。${maxGap}px 以下にする）`);
  }
  const sw = document.documentElement.scrollWidth;
  if (sw > innerWidth + 1) problems.push(`ページが横にはみ出している（${sw}px／画面 ${innerWidth}px）`);
  return { pin, gap, problems };
}

const sizes = FULL ? FULL_WIDTHS.flatMap((w) => FULL_HEIGHTS.map((h) => [w, h])) : DAILY;
const errors = [];
let checked = 0;
const browser = await chromium.launch();
try {
  const byWidth = new Map();
  for (const [w, h] of sizes) byWidth.set(w, [...(byWidth.get(w) || []), h]);
  for (const [w, heights] of byWidth) {
    // 幅ごとに読み込み、高さだけを変えて測る（読み込み直すより速い）。最初の高さでは入場のアニメーションを待つ
    const page = await browser.newPage({ viewport: { width: w, height: heights[0] }, reducedMotion: 'no-preference' });
    try {
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('.sky-verb', { timeout: 20000 });
      if (EXTRA_CSS) await page.addStyleTag({ content: EXTRA_CSS });
      await page.waitForTimeout(2500); // 入場のアニメーション（約1.6秒）
      for (const h of heights) {
        await page.setViewportSize({ width: w, height: h });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(350);
        const m = await page.evaluate(measure, { maxGap: HERO_MAX_GAP, tol: TOL });
        checked++;
        const where = `/ ${w}x${h}`;
        for (const msg of m.problems) errors.push({ kind: 'hero-layout', where, msg });
        if (!FULL || m.problems.length) console.log(`${where}${m.pin ? '（固定）' : ''}: ${m.gap === null ? '' : `間 ${m.gap}px `}${m.problems.length ? 'NG ' + m.problems.join('／') : 'OK'}`);
      }
    } catch (e) {
      errors.push({ kind: 'hero-layout', where: `/ ${w}x?`, msg: `測れなかった（${e.message.split('\n')[0]}）` });
      console.log(`/ ${w}: 測れなかった（${e.message.split('\n')[0]}）`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (MERGE && fs.existsSync(MERGE)) {
  const prod = JSON.parse(fs.readFileSync(MERGE, 'utf8'));
  prod.errors = [...(prod.errors || []), ...errors];
  fs.writeFileSync(MERGE, JSON.stringify(prod, null, 2));
}
console.log(errors.length ? `hero-layout: NG ${errors.length} 件（${checked} 通りを点検）` : `hero-layout: OK（${checked} 通りを点検）`);
process.exitCode = errors.length && !MERGE ? 1 : 0;
