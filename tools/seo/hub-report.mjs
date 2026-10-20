#!/usr/bin/env node
// 「SEO の監視」（GitHub Actions）の結果を Automation Hub（ibato-byte/automation-hub）の台帳 seo-monitor に記録する。
//   node tools/seo/hub-report.mjs --prod prod.json --mode daily|weekly --job-status success|failure --hub <automation-hub の clone 先>
//   --dry-run：hub.mjs に渡す引数を表示するだけ（テスト用）
// Hub への記録に失敗しても監視そのものの結果は変えない（終了コードは常に 0）。手順は automation-hub の docs/HUB_PROTOCOL.md。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);

/** 次の毎日の点検（UTC 21:17）。いまがそれ以降なら翌日 */
export function nextDaily(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 17));
  if (now >= d) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().replace(/\.\d+Z$/, 'Z');
}

/** hub.mjs report に渡す引数を作る */
export function buildArgs({ prod, mode, jobStatus, runUrl, now = new Date() }) {
  const out = ['report', '--id', 'seo-monitor', '--next-run-at', nextDaily(now)];
  if (runUrl) out.push('--report-url', runUrl);
  if (!prod) {
    return [...out, '--result', 'failure', '--summary', '本番の点検が最後まで終わらなかった（結果のファイルがない）。Actions の実行ログを確認。'];
  }
  const ng = prod.errors?.length || 0;
  const warn = prod.warnings?.length || 0;
  const pages = prod.pages?.length || 0;
  const result = jobStatus !== 'success' ? 'failure' : ng ? 'partial' : 'success';
  const kinds = [...new Set((prod.errors || []).map((e) => e.type || e.rule || e.kind).filter(Boolean))].slice(0, 3);
  const summary = `本番の点検：NG ${ng}／注意 ${warn}（${pages}ページ）。${ng ? `異常あり${kinds.length ? `（${kinds.join('・')}）` : ''}：Issue「seo-alert」に記録。` : ''}${mode === 'weekly' ? '外部リンクと表示速度も測り、Issue「seo-data」に記録。' : ''}${result === 'failure' ? 'ワークフローの一部が失敗。' : ''}`;
  return [
    ...out, '--result', result, '--summary', summary,
    '--kpi', `本番 NG=${ng}`, '--kpi', `注意=${warn}`, '--kpi', `ページ数=${pages}`,
    '--owner-action', ng ? `本番で異常 ${ng} 件：coana-website の Issue（ラベル seo-alert）を確認（修正は週次タスクが担当）` : 'none',
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prodPath = opt('prod', 'prod.json');
  let prod = null;
  try { prod = JSON.parse(fs.readFileSync(prodPath, 'utf8')); } catch { /* 結果なし＝失敗として記録 */ }
  const runUrl = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  const hubArgs = buildArgs({ prod, mode: opt('mode', 'daily'), jobStatus: opt('job-status', 'success'), runUrl });
  if (args.includes('--dry-run')) { console.log(JSON.stringify(hubArgs, null, 2)); process.exit(0); }
  try {
    execFileSync('node', [path.join(opt('hub', 'hub'), 'scripts/hub.mjs'), ...hubArgs], { stdio: 'inherit' });
  } catch {
    console.log('Automation Hub への記録に失敗（監視の結果には影響しない）');
  }
}
