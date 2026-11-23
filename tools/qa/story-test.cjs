// 【週次の合格ライン（tools/seo/run-tests.sh）に入っている。2026-11-07 オーナー判断】仕組みの図：全LPで、図の工程がすべて表示され、静止していること（鳩のアニメーションは 2026-10-26 にオーナー指示で廃止）。
// 2026-11-22 の LP の作り直し（#132〜）で図の作りが変わったため、2026-11-23 に今の図（一本の流れ .lpx-steps／2つの段 .lpx-lanes-wrap／リレー .lpx-relay）に合わせた
// （以前の図のクラスのままだと、全 LP が「図なし（対象外）」になり、何も確かめていなかった）。
// 確かめること：content の scheme.nodes がある LP では図があり、工程の数が content と同じ・すべて見えている・時間がたっても変わらない（動かない）・鳩なし・
//   動きを減らす設定では画面に入る前から完成形・CLS・エラー。PC・スマホ・動きを減らす設定の3通り。
// 対象の LP は content/solutions から自動で読む（LP を足す・廃止するたびに書き換えなくてよい）。scheme.nodes がない LP だけ「図なし（対象外）」。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://localhost:4173';
const DIR = path.join(__dirname, '../../content/solutions');
const SLUGS = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  .filter((s) => !process.env.ONLY || process.env.ONLY.split(',').includes(s));
const expected = (slug) => (JSON.parse(fs.readFileSync(path.join(DIR, slug + '.json'), 'utf8')).scheme?.nodes ?? []).length;
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
const ROOT = '.lpx-steps, .lpx-lanes-wrap, .lpx-relay';
const NODE = '.lpx-steps > li, .lpx-lane-node, .lpx-relay-areas > li';
const snap = (p) => p.evaluate(({ R, N }) => {
  const root = document.querySelector(R); if (!root) return null;
  const vis = (e) => { if (!e.getBoundingClientRect().height) return false; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.9) return false; } return true; };
  const nodes = [...root.querySelectorAll(N)];
  const doves = [...document.querySelectorAll('#lp-scheme .dove')].filter((c) => +getComputedStyle(c).opacity > 0.05).length;
  const sig = nodes.map((e) => { const cs = getComputedStyle(e); return `${e.getAttribute('class')}:${cs.opacity}:${cs.transform}`; }).join('|');
  return { nodes: nodes.length, visible: nodes.filter(vis).length, doves, sig };
}, { R: ROOT, N: NODE });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [dev, vp, reduced] of [['PC', { width: 1280, height: 900 }], ['スマホ', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['動きを減らす', { width: 1280, height: 900 }, true]]) {
    const { isMobile, hasTouch, ...viewport } = vp;
    for (const slug of SLUGS) {
      const want = expected(slug);
      const ctx = await b.newContext({ viewport, isMobile, hasTouch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await p.goto(`${BASE}/services/${slug}`, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await p.mouse.move(1, 1);
      const has = await p.locator(ROOT).count();
      if (!want) { ok(`${dev} ${slug} 仕組みの図なし（content に scheme.nodes がない・対象外）`, !has); await ctx.close(); continue; }
      if (!has) { ok(`${dev} ${slug} 仕組みの図がある（content の工程 ${want}）`, false, '図が見つからない'); await ctx.close(); continue; }
      // 動きを減らす設定では、画面に入る前から完成形
      if (reduced) { const before = await snap(p); ok(`${dev} ${slug} 画面に入る前から全工程が表示`, before.nodes === want && before.visible === want && before.doves === 0, JSON.stringify({ ...before, sig: undefined })); }
      await p.evaluate((R) => { const e = document.querySelector(R); scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }, ROOT);
      await p.waitForTimeout(1500); const s1 = await snap(p); await p.waitForTimeout(3000); const s2 = await snap(p);
      ok(`${dev} ${slug} 工程の数が content と同じ・すべて表示・鳩なし`, s1.nodes === want && s1.visible === want && s1.doves === 0, `${s1.visible}/${s1.nodes}（content ${want}）`);
      ok(`${dev} ${slug} 時間がたっても変わらない（静止）`, s1.sig === s2.sig && s2.doves === 0, '');
      ok(`${dev} ${slug} レイアウトのずれなし（CLS）`, (await p.evaluate(() => window.__cls)) < 0.02, (await p.evaluate(() => window.__cls)).toFixed(4));
      ok(`${dev} ${slug} エラーなし`, errs.length === 0, errs.join(' / '));
      await ctx.close();
    }
  }
  await b.close();
  console.log(out.filter((l) => l.startsWith('NG')).join('\n') || ''); console.log(`${out.filter((l) => l.startsWith('OK')).length} OK / ${out.filter((l) => l.startsWith('NG')).length} NG`);
})();
