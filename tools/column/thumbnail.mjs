// コラムの見出し画像（1200×675 の JPG）を、既存の記事と同じ型で作る（Playwright で HTML を画像にする）。
//   node tools/column/thumbnail.mjs --file content/topics/20271019-xxx.md --line1 "1行目" --line2 "2行目" --sub "補足の一言"
//   → public/uploads/topics/<ファイル名>.jpg（front matter の thumbnail もこのパスにする）
// 文字：見出しは2行（各行 全角14字まで）、補足は1行（全角22字まで）。カテゴリーと日付は front matter から。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i < 0 ? '' : args[i + 1]; };
const file = opt('file');
const line1 = opt('line1'), line2 = opt('line2'), sub = opt('sub');
if (!file || !line1) { console.error('--file と --line1 が必要'); process.exit(2); }
const width = (s) => [...s].reduce((w, c) => w + (/[\x20-\x7e]/.test(c) ? 0.5 : 1), 0);
for (const [s, max] of [[line1, 14], [line2, 14], [sub, 22]]) if (s && width(s) > max) { console.error(`長すぎる（全角${max}字まで）：${s}`); process.exit(2); }

const raw = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const fm = (k) => (raw.match(new RegExp(`^${k}:\\s*['"]?([^'"\\n]+)`, 'm')) || [])[1] || '';
const CATEGORY = { サービス: 'SERVICE', お知らせ: 'NEWS', イベント: 'EVENT', '実績・事例': 'WORKS' };
const label = CATEGORY[fm('category')] || 'COLUMN';
const date = fm('date').replace(/-/g, '.');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'public/images/logo-color.png')).toString('base64');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:675px;overflow:hidden;position:relative;font-family:'Noto Sans JP',sans-serif;background:linear-gradient(160deg,#f5f8fd 0%,#eef4fb 55%,#e9f1fb 100%)}
.c{position:absolute;border-radius:50%}
.c1{width:420px;height:420px;left:840px;top:-110px;background:#cfe6f6}
.c2{width:330px;height:330px;left:930px;top:455px;background:#ffeeb0}
.c3{width:230px;height:230px;left:10px;top:565px;background:#f7fbfe}
.logo{position:absolute;left:78px;top:66px;height:50px}
.meta{position:absolute;left:80px;top:178px;font-weight:700;font-size:21px;letter-spacing:.06em;color:#087fe5}
.meta i{font-style:normal;color:#b6c8d6;margin:0 14px}
.title{position:absolute;left:72px;top:236px;font-weight:900;font-size:49px;line-height:1;color:#16334d;letter-spacing:.01em}
.title span{display:inline-block;padding:6px 10px 4px;background:linear-gradient(transparent 52%,#ffd85a 52%);margin-bottom:25px}
.sub{position:absolute;left:82px;top:478px;font-weight:500;font-size:23px;color:#4a667d}
</style></head><body>
<div class="c c1"></div><div class="c c2"></div><div class="c c3"></div>
<img class="logo" src="${logo}">
<div class="meta">${label}<i>|</i>${date}</div>
<div class="title"><span>${esc(line1)}</span>${line2 ? `<br><span>${esc(line2)}</span>` : ''}</div>
${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
</body></html>`;

const out = path.join(ROOT, 'public/uploads/topics', path.basename(file).replace(/\.md$/, '.jpg'));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const overflow = await page.evaluate(() => [...document.querySelectorAll('.title span,.sub')].some((e) => e.getBoundingClientRect().right > 830));
await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
await browser.close();
if (overflow) { console.error('文字が右の円にかかる。言葉を短くする'); process.exit(1); }
console.log(`書き出し: ${path.relative(ROOT, out)}（front matter の thumbnail: /uploads/topics/${path.basename(out)}）`);
