// 点検結果から週次レポート（docs/seo-reports/YYYY-MM-DD.md と .json）を作る。前回のレポート（同じフォルダの最新の .json）との差分も書く。
//
//   node tools/seo/report.mjs --local local.json --prod prod.json --perf perf.json [--date 2026-10-19] [--dir docs/seo-reports]
//
// どの入力も省略できる（本番のデータが取れなかった週など）。「今回の対応」の節は、週次タスクが修正・提案のあとに書き足す。
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const read = (f) => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const DATE = opt('date', new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)); // 日本時間の日付
const DIR = opt('dir', path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../docs/seo-reports'));
const local = read(opt('local')), prod = read(opt('prod')), perf = read(opt('perf')), gsc = read(opt('gsc'));
// Lighthouse が LCP を検出できなかったページ（performance が null）は、LCP・TBT が 0 で記録される。
// 0 のまま平均や前回比に入れると「大幅に改善」に見えるので、計測できなかった値として null にそろえる
const measured = (x) => x && x.performance != null;
for (const lh of [perf?.lighthouse]) for (const x of Object.values(lh || {})) if (!measured(x)) { x.lcpMs = null; x.tbtMs = null; }

fs.mkdirSync(DIR, { recursive: true });
const prevFile = fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${DATE}.json`).sort().pop();
const prev = prevFile ? read(path.join(DIR, prevFile)) : null;

const data = { date: DATE, local, prod, perf, gsc };
fs.writeFileSync(path.join(DIR, `${DATE}.json`), JSON.stringify(data, null, 2) + '\n');

const key = (x) => `${x.kind}|${x.where.replace(/（.*$/, '')}`;
const diffList = (now = [], before = []) => {
  const b = new Set(before.map(key)), n = new Set(now.map(key));
  return { added: now.filter((x) => !b.has(key(x))), resolved: before.filter((x) => !n.has(key(x))) };
};
const line = (x) => `- [${x.kind}] ${x.where}：${x.msg}`;
const list = (xs, empty = '- なし') => (xs?.length ? xs.map(line).join('\n') : empty);
const arrow = (a, b, unit = '', lowerIsBetter = false) => {
  if (a == null) return b == null ? '—' : `${b}${unit}`;
  if (b == null) return '—';
  const d = b - a;
  if (!d) return `${b}${unit}`;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return `${b}${unit}（${d > 0 ? '+' : ''}${Number.isInteger(d) ? d : d.toFixed(3)}${good ? ' 改善' : ' 悪化'}）`;
};

const out = [];
out.push(`# SEO 週次レポート ${DATE}`, '');
out.push('自動の点検（`tools/seo`）の結果。手順と線引きは [docs/SEO_PLAYBOOK.md](../SEO_PLAYBOOK.md)。', '');
out.push('## まとめ', '');
out.push('| 点検 | 直すべきもの（NG） | 確認したいもの（注意） |', '| --- | --- | --- |');
out.push(`| ビルド成果物（ローカル） | ${local ? local.errors.length : '未実施'} | ${local ? local.warnings.length : '—'} |`);
out.push(`| 本番 coana.co.jp | ${prod ? prod.errors.length : '未取得'} | ${prod ? prod.warnings.length : '—'} |`);
if (perf?.lighthouse && Object.keys(perf.lighthouse).length) {
  const v = Object.values(perf.lighthouse);
  // 平均は計測できた値だけで出す（null を 0 として数えない）
  const avg = (k) => { const xs = v.map((x) => x[k]).filter((n) => n != null); return xs.length ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length) : null; };
  const ok = v.filter(measured).length;
  const lcp = avg('lcpMs');
  out.push('', `表示速度（モバイル・Lighthouse の平均）：Performance ${avg('performance') ?? '—'}／Accessibility ${avg('accessibility') ?? '—'}／Best Practices ${avg('bestPractices') ?? '—'}／SEO ${avg('seo') ?? '—'}、LCP ${lcp == null ? '—' : (lcp / 1000).toFixed(1) + ' 秒'}（計測：${perf.base}${ok < v.length ? `。Performance・LCP は ${v.length} ページ中 ${ok} ページの平均。残りは Lighthouse が LCP を検出できず計測できなかった` : ''}）`);
}
out.push('');

