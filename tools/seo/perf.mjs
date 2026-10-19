// 表示速度・Core Web Vitals の計測（モバイル）。依存なし（Lighthouse は npx で取得）。
//
//   node tools/seo/perf.mjs --base https://coana.co.jp --out perf.json
//   LH_BIN=/path/to/lighthouse CHROME_PATH=… node tools/seo/perf.mjs --base http://localhost:4173 --no-psi
//
// 1. Lighthouse（実験室データ・モバイル）：主なページの Performance／Accessibility／Best Practices／SEO と LCP・CLS・TBT・FCP。
//    各ページ2回測って良い方（回線のゆらぎを減らす）。
// 2. PageSpeed Insights API（無料）：実際の利用者のデータ（Chrome UX Report の p75：LCP・INP・CLS）。
//    キーなしは Google 側の共有枠を使うため 429（上限）になりやすい。無料の API キーを PSI_API_KEY に入れると安定する（課金は不要）。
//    取れなかったときは理由を記録して、Lighthouse の値だけで続ける。
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const BASE = String(opt('base', 'https://coana.co.jp')).replace(/\/$/, '');
const OUT = opt('out', null);
const PAGES = String(opt('pages', '/,/services,/services/bookkeeping,/services/backoffice-dx,/services/startup-support,/about,/topics,/contact')).split(',');
const RUNS = Number(opt('runs', 2));
const NO_PSI = !!opt('no-psi', false);

const result = { base: BASE, at: new Date().toISOString(), lighthouse: {}, psi: {}, notes: [] };

function lighthouse(url) {
  const tmp = path.join(os.tmpdir(), `lh-${Date.now()}.json`);
  const bin = process.env.LH_BIN;
  const lhArgs = [url, '--output=json', `--output-path=${tmp}`, '--quiet', '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox --disable-gpu'];
  const [cmd, cmdArgs] = bin ? [bin, lhArgs] : ['npx', ['-y', 'lighthouse@12.8.2', ...lhArgs]];
  execFileSync(cmd, cmdArgs, { stdio: ['ignore', 'ignore', 'pipe'], timeout: 180000 });
  const j = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  const a = j.audits, c = j.categories;
  const score = (k) => (c[k]?.score == null ? null : Math.round(c[k].score * 100));
  return {
    performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
    lcpMs: Math.round(a['largest-contentful-paint']?.numericValue ?? 0), cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    tbtMs: Math.round(a['total-blocking-time']?.numericValue ?? 0), fcpMs: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
    failedSeoAudits: Object.values(c.seo?.auditRefs ?? []).map((r) => a[r.id]).filter((x) => x && x.score === 0 && x.scoreDisplayMode === 'binary').map((x) => x.id),
    failedA11yAudits: Object.values(c.accessibility?.auditRefs ?? []).map((r) => a[r.id]).filter((x) => x && x.score === 0 && x.scoreDisplayMode === 'binary').map((x) => x.id),
  };
}

for (const p of PAGES) {
  const url = BASE + p;
  let best = null;
  for (let i = 0; i < RUNS; i++) {
    try { const r = lighthouse(url); if (!best || (r.performance ?? 0) > (best.performance ?? 0)) best = r; }
    catch (e) { result.notes.push(`Lighthouse ${p}: ${String(e.stderr || e.message).slice(0, 200)}`); }
  }
  if (best) result.lighthouse[p] = best;
  console.log(`LH ${p}:`, best ? `perf ${best.performance} a11y ${best.accessibility} bp ${best.bestPractices} seo ${best.seo} LCP ${best.lcpMs}ms CLS ${best.cls} TBT ${best.tbtMs}ms` : '失敗');
}

if (!NO_PSI) {
  const key = process.env.PSI_API_KEY ? `&key=${process.env.PSI_API_KEY}` : '';
  const field = (le) => le?.metrics ? {
    overall: le.overall_category ?? null,
    lcpMs: le.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    inpMs: le.metrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    cls: le.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null ? le.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
  } : null;
  for (const p of PAGES.slice(0, 4)) {
    const url = (BASE.includes('localhost') ? 'https://coana.co.jp' : BASE) + p;
    try {
      const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance${key}`, { signal: AbortSignal.timeout(120000) });
      const j = await r.json();
      if (!r.ok) { result.psi[p] = { error: `${r.status} ${j.error?.status || ''}` }; if (r.status === 429) { result.notes.push('PSI: 無料枠の上限（429）。PSI_API_KEY（無料の API キー）を設定すると安定します'); break; } continue; }
      result.psi[p] = {
        labPerformance: Math.round((j.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
        field: field(j.loadingExperience), originField: p === '/' ? field(j.originLoadingExperience) : undefined,
      };
      console.log(`PSI ${p}:`, JSON.stringify(result.psi[p]));
    } catch (e) { result.psi[p] = { error: String(e.message || e) }; }
  }
}

if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
