# 引き継ぎメモ（HANDOFF）

最終更新：2026-10-22（クラウドセッションから）。**作業の区切りごとに更新し、commit & push すること。**
方針・品質チェックは CLAUDE.md、モーションの決まりは docs/motion-rules.md、チェック項目は docs/final-check.md、スクリプトは tools/qa/。

## サイト全体のリニューアル「Signal Sky」（2026-10-22、オーナー依頼）

- ブランチ `claude/signal-sky-redesign`。オーナーが選んだデザイン案（濃い青の空・白い羽・2px の線・番号つき見出し）を React 本体に移植。CMS（content/ と /admin の設定）はそのまま使える。
- 追加：`src/signal.css`（デザインの上書き。main.tsx で最後に読む）、`src/logo.tsx`（公式ロゴキットから起こした SVG）、`src/feathers.tsx`（空の羽）。
- トップ：ヒーロー（整える。任せる。伸ばす。言葉を押すとカードが切り替わる。画面内・タブ表示中だけ約7秒ごとに自動切り替え、鳩の下線が終わってから開始、カード上でカーソルを動かす／フォーカス中は2.5秒止める、reduced-motion では自動切り替えなし）→ 帯（画面内だけ流れる、PCのみ）→ 01 できること → 02 診断（選ぶとチャットの診断が2問目から始まる。`openChat("diagnosis", 回答)`）→ 03 支援スタイルと流れ → ツール（KING OF TIME を追加）→ 04 トピックス → 05 FAQ → お問い合わせの帯。
- 羽と帯の動きは PC（768px 以上）かつ画面内だけ。スマホと reduced-motion では止まった状態。HOW IT WORKS・FLOW の鳩の図は変更なし。
- お問い合わせページの「お電話でのお問い合わせ（AIによる自動受付）」は、オーナーが 2026-10-22 に追加したものなので残した（2026-10-22 オーナー了承のうえ、CLAUDE.md に例外として追記済み）。メールはフッターのみ。文字の載る青は AA を満たす濃さ（ヒーローは #1372c7〜#0b62b8）。LINE ボタンは白地＋緑の枠のまま。
- 記事本文の見出しは `word-break: auto-phrase`（Markdown には <wbr> が入らないため）。サービス一覧のカードは 440px 以下で絵を上に。
- 確認済み（手元の esbuild ビルド）：PC 1440／390／320px で全ページ、JS エラーなし、コントラスト、ヒーローの切り替え・診断→チャット・FAQ・スマホメニュー・reduced-motion。**未確認**：本番と同じ `npm run build` と Cloudflare Pages のプレビュー（作業環境から npm を使えなかったため）。

## レンとジル公式ページ（2026-10-22、Automation Hub 依頼 #38）

- ブランチ `claude/vigilant-cerf-pl8b7o`（PR 未作成）。ページ `/renjill`（`src/RenjillPage.tsx`）、データ `content/renjill/episodes.json`、SEO は `vite.config.ts`（タイトル・VideoObject・sitemap・クローラー向け本文）。フッター下段に「レンとジル」のリンク。
- データは Actions「レンとジルの更新」（`.github/workflows/renjill-sync.yml`、毎日 6:17）が公開リポジトリ `renjill-media` の `episodes.json` から取り込む。公開日（日本時間）前の回は出さない。YouTube は押したときだけ読み込む。
- 未確認：実機の見た目（PC・390px）、本番での動作。YouTube の ID が入るまで VideoObject は出ない。

## Automation Hub（自動の一覧・指示）

- Claude の自動（SEO 週次・SEO 毎日監視・コラム自動作成 など）を1か所で見て、指示を送るダッシュボード：https://automation-hub-8lm.pages.dev（Cloudflare Access でオーナーだけ）。
- 台帳・ログ・指示（Issue）・約束ごとは非公開リポジトリ `ibato-byte/automation-hub`（docs/HUB_PROTOCOL.md。新しい自動を作るときは必ずこれに従って登録・連携する）。
- 進み具合（2026-10-20）：リポジトリ・トークン・Pages（本番デプロイ済み）・coana-website の `HUB_TOKEN` は完了。**残り**：Cloudflare Access が本番の pages.dev をまだ守っていない（Pages の「Access policy」から作り直す手順は automation-hub の docs/SETUP.md 4-3）、Pages の変数 `ACCESS_TEAM_DOMAIN`・`ACCESS_AUD` が未登録（Cloudflare Zero Trust の障害の復旧待ち）。それまでダッシュボードは「ログインの設定がまだです」でデータを出さない（fail closed）。オーナーの設定後に Claude が本番を確認する。
- 2026-10-20：GitHub Actions の4つ（SEO の監視・予約投稿の公開・コラムの公開確認・コラムの自動公開）は、最初に Hub の一時停止を確認（停止中は本来の処理をしない）、最後に結果を Hub に記録する（`automation-hub/scripts/gha.sh`。Secrets の `HUB_TOKEN` がなければ Hub は使わない）。
- このリポジトリからの連携：週次タスクのプロンプトの H1・H2（docs/weekly-task-prompt.md）、「SEO の監視」の最後のステップ（`tools/seo/hub-report.mjs`。Actions の Secrets `HUB_TOKEN` がなければ何もしない）。