out.push(`## 前回${prev ? `（${prev.date}）` : ''}との差分`, '');
if (!prev) out.push('- 初回のため比較なし', '');
else {
  for (const [label, now, before] of [['ローカル', local, prev.local], ['本番', prod, prev.prod]]) {
    if (!now || !before) continue;
    const e = diffList(now.errors, before.errors), w = diffList(now.warnings, before.warnings);
    out.push(`### ${label}`, '', `- 新しく出た NG：${e.added.length} 件、解消した NG：${e.resolved.length} 件`, `- 新しく出た注意：${w.added.length} 件、解消した注意：${w.resolved.length} 件`);
    if (e.added.length) out.push('', '新しく出た NG：', list(e.added));
    if (e.resolved.length) out.push('', '解消した NG：', list(e.resolved));
    if (w.added.length) out.push('', '新しく出た注意：', list(w.added));
    if (w.resolved.length) out.push('', '解消した注意：', list(w.resolved));
    const m = now.metrics || {}, pm = before.metrics || {};
    out.push('', `- ページ数 ${arrow(pm.pages, m.pages)}、内部リンク ${arrow(pm.internalLinks, m.internalLinks)}${m.avgTtfbMs != null && label === '本番' ? `、平均応答 ${arrow(pm.avgTtfbMs, m.avgTtfbMs, 'ms', true)}` : ''}${m.jsKB != null ? `、JS ${arrow(pm.jsKB, m.jsKB, 'KB', true)}、CSS ${arrow(pm.cssKB, m.cssKB, 'KB', true)}` : ''}`, '');
  }
  if (perf?.lighthouse && prev.perf?.lighthouse) {
    out.push('### 表示速度（モバイル）', '', '| ページ | Performance | LCP | CLS | TBT |', '| --- | --- | --- | --- | --- |');
    for (const [p, x] of Object.entries(perf.lighthouse)) {
      const y = prev.perf.lighthouse[p] || {};
      out.push(`| ${p} | ${arrow(y.performance, x.performance)} | ${arrow(y.lcpMs, x.lcpMs, 'ms', true)} | ${arrow(y.cls, x.cls, '', true)} | ${arrow(y.tbtMs, x.tbtMs, 'ms', true)} |`);
    }
    out.push('');
  }
}

out.push('## 本番 coana.co.jp', '');
if (!prod) out.push('- 今週は本番のデータを取得できなかった（GitHub Actions「SEO の監視」の週次実行の結果が見つからない、または失敗）', '');
else {
  out.push(`取得：${prod.at}（GitHub Actions から）`, '', '直すべきもの（NG）：', list(prod.errors), '', '確認したいもの（注意）：', list(prod.warnings), '');
  if (prod.metrics?.www || prod.metrics?.headers) out.push(`- www：${prod.metrics.www ?? '—'}`, `- ヘッダー：${Object.entries(prod.metrics.headers || {}).map(([k, v]) => `${k}=${v ?? 'なし'}`).join('、')}`, '');
}

out.push('## ビルド成果物（ローカル）', '');
if (!local) out.push('- 未実施', '');
else out.push('直すべきもの（NG）：', list(local.errors), '', '確認したいもの（注意）：', list(local.warnings), '');

if (perf) {
  out.push('## 表示速度・Core Web Vitals（モバイル）', '', `計測：${perf.base}（Lighthouse 12、各ページ良い方の値）`, '');
  out.push('| ページ | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [p, x] of Object.entries(perf.lighthouse || {})) out.push(measured(x)
    ? `| ${p} | ${x.performance} | ${x.accessibility} | ${x.bestPractices} | ${x.seo} | ${(x.lcpMs / 1000).toFixed(1)}s | ${x.cls} | ${x.tbtMs}ms |`
    : `| ${p} | 計測できず（LCP を検出できない） | ${x.accessibility} | ${x.bestPractices} | ${x.seo} | — | ${x.cls} | — |`);
  const failed = Object.entries(perf.lighthouse || {}).flatMap(([p, x]) => [...(x.failedSeoAudits || []).map((a) => `${p}：SEO ${a}`), ...(x.failedA11yAudits || []).map((a) => `${p}：アクセシビリティ ${a}`)]);
  if (failed.length) out.push('', '不合格の監査：', ...failed.map((f) => `- ${f}`));
  const psi = Object.entries(perf.psi || {});
  if (psi.length) {
    out.push('', '実際の利用者のデータ（PageSpeed Insights／Chrome UX Report、p75）：', '');
    for (const [p, x] of psi) {
      if (x.error) { out.push(`- ${p}：取得できず（${x.error}）`); continue; }
      const f = x.field || x.originField;
      out.push(`- ${p}：${f ? `LCP ${f.lcpMs ?? '—'}ms・INP ${f.inpMs ?? '—'}ms・CLS ${f.cls ?? '—'}（${f.overall ?? '判定なし'}）${x.field ? '' : '（サイト全体）'}` : '利用者のデータが足りない（アクセス数が少ないページは出ない）'}`);
    }
  }
  if (perf.notes?.length) out.push('', ...perf.notes.map((n) => `- メモ：${n}`));
  out.push('');
}

