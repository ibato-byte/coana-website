# SEO の点検ツール

毎週の自動ブラッシュアップ（[docs/SEO_PLAYBOOK.md](../../docs/SEO_PLAYBOOK.md)）で使う。依存なし（Node 20 以上。Lighthouse は npx で取得）。

| ファイル | 役割 | どこで動く |
| --- | --- | --- |
| `check-site.mjs` | 技術面の点検（sitemap の全ページ：200・title・description・canonical・robots・OGP・構造化データ・h1・内部リンク・画像・電話番号・メール書き換え／サイト全体：robots.txt・sitemap・llms.txt・feed・ファビコン・404・転送）。`--prod` で本番のみの項目、`--external` で外部リンク、`--dist` で dist の大きさ | ローカル（`wrangler pages dev` の 8789）・本番（GitHub Actions） |
| `perf.mjs` | 表示速度（Lighthouse・モバイル、主な8ページ）と PageSpeed Insights（実際の利用者のデータ。`PSI_API_KEY` があれば安定） | 本番（GitHub Actions）。ローカルは `LH_BIN`・`CHROME_PATH` を指定 |
| `notify.mjs` | 結果を Issue に記録（NG → `seo-alert`、週次データ → `seo-data`） | GitHub Actions |
| `fetch-prod-data.mjs` | `seo-data` の Issue から最新の本番データを取り出す（curl で GitHub API） | 週次タスク（クラウドの作業環境） |
| `report.mjs` | レポート `docs/seo-reports/YYYY-MM-DD.md`・`.json` を作る（前回との差分つき） | 週次タスク |
| `weekly.sh` | ビルド → サーバー起動 → ローカル点検 → 本番データ取得 → レポートの下書き（`NO_REPORT=1` で点検だけ） | 週次タスク |
| `run-tests.sh` | 自動マージの合格ライン（ローカル点検 NG 0、full-check、story-test、wheel、a11y を順に） | 週次タスク |

```sh
bash tools/seo/weekly.sh                      # 点検とレポートの下書き
bash tools/seo/run-tests.sh                   # マージ前のテスト（30〜60分）
node tools/seo/check-site.mjs --base http://localhost:8789 --dist dist   # 点検だけ
```
