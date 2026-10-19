#!/usr/bin/env bash
# 週次タスクの点検（修正の前に1回、修正のあとにもう1回使える）。
#   bash tools/seo/weekly.sh              … ビルド → サーバー起動 → ローカル点検 → 本番データの取得 → レポートの下書き
#   NO_REPORT=1 bash tools/seo/weekly.sh  … レポートは作らない（修正後の再点検）
# 出力：/tmp/seo/local.json・prod.json・perf.json、docs/seo-reports/YYYY-MM-DD.md と .json（日本時間の日付）
# 本番（coana.co.jp）にはクラウドの作業環境から接続できないため、本番のデータは GitHub Actions「SEO の監視」が
# Issue（ラベル seo-data）に残したものを使う（tools/seo/fetch-prod-data.mjs）。
set -u
cd "$(dirname "$0")/../.."
OUT=/tmp/seo
mkdir -p "$OUT"
rm -f "$OUT/local.json" "$OUT/prod.json" "$OUT/perf.json"
[ -d node_modules ] || npm ci --no-audit --no-fund
npm run build >"$OUT/build.log" 2>&1 || { echo "ビルド失敗（$OUT/build.log）"; tail -20 "$OUT/build.log"; exit 1; }

# サーバー：4173（vite preview、tools/qa 用）と 8789（wrangler pages dev、_redirects・404 を本番と同じに再現）
if ! curl -s -o /dev/null localhost:4173/; then (npx vite preview --port 4173 --strictPort >"$OUT/preview.log" 2>&1 &); fi
if ! curl -s -o /dev/null localhost:8789/; then (npx -y wrangler@3 pages dev dist --port 8789 --inspector-port 9239 >"$OUT/wrangler.log" 2>&1 &); fi
for i in $(seq 1 60); do curl -s -o /dev/null localhost:4173/ && curl -s -o /dev/null localhost:8789/ && break; sleep 2; done
curl -s -o /dev/null localhost:8789/ || { echo "wrangler が起動しない（$OUT/wrangler.log）"; exit 1; }

node tools/seo/check-site.mjs --base http://localhost:8789 --dist dist --out "$OUT/local.json"
node tools/seo/fetch-prod-data.mjs --dir "$OUT" || echo "（本番データなし：レポートでは「未取得」）"

if [ -z "${NO_REPORT:-}" ]; then
  args=(--local "$OUT/local.json")
  [ -f "$OUT/prod.json" ] && args+=(--prod "$OUT/prod.json")
  [ -f "$OUT/perf.json" ] && args+=(--perf "$OUT/perf.json")
  node tools/seo/report.mjs "${args[@]}"
fi
