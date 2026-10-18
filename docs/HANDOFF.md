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

### 2. 【置き換え】FLOW（ご利用までの流れ）の「手紙」アニメーション
- ブランチ `claude/flow-journey` は PR を作らず、3. の鳩の仕組みに統合した（同じ鳩で FLOW も動かす）。

### 3. 【進行中】「鳩がデータを運ぶ」改修（HOW IT WORKS 全LP＋FLOW）
- ブランチ：`claude/dove-carrier`（`claude/flow-journey` から作成。WIP を push 済み）。
- 依頼の要点：
  - 起点で約1.2秒静止 → 予備動作 → 1工程ずつ（移動約1秒・停止約1秒）→ 終点で約2秒の余韻 → 起点へ戻る（ワープしない）。
  - 鳩がくちばしで荷物（領収書・データ・レポート…）を運ぶ。LPごとに変えるのは荷物と順路だけ。
  - transform/opacity のみ、WAAPI/CSS のみ（rAF で毎フレーム DOM を書かない）。
  - 画面外・タブ非表示・カードを読んでいる間は停止。動きを減らす設定では静止。
  - CPU 4x/6x でも滑らか、長いタスクなし。同じページの重い演出の棚卸し。
  - PC・390px の GIF を PR に。自己評価5項目（スタートがわかるか／読みやすさ／くどくないか／軽く見えないか／低スペックで止まらないか）。
- 実装：
  - `src/doveCarrier.tsx`（共通エンジン）
  - `src/schemeStory.tsx`（LPごとの順路と荷物）
  - `src/flowJourney.ts`（FLOW の順路）
  - CSS は `src/index.css` の `.dove-*`
  - 止まる位置は各カードの `data-perch`／`data-perch-v`
- 済み：
  - 重なりテスト `tools/qa/dove-overlap.cjs`：全LP＋FLOW × 1280・390・768 で ALL OK（止まっている間も飛んでいる間も）。
  - 挙動テスト：story-test・fj-test・wheel・fj-wheel。
  - 計測 `tools/qa/dove-perf.cjs`：CPU 1x/4x は長いタスクなし（4x で 53ms が1件）。6x は 50〜80ms が数件。
  - 演出の棚卸しで間引き：お問い合わせ帯の背景位置アニメ → transform、画面外では停止。LP ヒーローの矢印のバウンドは4回だけ。
  - GIF：`claude/pr-assets` の `dove/`（eef0f05）。
- 次の一手：PR 作成 → Cloudflare Pages のチェック後マージ。

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