## SEO の週次（自動ブラッシュアップ）

手順と線引きは [docs/SEO_PLAYBOOK.md](SEO_PLAYBOOK.md)。週次タスクは毎回ここに1〜3行で結果を追記する（新しいものを上に）。

- 仕組み：
  - 毎日 6:17：GitHub Actions「SEO の監視」が本番を点検し、異常があれば Issue（`seo-alert`）を立てる。
  - 毎週月曜 5:37：同じ Actions が外部リンクと表示速度も測り、Issue（`seo-data`）にデータを残す。
  - 毎週月曜 8:54：Claude のスケジュールタスク「COANA SEO 週次ブラッシュアップ」が修正・提案・レポートを行う。
- スケジュールタスク（プロンプトの正本は docs/weekly-task-prompt.md）：「COANA SEO 週次ブラッシュアップ」ID `trig_01RrZBY7DC79EtMXno9werew`（毎週月曜 8:54 日本時間。専用セッション `session_01HbxZBk1N9D7dtypAM8AM36` に毎週同じ指示が届く方式。毎回新しいセッションを作る方式はリポジトリが接続されないため使えない。通知はプッシュのみ）。プロンプトの変更・停止は claude.ai のスケジュールタスクの画面、またはセッションから update_trigger で。
- コラムの自動作成（2026-10-19 構築）：週次タスクが毎週1本書き（2026-10-20 オーナー決定。それまでは2週に1本）、品質ゲート合格で「コラム公開待ち」の PR → チェックがすべて合格すると Actions「コラムの自動公開」（`.github/workflows/column-auto-publish.yml`、2026-10-20 にオーナーが追加）が自動でマージ＝公開（確認メールも届く）。初回「入金確認（入金消込）のやり方」は 2026-10-20 に自動公開（PR #58）。手順・オーナーの設定・取り下げは SEO_PLAYBOOK.md「8.」、テーマと記録は `docs/seo-content-plan.md`。
- オーナーにお願い（任意）：`PSI_API_KEY`（無料）を Actions の Secrets に／作業環境の Allowed domains に `coana.co.jp`。
- 記録：
  - 2026-10-20（臨時、オーナー決定の反映）：コラムを毎週1本に、テーマを依頼を検討している人の検索の順に並べ替え（6件追加、全テーマに「つなぐLP」）、導線の点検を毎週の手順に追加。A：経理代行のLPの関連記事に入金確認の記事、記事本文にクラウド会計LPへのリンク。B の候補2件（記事からのお問い合わせでサービスを事前選択、記事末尾のサービス案内）はオーナーの判断待ち。コラムは7日未満のため次回 10-26。NG 0／注意 17。
  - 2026-10-19（初回の週次）：NG 0／注意 16（すべて title の長さ。重要語は先頭にあり、切れるのは会社名だけなので見送り）。表示速度はモバイル Performance 47・LCP 約 11 秒（初回の基準値。JS が 1 本で約 820KB）。A：`weekly.sh` が package-lock.json なしで `npm ci` に失敗する不具合を修正。B：なし。
  - 2026-10-19：仕組みを構築。

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

