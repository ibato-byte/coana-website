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

### 3. 【完了：PR #37 マージ済み】「鳩がデータを運ぶ」改修（HOW IT WORKS 全LP＋FLOW）
- ブランチ：`claude/dove-carrier`／PR：https://github.com/ibato-byte/coana-website/pull/37（main a5ea294）。
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
- 次の一手：本番での目視（接続できる環境で）。

### 5. 【完了：PR #39 マージ済み】各LPアニメーションの「スタート地点」の分かりやすさ
- ブランチ：`claude/dove-start`／PR：https://github.com/ibato-byte/coana-website/pull/39（main 30fb735）。
- 依頼：初めて見た人が1秒以内に「ここから始まる」と分かる。
  - 初期表示で起点に鳩が待機。起点だけ点灯。起点の印（ドット）。
  - 経路を薄く先に見せ、通ったところから色。
  - スマホは起点が画面内に入ってから出発。
  - PR に最初の2秒の GIF（PC・390px）と自己評価。
- 実装：`src/doveCarrier.tsx`（一周の計画 makePlan → 経路の点線 drawRoute、起点の印 .dove-start、startGate）。CSS は `.dove-route` `.dove-start`。
- テスト：story-test（初期表示・起点が画面外なら出発しない）、fj-test（初期表示）。
- 次の一手：本番での目視（接続できる環境で）。

### 6. 【進行中】バックオフィス代行LP の HOW IT WORKS を作り直し（リレー型）＋ 他のハブ型LPの見直し
- ブランチ：`claude/backoffice-relay`（WIP push 済み）。
- 依頼：ハブ型（中心＋周囲）が「流れが分かりづらい」。
  - PC：左→右の一方向（御社 →1→ COANA TOKYO チーム →2→ 領域）。下の段で 3 完了をご報告 → 4 マニュアル化 → 御社へ戻る。
  - スマホ：上→下の1列。領域は2列のタグ。高さは現状以下。
  - 線は意味のある線だけ。番号付き。通った線から色。鳩エンジンはそのまま。
  - 他のハブ型LP（創業支援 JA/EN・クラウド会計）も確認して見直し。
  - PR に Before/After と GIF、「5秒で流れを説明できるか」の自己評価。
- 実装：
  - `src/SolutionPage.tsx` の `SchemeRelay`（新しい図の種類 `relay`）
  - `src/solution.css` の `.relay*`
  - `content/solutions/backoffice-dx.json`（client／steps／returns）
  - `src/schemeStory.tsx`（周ごとに領域と荷物が変わる）
  - エンジン（`src/doveCarrier.tsx`）の追加：
    - `route: false`
    - `group-tr` の止まり方
    - `page` の出来事
    - 荷物（給与明細・契約書・見積書・フロー図）
    - 回り道を「横・上・下」から選ぶ
- 次の一手：
  1. 他のハブ型LPの見直し。
  2. CMS 設定（relay 型の項目）。
  3. 全テスト。
  4. Before/After・GIF。
  5. PR → チェック後マージ。

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
- #36 引き継ぎ準備（CLAUDE.md・HANDOFF・tools/qa）
- #37 鳩がデータを運ぶ（HOW IT WORKS・FLOW）・低スペック対策
- #38 HANDOFF 更新
- #39 アニメーションのスタート地点（起点で待機・起点の印・経路の点線・起点が画面に入ってから出発）

## 作業環境のメモ
- **ローカルでの確認**：
  - サイト：`npm run build && npx vite preview --port 4173`
  - チャット：`npx wrangler pages dev dist --port 8788 --binding CHAT_MOCK_AI=1`（AI の代わり）／`--port 8789`（AI なし）
- **PR 用の画像**：`claude/pr-assets` ブランチ（サイトのコードは含まない、画像だけの独立したブランチ）に置き、`https://github.com/ibato-byte/coana-website/blob/<SHA>/<path>?raw=true` を `<img>` で。
- **force push は使わない**（通常の push で）。
