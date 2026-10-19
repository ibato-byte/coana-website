# コラムの自動作成ツール

手順は [docs/SEO_PLAYBOOK.md](../../docs/SEO_PLAYBOOK.md)「8. コラムの自動作成」、書き方は [docs/column-guide.md](../../docs/column-guide.md)、テーマは [docs/seo-content-plan.md](../../docs/seo-content-plan.md)。

| ファイル | 役割 |
| --- | --- |
| `thumbnail.mjs` | 見出し画像（1200×675 の JPG）を既存と同じ型で作る。`--file <記事> --line1 … --line2 … --sub …` |
| `check-column.mjs` | 品質ゲートの機械チェック（構成・図解・リンク・出典と時点・禁止事項・キーワードの詰め込み）。`<記事> --keyword "<検索語>"` |
| `signature.mjs` | 公開ボタンの署名（HMAC）。Actions と Pages Functions で共用 |
| `approval-comment.mjs` | Actions「コラムの公開確認」から呼ぶ。チェック合格を待って、確認メールになるコメントを PR に付ける |
| `approval.test.mjs` | 公開ボタン（`functions/column-approval.ts`）の安全性テスト（GitHub API は偽物） |