### 6. 【完了：PR #41 マージ済み】バックオフィス代行LP の HOW IT WORKS を作り直し（リレー型）＋ 他のハブ型LPの見直し＋全LPの鳩の見直し
- ブランチ：`claude/backoffice-relay`／PR：https://github.com/ibato-byte/coana-website/pull/41（main 08f7f35）。
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
- 済み：創業支援 JA/EN・クラウド会計もリレー型に変更。CMS 設定（relay 型の項目）。
- **追加指示（同じブランチで対応中）：全LPの鳩の見直し（オーナーフィードバック）**
  - 軌道（飛ぶ道筋・軌跡・点線の先出し）は描かない → 削除。進み具合はカード側（点灯＋小さなチェック `StepCheck`）。
  - 短く自然な弧だけ（エンジンの `arc()` が文字に当たらない高さ・向きを選ぶ）。大きな迂回・カードの裏くぐりは廃止。perch を外の余白へ（経理代行のレーン：御社側は `out-r`、チーム側は `above-tr`。スマホはカード右に鳩の通り道の余白）。
  - 終点から起点へ飛んで戻らない：置く → 全工程が完了でそろう → 上へ去る → 間 → 点灯リセット（`data-cycle` の「毎月くり返し」が回る）→ 起点に舞い降りる → 静止 → 出発。
  - CLAUDE.md・docs/motion-rules.md にルールを追記済み。
- テスト済み：dove-overlap（1280・768・390）ALL OK、story-test（終点でそろう→去る→リセット→再出発を追加）、fj-test 132 OK、wheel・fj-wheel・toggles・features ALL OK、contrast（リレー中心カードの補足文を白に）、dove-perf（4x で長いタスク 0〜2 件）。
  - 録画：`tools/qa/finalevid.cjs`（終点の少し前〜次の周の出発までの時刻を JSON に書く）。
- GIF・Before/After：`claude/pr-assets` の `dove-finale/`・`relay/`（コミット 59b3c99）。
- 次の一手：本番で各LPの HOW IT WORKS と /services の FLOW を目視確認（接続できる環境で）。

### 7. 【完了：PR #43 マージ済み】鳩アニメーションの仕上げ（3点）
- ブランチ：`claude/dreamy-hopper-idzvf4`。PR 画像は `claude/pr-assets` の `dove-polish/`（コミット 092c711）。
- 依頼（オーナー評価「全体としてはいい感じ」）：
  1. 起点の黄色い点を全LP・FLOWから削除。起点は鳩とカードの状態だけで示す（起点カードの控えめな点灯・待つ間に一度だけ小さな仕草・出発直前に進行方向を向く）。追加のマーク・バッジ・ドットは使わない。
  2. 経理代行LPのスマホで図が画面より縦に長い（1188px）→ 1画面程度に。他のLPのスマホ図も高さを確認。
  3. 再スタート前の間（約3秒）を全体で約1.5〜2秒に。
- 実装：
  - `src/doveCarrier.tsx`：`.dove-start` と markStart を削除、`preen()`（首をかしげて荷物を持ち直す）と `faceToward()`（出発前に向き直る）、時間 `T` を短縮（together 1.2・away 0.7・rest 0.15・gap 0.2・descend 0.85・againHold 0.9）。
  - 経理代行のスマホ（≤980px）：カードは「アイコン＋工程名＋詳しく見る」の1行（説明は詳細を開いて読む）、担当が切り替わる工程にだけ札、受け渡しの注記は1行。1188px → 659px（390px幅）。他のLPのスマホ図は 527〜663px で1画面以内。
- テスト済み：dove-overlap（1280・768・390）ALL OK、story-test 172 OK、fj-test 132 OK、wheel・fj-wheel・toggles・features ALL OK。
- 次の一手：本番で起点の見え方と経理代行のスマホ図を目視確認（接続できる環境で）。

### 8. 【完了：PR #44 マージ済み】リレー型の図（創業支援 JA/EN・バックオフィス代行・クラウド会計）：役割を「エリア」で示す
- ブランチ：`claude/dreamy-hopper-idzvf4`。
- 依頼：「起業する方がやること／COANA TOKYOがやること」が浮いた小さなラベルで、範囲も④の帰属も分かりづらい。スマホは役割表示なし。合格基準は「初めて見た人が3秒で『自分は相談するだけ、あとはCOANA TOKYOがやる』と分かる」。
- 実装：
  - `SchemeRelay`（src/SolutionPage.tsx）：浮いたラベル（`.relay-side`）と御社へ戻る矢印を廃止。COANA TOKYO が担当する範囲（中心・領域・③）を `.relay-team`（PC は display: contents、背景は `.relay-panel`。スマホはこの箱がパネル）で囲み、見出し `team_label`。
  - 御社のカードに `client.todo`（「やること：まとめて相談するだけ」）。最後の戻りは `.relay-goal`（「受け取るもの」・暖色・御社の側）で、鳩が最後に届ける先。
  - `nodes[].partner`：提携先など COANA TOKYO 以外は破線の枠（創業支援の「専門家の紹介・連携」、クラウド会計の「顧問税理士」「経営者・担当者」）。
  - CMS（config.yml）に todo・partner を追加。SEO 用の文章（relayFlow）も todo を使う。
  - スマホの高さ（390px）：創業支援 594→595、英語 601→629（英語の領域名の折り返し）、バックオフィス 579→581、クラウド会計 527→527。
