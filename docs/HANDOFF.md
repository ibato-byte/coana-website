# 引き継ぎメモ（HANDOFF）

最終更新：2026-10-18（クラウドセッションから）。**作業の区切りごとに更新し、commit & push すること。**
方針・品質チェックは CLAUDE.md、モーションの決まりは docs/motion-rules.md、チェック項目は docs/final-check.md、スクリプトは tools/qa/。

## 優先順の残タスク

### 1. 【完了：PR #35 マージ済み】HOW IT WORKS が「マウスを動かさないと進まない」不具合のホットフィックス
- ブランチ：`claude/hotfix-story-hover`／PR：https://github.com/ibato-byte/coana-website/pull/35
- 状態：マージ済み（main e4a4094）。本番の目視確認だけ残り（作業環境から本番に接続できないため）。
- 内容：
  - `src/readingPause.ts`（新規）：セクションへの pointerenter では止めない。カード上の pointermove（移動量あり）／フォーカスのときだけ止め、約2.5秒で再開。
  - `src/schemeStory.tsx` から利用。
  - 経理代行の「あとはお任せください」→ 受け渡しの線の横の注記「ここから先は COANA TOKYO が対応します」（`content/solutions/bookkeeping.json` の `rest`）。
- 検証：`tools/qa/wheel.cjs`。修正前の本番ビルドでは5ページで 0→1 のまま止まることを再現、修正後は全9LPで 0→3。
- 次の一手：本番で /services/bookkeeping を、マウスを動かさずスクロールして確認（接続できる環境で）。

### 2. 【進行中】FLOW（ご利用までの流れ）：お客さまの「相談」が進んでいくアニメーション
- ブランチ：`claude/flow-journey`（WIP コミット push 済み、PR 未作成）。
- 依頼の要点：サービス一覧と全LPの FLOW（共通の `FlowLine`）。
  - 小さな手紙が「お問い合わせ → ヒアリング（吹き出し）→ 提案（封が開いて提案書）→ 準備（チェック）→ 契約（印）→ スタート（矢印に折られて鳩になり飛び立つ）→ 改善・伴走（舞い降りて輪）」と進む。
  - 「ディズニー品質」：アニメーションの12原則に沿う。キャラクターは使わない。
  - 別PR、チェック後マージ OK。
- 実装：`src/flowJourney.tsx`（新規）、`src/shared.tsx`（FlowLine に組み込み）、`src/index.css`（`.flowj*`）、docs/motion-rules.md に追記済み。
- 済み：
  - 文字・番号に重ならないことを確認（`tools/qa/fj-overlap.cjs`、3幅×4ページ ALL OK）。
  - スマホは丸の列の中だけを進み、次の丸へは丸の後ろをくぐる。ヒアリングでは手紙が控えて吹き出しが並ぶ。
  - 一時停止の判定は、出来事の前にもかける。
  - 動きを減らす設定では何も出さない。
- **残り（次の一手）**：
  1. `useFlowJourney` の一時停止を `watchReading(root, ".flowx-step", wake)` に置き換える（今は `.flowx-list` の pointerenter／pointerleave で止めている＝ホットフィックスと同じ不具合がある。**使わないこと**）。
  2. main（ホットフィックス・ドキュメントの PR を含む）を取り込む。
  3. `tools/qa/fj-test.cjs`・`fj-overlap.cjs` に加え、マウスを動かさないホイールスクロールでも進むかを確認（wheel.cjs の FLOW 版）。
  4. PC・スマホの GIF を `tools/qa/vid.cjs`（実時間の録画）→ ffmpeg で作り、`claude/pr-assets` に置いて PR に載せる。
  5. 自己評価（安心感・うるさくないか・信頼感）を PR に書く → チェック後マージ。
- 気づき：
  - スクリプトで一瞬でスクロール位置を飛ばしたときだけ、まれに CLS 0.056 が記録される（位置は実際には変わっていない）。
  - 実際のホイール操作では 0（`tools/qa/cls-real.cjs`）。PR に正直に書く。

### 3. 【未着手】「鳩がデータを運ぶ」改修
- オーナーから依頼済み（詳細は元の依頼文を参照。このセッションでは着手前）。
- 上の2つ（ホットフィックス）より後。一時停止は必ず `src/readingPause.ts` の方式で。セクション全体の hover で止めない。

### 4. 【保留・オーナー判断待ち】
- **本番（coana.co.jp）の確認**：クラウドの作業環境からは接続できない（Allowed domains に `coana.co.jp` と `coana-website.pages.dev` の追加が必要）。
- **使われていない画像の削除可否**：オーナー時代から未使用、または CMS のメディア。
  - `public/images/accounting-certifications.png`
  - `public/images/strengths/strength-01〜03.jpg`
  - `public/images/tools/google-workspace.png`
  - `public/uploads/s__413581353/355/357.jpg`
  - `public/favicon-32.png`

## 完了済み（マージ済みの PR）
- #24 スパム対策欄が見えていた不具合の修正
- #25 チャットの補足知識
- #26 モーション
- #27 鳩の下線
- #28 経理代行のレーン図
- #29 最終仕上げ
- #30 回帰チェックで見つかった不具合
- #31 鳩の演出を入り方に関わらず毎回再生
- #32 開閉UIの不具合と「＋」の見直し
- #33 お問い合わせの帯のボタン・重複導線の整理
- #34 HOW IT WORKS の仕組みのアニメーション（全LP）
- #35 ホットフィックス：HOW IT WORKS がマウスを動かさないと進まない／受け渡しの注記

## 作業環境のメモ
- **ローカルでの確認**：
  - サイト：`npm run build && npx vite preview --port 4173`
  - チャット：`npx wrangler pages dev dist --port 8788 --binding CHAT_MOCK_AI=1`（AI の代わり）／`--port 8789`（AI なし）
- **PR 用の画像**：`claude/pr-assets` ブランチ（サイトのコードは含まない、画像だけの独立したブランチ）に置き、`https://github.com/ibato-byte/coana-website/blob/<SHA>/<path>?raw=true` を `<img>` で。
- **force push は使わない**（通常の push で）。