// ── 検索の実績（Search Console。GitHub Actions が週次で取る。未設定なら案内だけ） ──
out.push('## 検索の実績（Search Console）', '');
if (!gsc) out.push('- 未設定（GitHub の Secrets に GSC_SERVICE_ACCOUNT_JSON を登録すると、毎週ここに検索のクリック・表示・クエリが入る。手順は SEO_PLAYBOOK.md「7.」）', '');
else {
  const t = gsc.totals || {}, pt = gsc.prevTotals || {};
  const diff = (a, b) => (b == null || a == null ? '' : `（前の28日 ${b} → ${a > b ? '+' : ''}${a - b}）`);
  // 社名以外のクリックは、クエリが分かるものだけを足す（合計には Google が伏せたクエリの分も入るので、合計 − 社名 では多く出すぎる）
  const nb = gsc.nonBrandClicks ?? (gsc.queries || []).filter((q) => !/coana|コアナ/i.test(q.key)).reduce((n, q) => n + q.clicks, 0);
  const pnb = gsc.prevNonBrandClicks;
  out.push(`期間：${gsc.range.start}〜${gsc.range.end}（データの遅れのため3日前まで）`, '');
  out.push(`- クリック ${t.clicks ?? 0}${diff(t.clicks, pt.clicks)}、表示 ${t.impressions ?? 0}${diff(t.impressions, pt.impressions)}、平均掲載順位 ${t.position ?? '—'}`);
  out.push(`- うち社名での検索（coana を含む）：${gsc.brandClicks ?? 0} クリック。**社名以外の言葉から：${nb} クリック**${diff(nb, pnb)}（新しいお客さま候補の入口。いちばん大事な数字。Google が伏せたクエリは含まない）`, '');
  const nonBrand = (gsc.queries || []).filter((q) => !/coana|コアナ/i.test(q.key));
  const row = (q) => `| ${q.key} | ${q.clicks} | ${q.impressions} | ${q.ctr}% | ${q.position} |`;
  if (nonBrand.length) out.push('社名以外のクエリ（表示の多い順・上位15）：', '', '| クエリ | クリック | 表示 | CTR | 順位 |', '| --- | --- | --- | --- | --- |', ...[...nonBrand].sort((a, b) => b.impressions - a.impressions).slice(0, 15).map(row), '');
  // 伸びしろ：10位前後に表示されているのにクリックが少ない → タイトル・説明文の見直し（B）や記事の追記の候補
  const chance = nonBrand.filter((q) => q.position <= 15 && q.impressions >= 10 && q.ctr < 3);
  out.push('伸びしろ（10位前後に表示されているのにクリックが少ないクエリ。タイトル・説明文の見直し＝要承認の候補）：', '', ...(chance.length ? chance.slice(0, 10).map((q) => `- 「${q.key}」：順位 ${q.position}・表示 ${q.impressions}・クリック ${q.clicks}`) : ['- なし']), '');
  const pages = gsc.pages || [];
  if (pages.length) out.push('ページ（クリックの多い順・上位10）：', '', '| ページ | クリック | 表示 | CTR | 順位 |', '| --- | --- | --- | --- | --- |', ...pages.slice(0, 10).map((q) => row({ ...q, key: q.key.replace('https://coana.co.jp', '') || '/' })), '');
}

out.push('## 今回の対応', '', '<!-- 週次タスクが書き足す：自動で直したもの（PR）／要承認の提案（PR）／見送ったもの と理由 -->', '');
fs.writeFileSync(path.join(DIR, `${DATE}.md`), out.join('\n'));
console.log(`書き出し: ${path.join(DIR, `${DATE}.md`)}${prevFile ? `（前回 ${prevFile} と比較）` : '（初回）'}`);
