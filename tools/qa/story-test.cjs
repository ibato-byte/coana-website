// 【週次の合格ライン（tools/seo/run-tests.sh）に入っている。2026-11-07 オーナー判断】仕組みの図（HOW IT WORKS）：全LPで、全工程が点灯した完成形で静止していること（鳩のアニメーションは 2026-10-26 にオーナー指示で廃止）。
// 確かめること：図がある・全工程が点灯（進行中なし）・鳩なし・時間がたっても変わらない（動かない）・動きを減らす設定でも同じ・CLS・エラー。
// 対象の LP は content/solutions から自動で読む（LP を足す・廃止するたびに書き換えなくてよい）。図のない LP は「図なし」として記録するだけ。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://localhost:4173';
const SLUGS = fs.readdirSync(path.join(__dirname, '../../content/solutions')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  .filter((s) => !process.env.ONLY || process.env.ONLY.split(',').includes(s));
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const ROOT = '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap, .relay';
const snap = (p) => p.evaluate((R) => {
  const root = document.querySelector(R); if (!root) return null;
  // 工程のキーで数える（中心型の図は、PC の図とスマホのリストに同じ工程が2つある）
  const keys = (sel) => new Set([...root.querySelectorAll(sel)].map((e) => e.getAttribute('data-story') || e.querySelector('[data-story]')?.getAttribute('data-story')));
  const all = new Set([...root.querySelectorAll('[data-story]')].map((e) => e.getAttribute('data-story')));
  const doves = [...root.querySelectorAll('.dove')].filter((c) => +getComputedStyle(c).opacity > 0.05).length;
  const sig = [...root.querySelectorAll('[data-story]')].map((e) => e.getAttribute('class')).join('|');
  return { all: all.size, done: keys('.is-done').size, now: keys('.is-now').size, doves, sig };
}, ROOT);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [dev, vp, reduced] of [['PC', { width: 1280, height: 900 }], ['スマホ', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['動きを減らす', { width: 1280, height: 900 }, true]]) {
    const { isMobile, hasTouch, ...viewport } = vp;
    for (const slug of SLUGS) {
      const ctx = await b.newContext({ viewport, isMobile, hasTouch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await p.goto(`${BASE}/services/${slug}`, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await p.mouse.move(1, 1);
      if (!(await p.locator(ROOT).count())) { ok(`${dev} ${slug} 仕組みの図なし（対象外）`, true); await ctx.close(); continue; }
      // 画面に入る前から完成形
      const before = await snap(p);
      ok(`${dev} ${slug} 画面に入る前から全工程が点灯・鳩なし`, before.done === before.all && before.now === 0 && before.doves === 0, JSON.stringify({ ...before, sig: undefined }));
      await p.evaluate((R) => { const e = document.querySelector(R); scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }, ROOT);
      await p.waitForTimeout(1500); const s1 = await snap(p); await p.waitForTimeout(3000); const s2 = await snap(p);
      ok(`${dev} ${slug} 画面内でも全工程が点灯・鳩なし`, s1.done === s1.all && s1.now === 0 && s1.doves === 0, `${s1.done}/${s1.all}`);
      ok(`${dev} ${slug} 時間がたっても変わらない（静止）`, s1.sig === s2.sig && s2.doves === 0, '');
      ok(`${dev} ${slug} レイアウトのずれなし（CLS）`, (await p.evaluate(() => window.__cls)) < 0.02, (await p.evaluate(() => window.__cls)).toFixed(4));
      ok(`${dev} ${slug} エラーなし`, errs.length === 0, errs.join(' / '));
      await ctx.close();
    }
  }
  await b.close();
  console.log(out.filter((l) => l.startsWith('NG')).join('\n') || ''); console.log(`${out.filter((l) => l.startsWith('OK')).length} OK / ${out.filter((l) => l.startsWith('NG')).length} NG`);
})();
