#!/usr/bin/env bash
# 週次タスクの「合格ライン」。自動マージの前に必ず通す（1つでも落ちたらマージしない）。
#   bash tools/seo/run-tests.sh            … 全部
#   QUICK=1 bash tools/seo/run-tests.sh    … full-check の幅を 1280・390 に絞る（下書きの確認用。マージ前は使わない）
# 前提：npm run build 済み、vite preview（4173）と wrangler pages dev（8789）が起動済み（tools/seo/weekly.sh が用意する）。
# 各スクリプトは同時に走らせない（重いテストを並べるとタイミングを測るテストが誤って落ちる）。
# 判定：終了コードが 0 以外、出力に「NG」で始まる行がある、最後のまとめの行がない → 不合格。
set -u
cd "$(dirname "$0")/../.."
LOG_DIR="${LOG_DIR:-/tmp/seo-tests}"
mkdir -p "$LOG_DIR"
fail=0
run() { # 名前 まとめの行（正規表現） コマンド…
  local name="$1" summary="$2"; shift 2
  local log="$LOG_DIR/$name.log"
  echo "== $name"
  if ! "$@" >"$log" 2>&1; then echo "不合格：$name が異常終了（$log）"; tail -5 "$log"; fail=1; return; fi
  if grep -q '^NG' "$log"; then echo "不合格：$name に NG（$log）"; grep '^NG' "$log" | head -20; fail=1; return; fi
  if ! grep -Eq "$summary" "$log"; then echo "不合格：$name のまとめが出ていない（$log）"; tail -5 "$log"; fail=1; return; fi
  echo "合格：$name（$(grep -E "$summary" "$log" | tail -1)）"
}
W_ARG=()
[ "${QUICK:-}" = 1 ] && W_ARG=(env W=1280,390)
run seo-local 'errors 0 /' node tools/seo/check-site.mjs --base http://localhost:8789 --dist dist --out "$LOG_DIR/seo-local.json"
run full-check '項目ごとの NG 件数' "${W_ARG[@]}" node tools/qa/full-check.cjs
run story-test ' OK / 0 NG' node tools/qa/story-test.cjs
run wheel '^ALL OK' node tools/qa/wheel.cjs
run a11y '^ALL OK' node tools/qa/a11y.cjs
run column-approval ' OK / 0 NG' node tools/column/approval.test.mjs
if [ "$fail" = 0 ]; then echo "全テスト合格"; else echo "不合格あり：マージしない"; fi
exit "$fail"
