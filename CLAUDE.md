# CLAUDE.md

## コラム記事（content/topics）

- `content/topics` の記事を書く・直すときは、**必ず [docs/column-guide.md](docs/column-guide.md) に従う**こと（読者像、構成、図解、信頼性、CTA、SEO のルール）。
- 図解の SVG は `public/images/topics/<slug>/` に置く。
- 公開日（`date`）が未来の記事は、公開日（日本時間）まではサイトに表示されない（`src/content.ts` の予約投稿処理）。
- 未来日付の記事は、Cloudflare Pages のプレビュー（`*.pages.dev`）と `localhost` に限り、`?preview=YYYY-MM-DD` を付けるとその日付時点の表示で確認できる（本番では無効。sitemap.xml・feed.xml・llms.txt には含まれない）。
