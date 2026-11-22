// 検査のとき、Google Fonts（Noto Sans JP・Outfit・IBM Plex Mono）を、ローカルに入れた同じ書体で代わりに読み込ませる（Playwright）。
//
// なぜ：クラウドの作業環境からは fonts.googleapis.com に接続できず、代わりの書体で表示される。
// 太さ 900 の見出しなどは書体が違うと幅が変わり、「作業環境では折れないのに本番では折れる」が起こりうる。
// @fontsource の書体は Google Fonts と同じもの（npm から入るので、作業環境でも取得できる）。
//
// 準備（サイトの依存には入れない。検査をする場所に入れる）：
//   mkdir -p /tmp/qa-fonts && cd /tmp/qa-fonts && npm init -y && npm i @fontsource/noto-sans-jp @fontsource/outfit @fontsource/ibm-plex-mono
//   export FONTSOURCE_DIR=/tmp/qa-fonts/node_modules/@fontsource
// 使い方：
//   const { useLocalFonts, settleFonts } = require('./fonts.cjs');
//   const ctx = await browser.newContext(...); await useLocalFonts(ctx);   // 入っていなければ何もしない（false を返す）
//   await page.goto(...); await settleFonts(page);
const fs = require('fs');
const path = require('path');

const ROOT = process.env.FONTSOURCE_DIR || '';
let cached = null;

function css() {
  if (cached) return cached;
  const parts = [];
  const add = (pkg, weights) => {
    for (const w of weights) {
      const f = path.join(ROOT, pkg, w + '.css');
      if (fs.existsSync(f)) parts.push(fs.readFileSync(f, 'utf8').replace(/url\(\.\/files\//g, `url(https://fonts.gstatic.com/__local/${pkg}/files/`));
    }
  };
  // index.html の <link> と同じ書体・太さ
  add('noto-sans-jp', [400, 500, 700, 900]);
  add('outfit', [400, 500, 600, 700, 800, 900]);
  add('ibm-plex-mono', [500]);
  return (cached = parts.join('\n'));
}

/** ローカルの書体が使えるか（FONTSOURCE_DIR に @fontsource が入っているか） */
const available = () => !!ROOT && fs.existsSync(path.join(ROOT, 'noto-sans-jp', '400.css'));

/** Google Fonts への読み込みを、ローカルの書体に差し替える。使えたら true */
async function useLocalFonts(ctx) {
  if (!available()) return false;
  const body = css();
  await ctx.route(/^https:\/\/fonts\.googleapis\.com\//, (r) => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body, headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route(/^https:\/\/fonts\.gstatic\.com\/__local\//, (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.replace('/__local/', ''));
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: f.endsWith('.woff2') ? 'font/woff2' : 'font/woff', body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*' } });
  });
  // 計測タグなど、作業環境から届かない外部は静かに止める（待ち時間とコンソールのエラーを減らす）
  await ctx.route(/^https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com|accounts\.google\.com)\//, (r) => r.abort());
  return true;
}

/** 書体の読み込みが落ち着くまで待つ（文字の範囲ごとに分かれたファイルは、その文字が画面に出てから読み込まれる） */
async function settleFonts(page) {
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => document.fonts.ready);
    const loading = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loading').length);
    if (!loading) return;
    await page.waitForTimeout(150);
  }
}

module.exports = { useLocalFonts, settleFonts, available };
