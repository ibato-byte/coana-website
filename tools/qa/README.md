# 品質チェック用スクリプト（Playwright）

サイトのビルドには含まれません。本番と同じビルドを手元で立ち上げてから実行します。

## 準備

```sh
npm run build
npx vite preview --port 4173            # サイト（多くのスクリプトはここを見る）
# チャット（Pages Functions）を確かめるとき
npx wrangler pages dev dist --port 8788 --binding CHAT_MOCK_AI=1   # AI の代わりに「いちばん近い情報」を返す
npx wrangler pages dev dist --port 8789                             # AI なし（代替応答）
```

- Playwright：`npm i -D playwright`（または `PLAYWRIGHT_MODULE=/path/to/playwright` で場所を指定）
- Chromium：`CHROME_PATH=/path/to/chromium`（指定がなければ Playwright 同梱のもの）
- 一部は `BASE=http://localhost:4176` のように見る先を変えられる（修正前のビルドと比べるとき）

## 主なスクリプト

| ファイル | 確かめること |
| --- | --- |
| `wheel.cjs` | **マウスを動かさず**ホイールだけで HOW IT WORKS まで来て、数秒以内に工程が進むか（全LP）。カードの上で動かすと止まり、約2.5秒で再開するか |
| `story-test.cjs` | HOW IT WORKS：画面外で止まる／一度に1つ／タブ非表示で止まる／一周して繰り返す／動きを減らす設定で完成形／CLS |
| `fj-test.cjs` `fj-overlap.cjs` | FLOW のアニメーション（ブランチ claude/flow-journey）：止まる条件、文字・番号に重ならないか |
| `toggles.cjs` | 全開閉UIの「開く→閉じる→開く」（クリック・タップ・Enter・Space、aria-expanded） |
| `entry.cjs` `entry-pages.cjs` | 入り方（再読み込み・ロゴ・メニュー・戻る/進む・リンク）を変えても演出が同じか |
| `features.cjs` | 今回つくった演出・パーツの個別確認（鳩、回転ワード、OUR STYLE など） |
| `check9.cjs` | 全ページ × 9種の幅：はみ出し・重なり・画像・コンソールエラー |
| `contrast.cjs` `a11y.cjs` `kbd.cjs` `hidden-check.cjs` | コントラスト・見出し構造など・キーボード操作・スパム対策欄が見えないこと |
| `patterns.cjs` `rmcheck.cjs` | スクロールの仕方を変えても文字が読めるか／動きを減らす設定 |
| `detect.cjs` | 不自然な改行（BudouX の文節で判定） |
| `seo.py` | sitemap の全ページ・メタ・構造化データ・内部リンク・旧URLの転送（8789 を見る） |
| `e2e-final.cjs` `knowledge-test.mjs` `steps.cjs` | チャット：開閉・診断・AI/代替応答・知識・フォーム引き継ぎ・スマホのキーボード表示 |
| `cls-real.cjs` | 実際の読み方（ホイール）での CLS |
| `storygif.cjs` `vid.cjs` | PR 用の GIF・動画の素材（vid.cjs は実時間の録画 → ffmpeg で GIF に） |
| `dupcss.cjs` `unused.py` | 食い違う重複 CSS、使われていない画像・クラス |

`knowledge-test.mjs` は Pages Function を1ファイルにまとめたものを読む：
`npx esbuild functions/api/chat.ts --bundle --format=esm --platform=neutral --outfile=tools/qa/chat-bundle.mjs`
