// スマホのチャット操作を段階ごとに撮る。キーボード表示は、表示領域（ビューポートの高さ）を縮めて再現する
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const tag = process.argv[2]; const base = process.argv[3] || 'http://localhost:8788';
const D = __dirname + '/' + tag; require('fs').mkdirSync(D, { recursive: true });
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const DEVICES = [
  ['iphone375', { ...devices['iPhone SE'] }],
  ['iphone390', { ...devices['iPhone 13'] }],
  ['iphone414', { ...devices['iPhone 11 Pro Max'] }],
  ['android375', { viewport: { width: 375, height: 760 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ANDROID_UA }],
  ['android390', { viewport: { width: 390, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ANDROID_UA }],
  ['android414', { viewport: { width: 414, height: 820 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, userAgent: ANDROID_UA }],
];
const LONG = '経理の担当者が来月退職する予定で、記帳と請求書の発行、毎月の締めまでをまとめてお願いしたいのですが、一部だけの依頼でも大丈夫でしょうか。https://example.com/very/long/url/that/should/not/break/the/layout/at/all/abcdefghijklmnopqrstuvwxyz';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const report = [];
  for (const [name, desc] of DEVICES) {
    delete desc.defaultBrowserType;
    const ctx = await b.newContext(desc); const p = await ctx.newPage();
    const { width, height } = desc.viewport;
    await p.goto(base + '/services/bookkeeping', { waitUntil: 'networkidle' });
    await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(800);
    const shot = async (step) => p.screenshot({ path: `${D}/${name}-${step}.png` });
    const metrics = async (step) => {
      const m = await p.evaluate(() => {
        const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 ? 'hidden' : { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
        const vv = window.visualViewport;
        return { vvH: Math.round(vv.height), scrollW: document.documentElement.scrollWidth, innerW: innerWidth, panel: r('.chat-panel'), input: r('#chat-input'), send: r('.chat-send'), sticky: r('.lp-sticky'), toTop: r('.back-to-top'), launcher: r('.chat-launcher'), inputFont: document.querySelector('#chat-input') ? getComputedStyle(document.querySelector('#chat-input')).fontSize : null, scrollY: Math.round(scrollY), bodyPos: getComputedStyle(document.body).position, logAtBottom: (() => { const l = document.querySelector('.chat-log'); return l ? Math.abs(l.scrollHeight - l.clientHeight - l.scrollTop) < 4 : null; })() };
      });
      report.push({ name, step, ...m });
    };
    await shot('0-page');
    await p.tap('.lp-sticky-chat'); await p.waitForSelector('.chat-panel'); await p.waitForTimeout(700);
    await shot('1-open'); await metrics('1-open');
    await p.tap('#chat-input'); await p.waitForTimeout(200);
    // キーボードが出たとき：表示領域が約 4 割減る
    await p.setViewportSize({ width, height: Math.round(height * 0.58) }); await p.waitForTimeout(400);
    await shot('2-focus-keyboard'); await metrics('2-focus-keyboard');
    await p.fill('#chat-input', LONG); await p.waitForTimeout(300);
    await shot('3-typed'); await metrics('3-typed');
    await p.tap('.chat-send'); await p.waitForFunction(() => !document.querySelector('.chat-typing'), null, { timeout: 25000 }); await p.waitForTimeout(600);
    await p.waitForTimeout(500); await shot('4-answer-keyboard'); await metrics('4-answer-keyboard');
    await p.setViewportSize({ width, height }); await p.waitForTimeout(400);
    await shot('5-answer'); await metrics('5-answer');
    await p.tap('.chat-restart'); await p.waitForTimeout(300); await p.tap('.chat-menu-diag'); await p.waitForTimeout(300);
    for (const n of [1, 1, 0, 1]) { await p.tap('.chat-option >> nth=' + n); await p.waitForTimeout(200); }
    await p.tap('.chat-option >> nth=1'); await p.waitForTimeout(600);
    await shot('6-diagnosis'); await metrics('6-diagnosis');
    await p.tap('.chat-close'); await p.waitForTimeout(500);
    await shot('7-closed'); await metrics('7-closed');
    await ctx.close();
  }
  require('fs').writeFileSync(D + '/report.json', JSON.stringify(report, null, 1));
  for (const r of report) console.log(r.name, r.step, 'vv' + r.vvH, 'scrollW' + r.scrollW + '/' + r.innerW, 'panel', JSON.stringify(r.panel), 'input', JSON.stringify(r.input), 'font', r.inputFont, 'sticky', JSON.stringify(r.sticky), 'top', JSON.stringify(r.toTop), 'y', r.scrollY, r.bodyPos, 'logBottom', r.logAtBottom);
  await b.close();
})();