- テスト済み：features・wheel ALL OK、story-test（リレー型4LP）76 OK、dove-overlap（リレー型、1280・768・390）ALL OK、contrast は変更による NG なし。PR 画像は `claude/pr-assets` の `relay-roles/`（コミット 388a31f）。
- 次の一手：本番で4LPの図を目視確認（接続できる環境で）。

### 9. 【完了：PR #45 マージ済み】本番確認後の小修正：リレー型のラベルとパネルの枠線
- オーナーが本番で確認：薄い青の枠は見やすくなった。ただしどのLPも ① の言葉が重なりがちで見づらい。
  - スマホ：「① まとめて相談」とパネルの見出し「COANA TOKYOが担当」が接触（見出しをパネルの上の縁に載せていたため。-7px）。
  - PC・タブレット：① の言葉がパネルの左端の枠線にかかる（パネルが ① の列へ 26px はみ出していたため）。
- 修正（4LP 共通）：
  - スマホ：見出しをパネルの内側の上へ。① の言葉の下端 → パネルの上端 約14px、→ 見出し 約27px。
  - PC・タブレット：パネルの左端を寄せ（はみ出し 26→14px）、① の列の右に 26px の余白。長い言葉（英語）は2行に折り返す。
  - 「受け取るもの」の札を、カードの枠線にかけずカードの内側（工程名の上）へ。
  - 経理代行（PC）：受け渡しの注記がカードの枠に 3px まで近かった → 2段の間隔 44→60px、注記をカードから 8px 離す。
  - 図の高さは少し増える（390px：創業支援 595→655px、英語 629→689px、バックオフィス 581→641px、クラウド会計 527→587px。いずれも1画面に収まる）。
- `tools/qa/dove-overlap.cjs` に追加：ラベル同士の間隔（12px 以上）、ラベルとカードの枠（4px 以上）、ラベルとパネルの枠線（内側なら縁から・外側ならパネルから 12px 以上）、札とカードの枠（内側に 4px 以上）。修正前のビルドで NG を再現、修正後は 1280・1100・1024・901・768・390 で OK。
- PR 画像：`claude/pr-assets` の `relay-labels/`。

### 10. 【完了】最終検査と最終仕上げ（2026-10-19）
- 依頼：公開中の全ページ（ホーム・サービス一覧・全LP 日英・会社概要・トピックス一覧と各記事・お問い合わせと完了画面・プライバシーポリシー・404・チャット）を、1440〜320 の8幅＋横向き 844×390 で、レイアウト・動作・アニメーション・品質・SEO・文言まで検査し、見つかった問題をすべて直す。
- 修正（すべてマージ済み）：
  - PR #46：メールアドレス（info@）はフッター1か所のみ（お問い合わせページ本文・会社概要の表から削除。CLAUDE.md のルールも更新）、404 の説明文、PC でチャットのボタンがフッターのリンクを覆う件。
  - PR #47：文言の校正（誤字・表記ゆれ・記事内リンクの古いタイトル・英語版の士業の訳語・士業の手続きを COANA TOKYO が行うように読める表現）。
  - PR #48：幅 320〜360px の不自然な改行（リレー型のタグと特徴カードを1列に、ヒーローの特徴の余白、記事カードの見出し、「〇〇年度｜カタカナ」の文節）。
- 検査ツール：`tools/qa/full-check.cjs`（全体検査。README に説明）。そのほか story-test・fj-test・wheel・fj-wheel・toggles・features・a11y・kbd・entry・entry-pages・cls-real・patterns・dove-overlap・dove-perf・contrast・rmcheck・detect・seo.py・e2e-final（チャット）・steps（スマホのキーボード）・hidden-check・Lighthouse（npm の lighthouse を作業領域に入れて実行）。
- できなかったこと：
  - WebKit（Safari 相当）・Firefox：作業環境のネットワーク設定で Playwright のブラウザの取得先（cdn.playwright.dev、playwright.download.prss.microsoft.com）が遮断されていて入れられない。Allowed domains に追加すれば `ENGINES=chromium,webkit,firefox node tools/qa/full-check.cjs` で実行できる。
  - 外部リンク・本番の確認は作業環境から接続できないため、オーナーが本番で実施（下記）。
