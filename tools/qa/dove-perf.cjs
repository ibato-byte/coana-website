// 低スペック想定の計測：CPU を 1x/4x/6x に落として、鳩のアニメーションが動いている間の
// 長いタスク（50ms 超）・メインスレッドの占有・フレーム間隔（rAF で測るだけ。サイト側は rAF を使っていない）を記録する
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const CASES = [['/services/bookkeeping', '.lanes', 1280], ['/services/backoffice-dx', '.lp-scheme-diagram', 1280], ['/services/bookkeeping', '.flowx', 1280], ['/services/bookkeeping', '.lanes', 390], ['/services/bookkeeping', '.flowx', 390]];
const SECONDS = 14;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const rate of (process.env.RATES || '1,4,6').split(',').map(Number)) {
    for (const [u, sel, w] of CASES) {
      const mob = w < 700;
      const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: process.env.BASELINE ? 'reduce' : 'no-preference' }); // BASELINE=1：アニメーションなしの比較用
      const p = await ctx.newPage();
      await p.goto(BASE + u, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); }, sel);
      await p.waitForTimeout(1200); // スクロール直後の表示処理（data-reveal など）を外す
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await cdp.send('Performance.enable');
      const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const r = await p.evaluate((sec) => new Promise((done) => {
        const longs = [];
        new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(Math.round(e.duration)); }).observe({ type: 'longtask' });
        const gaps = []; let last = performance.now(); const end = last + sec * 1000;
        const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else finish(); };
        requestAnimationFrame(tick);
        const finish = () => {
          gaps.sort((a, c) => a - c);
          const pct = (q) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))];
          const flying = document.querySelectorAll('.dove').length;
          done({ frames: gaps.length, p50: pct(0.5).toFixed(1), p95: pct(0.95).toFixed(1), max: gaps[gaps.length - 1].toFixed(0), over50: gaps.filter((g) => g > 50).length, longs, doves: flying });
        };
      }), SECONDS);
      const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const busy = ((m1.TaskDuration - m0.TaskDuration) / (m1.Timestamp - m0.Timestamp)) * 100;
      console.log(`CPU ${rate}x ${w}px ${u} ${sel}: フレーム間隔 中央 ${r.p50}ms / 95% ${r.p95}ms / 最大 ${r.max}ms・50ms超 ${r.over50} 回・長いタスク ${r.longs.length} 件${r.longs.length ? ' (' + r.longs.join(',') + 'ms)' : ''}・メインスレッド使用率 ${busy.toFixed(1)}%`);
      await ctx.close();
    }
  }
  await b.close();
})();
