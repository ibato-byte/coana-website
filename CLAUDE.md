# CLAUDE.md

COANA TOKYO合同会社のWebサイト（https://coana.co.jp）。オーナーの指示で積み上げてきた方針を、ここにまとめる。
**作業を始める前に、必ず docs/HANDOFF.md（残タスク・進行中のブランチ）を読むこと。**

## 構成

- Vite ＋ React 19 ＋ TypeScript。ページは `src/App.tsx`（トップ・会社概要・サービス一覧・トピックス・お問い合わせ）と `src/SolutionPage.tsx`（各サービスLP）。
- 中身は `content/`（JSON／Markdown）。Decap CMS（`/admin`、設定は `public/admin/config.yml`）で編集される。読み込みは `src/content.ts`。
- ビルド時（`vite.config.ts`）に各ページの HTML・タイトル・説明文・構造化データ・クローラー向けの本文（`.seo-fallback`）、sitemap.xml・feed.xml・llms.txt・`chat-knowledge.json` を書き出す（プリレンダー相当）。
- 本番は Cloudflare Pages（main への push で自動デプロイ。PR ごとにプレビュー `*.coana-website.pages.dev`）。旧URLの転送は `public/_redirects`、ヘッダーは `public/_headers`。
- サポートチャットの AI は Pages Functions（`functions/api/chat.ts`）＋ Workers AI（バインディング名 `AI`、無料枠内。任意で KV `CHAT_KV`）。AI が使えないときはサイト内検索の代替応答。
- 予約投稿：`.github/workflows/scheduled-publish.yml`（毎朝6時）。

## オーナーの確定方針（必ず守る）

### いちばん大事なこと
- **見やすさ・分かりやすさが最優先**。初めての中小企業の経営者が「何をしてくれる会社か／自分に合うか／どう相談するか」をすぐ分かること。文字は画面に入ったらすぐ読める。WCAG AA（文字 4.5:1、大きな文字 3:1）。
- そのうえで**楽しさと技術力**を、装飾とインタラクション（線・アイコン・鳩・ホバー）で見せる。「全部地味」も「AIっぽい・軽い・安っぽい」もNG。引き算するのは情報を邪魔する演出だけ。
- オーナーが決めたこと（ヒーローのデザイン、代表を前に出しすぎない、文言）は変えない。

### モーション（詳細は docs/motion-rules.md）
- スクロールに連動させない（スクロールジャック・pin・スナップ・スクロール量で線が伸びる等は禁止）。画面に入ったら再生。
- 速すぎない：1ステップ約1秒の移動＋各ステップで少し止まる。起点で静止 → 予備動作 → 出発。一度に動くのは1つ。
- 画面外・非表示タブでは止める。`prefers-reduced-motion` では動かさず完成形を表示。
- **セクション全体への hover（pointerenter）で一時停止しない**（ホイールでスクロールすると止まったカーソルの下に図が入り、止まったままになる）。止めるのは「カードの上で実際にカーソルを動かした／フォーカスした」ときだけ、約2.5秒で自動再開（`src/readingPause.ts`）。
- 動かすのは transform と opacity（と SVG の線の描画）だけ。レイアウトもページの長さも変えない（CLS を出さない）。
- 演出はページに入るたびに同じ（初回読み込みだけ動く作りにしない）。1ページの強い見せ場は2〜3か所まで。
- 鳩のモチーフ：ボタンの矢印 → 鳩（`bird.ts`／`buttonFx.ts`）、トップの見出しの下線を鳩が引く（`heroDove.tsx`）、鳩がデータを運ぶ（予定・docs/HANDOFF.md）。キャラクター（目や顔）は使わない。

### 掲載内容
- 電話番号は載せない。メールアドレス（info@）はフッターとお問い合わせページだけ（帯などに重ねて出さない）。
- LINE ボタンは白地＋LINE の緑の枠と緑の文字（LINE の緑で塗ると白文字が 2.3:1 で AA を満たさない）。
- 代表の紹介は会社概要ページだけ（前に出しすぎない）。
- 数字・実績を捏造しない（サイトにない数字は使わない。「月70時間削減」のような根拠のない数字はNG）。
- 税理士・社労士などの士業の独占業務について判断・助言しない（提携の専門家を紹介する立場）。
- 相談の導線は重複させない：ヒーローのCTA（最初）＋ページ下部のお問い合わせの帯（最後）＋いつでも使えるヘッダー／チャット（スマホは固定バー）が基本。途中は内容の流れで本当に自然な場所だけ。