- 本番での確認（オーナー実施）：外部リンク7件すべて到達可。内部リンク30件すべて 200。22ページ×4幅（320・390・768・1280）で崩れなし（料金プランの表の横スクロールは意図どおり）。
- 本番確認後の追加対応：
  - PR #50：ファビコン（Google 検索結果が旧ロゴのまま）。新しいファイル名の正方形 PNG（`/favicon-v2-48.png`・`-96`・`-192`、manifest 用 `/icon-v2-512.png`）を全ページの head に明示、`/site.webmanifest` を追加、Organization の logo を `/favicon-v2-192.png` に。svg・ico は残す。マージ後、オーナーが Search Console でホームの再インデックスをリクエスト。
    - その後、公式ロゴキット（Drive の「20261014_COANA TOKYO_カラーシンボル.png」2000px 透過）から作り直した画像に差し替え（favicon-v2-48/96/192/512・apple-touch-icon・favicon.ico。URL はそのまま中身だけ）。manifest の 512 と Organization の logo は `/favicon-v2-512.png`。拡大版の `/icon-v2-512.png` は削除。favicon.svg（128px の画像を埋め込んだ軽量版）は公式ロゴと形が一致することを確認済みのため据え置き。
    - www（www.coana.co.jp）でアイコンが 200 で返るかは本番で確認が必要。
  - Cloudflare の Email Obfuscation（Scrape Shield）が静的 HTML の mailto・メールアドレスを `/cdn-cgi/l/email-protection` に書き換え、クローラーには 404 になる件：ビルドで書き出す全ページと 404.html の `<html>` の中身を `<!--email_off-->`〜`<!--/email_off-->` で囲み、書き換えの対象外にした（vite.config.ts の `emailOff`）。表示・動作は変わらない。代わりにオーナーが Cloudflare の管理画面で Email Obfuscation をオフにしてもよい（要判断。オフにすれば、この囲みは不要だが残しても害はない）。
  - 経理代行LPの図のすぐ下の「この仕組みを自社に合わせるには？…無料で相談する」を削除（オーナー回答「ない方がよさそうなら消して」）。ほかのLPにはなく、このあと料金プラン → ご利用までの流れ → FAQ → お問い合わせの帯と続くので相談の導線が重複するため。`scheme.cta` の欄（CMS）と表示の仕組みは残してある。
- 要判断（オーナー）：
  - info@ の例外2つ（プライバシーポリシーの「お問い合わせ窓口」、フォーム送信失敗時のエラー文）は残している。
  - knowledge.md の住所だけ「三橋ビル3F」（ほかは「3F」）。どちらが正しいか確認。
  - LP の期間の目安（2〜4週間・1〜2か月 など）がオーナー了承済みか。
- 改善提案（今回は実装していない）：
  - Web フォントの自己ホスト（サブセット化）：Google Fonts の CSS が表示を止めていて、モバイルの LCP が伸びる。非同期読み込みも試したが、見出しの描き直しで LCP が縮まらず CLS も出たため見送り。
  - 記事の見出し画像を 1680px 以上で登録（PC の高精細画面で少しぼやける。今は 1200px を 840px で表示）。
  - 幅 320px で残る軽い改行（約10か所。意味は読める）。

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
- #39 アニメーションのスタート地点（起点で待機・起点の印・起点が画面に入ってから出発。経路の点線は #41 で廃止）
- #41 HOW IT WORKS をリレー型に作り直し＋全LPの鳩の見直し（軌道を描かない・終点から飛んで戻らない）

## 作業環境のメモ
- **ローカルでの確認**：
  - サイト：`npm run build && npx vite preview --port 4173`
  - チャット：`npx wrangler pages dev dist --port 8788 --binding CHAT_MOCK_AI=1`（AI の代わり）／`--port 8789`（AI なし）
- **PR 用の画像**：`claude/pr-assets` ブランチ（サイトのコードは含まない、画像だけの独立したブランチ）に置き、`https://github.com/ibato-byte/coana-website/blob/<SHA>/<path>?raw=true` を `<img>` で。
- **force push は使わない**（通常の push で）。