### サポートチャット（`src/chat/`、`functions/api/chat.ts`、`content/chatbot/knowledge.md`）
- 名前は「COANA TOKYO サポートチーム」、ロゴを表示。無料枠で運用（上限を超えたら代替応答）。
- 答えるのはサイトの内容と公式の補足知識の範囲だけ。社内資料は使わない。読み方は「衣鳩 翔太（いばと しょうた）」。
- 補足知識の【聞かれたときのみ】（株式会社サインタ・趣味・活動拠点など）は、直接聞かれたときだけ答える。
- 補足知識の「- ※」の行は AI への注意書き（AI がないときの自動回答には出さない）。

## 品質チェック（PR ごと）

1. 本番と同じビルド（`npm run build` → `vite preview`）で確認。チェックの項目は docs/final-check.md、スクリプトは `tools/qa/`（README あり）。
2. **マウスを動かさずホイールだけでスクロール**して、演出が数秒以内に動くか（`tools/qa/wheel.cjs`）。reduced-motion、キーボード、開閉UIの開→閉→開、入り方を変えた演出、CLS。
3. CPU を遅くした状態（Chrome DevTools の CPU 4x slowdown 相当）でも、文字がすぐ読めて動きが破綻しないか。
4. PR には PC と幅390px の短い GIF（実時間）とスクリーンショット。画像は `claude/pr-assets` ブランチに置き、コミットの SHA を固定したURLで `<img>` タグで載せる。
5. 自己評価（5点）：①説明なしで伝わるか ②問い合わせが不安でなくなるか（安心感）③うるさくないか ④信頼感を損なっていないか ⑤表示速度・アクセシビリティを落としていないか。少しでも不安があれば引き算してから出す。
6. Cloudflare Pages のチェックが通ったらマージ（オーナー了承済み）。本番に接続できる環境なら本番も確認。

## 実装の要点（主なファイル）

| ファイル | 役割 |
| --- | --- |
| `src/motion.ts` | 画面に入ったら表示（`[data-reveal]`）、線で描く（`[data-draw]`）、画面内だけ動かす（`[data-live]`、`.art-paused`）、PC のカードの傾き |
| `src/doveCarrier.tsx` | 鳩がデータを運ぶアニメーション（HOW IT WORKS・FLOW 共通。動き・タイミング・文字を避ける通り道・止める条件） |
| `src/schemeStory.tsx` | HOW IT WORKS：LPごとの順路と運ぶもの（`STORIES` と伝えたい一文） |
| `src/flowJourney.ts` | FLOW：ステップ名から順路と運ぶもの・出来事を決める |
| `src/readingPause.ts` | 「読んでいる間だけ止める」の正しい実装（カード上の pointermove／フォーカス、約2.5秒で再開） |
| `src/heroDove.tsx` `src/bird.ts` `src/buttonFx.ts` | 鳩の下線、矢印⇄鳩の形、ボタンのホバー |
| `src/shared.tsx` | 共通パーツ（FlowLine＝ご利用までの流れ、FAQ、お問い合わせの帯、LINE ボタン など） |
| `src/illustrations.tsx` | 挿絵（SVG） |
| `src/chat/*` | チャットの画面・診断・検索 |
| `src/index.css` `src/solution.css` | スタイル（値は `--m-*` などの変数。docs/motion-rules.md の表と揃える） |

## 進め方

- **作業の区切りごと（30分程度または1タスクごと）に必ず commit & push**（WIP でもブランチに push）。そのたびに docs/HANDOFF.md を更新する（クラウドの作業環境は消えることがある）。
- ブランチ：1つの依頼につき1ブランチ（`claude/<内容>`）→ PR → チェック後マージ。

## コラム記事（content/topics）

- `content/topics` の記事を書く・直すときは、**必ず [docs/column-guide.md](docs/column-guide.md) に従う**こと（読者像、構成、図解、信頼性、CTA、SEO のルール）。
- 図解の SVG は `public/images/topics/<slug>/` に置く。
- 公開日（`date`）が未来の記事は、公開日（日本時間）まではサイトに表示されない（`src/content.ts` の予約投稿処理）。
- 未来日付の記事は、Cloudflare Pages のプレビュー（`*.pages.dev`）と `localhost` に限り、`?preview=YYYY-MM-DD` を付けるとその日付時点の表示で確認できる（本番では無効。sitemap.xml・feed.xml・llms.txt には含まれない）。
