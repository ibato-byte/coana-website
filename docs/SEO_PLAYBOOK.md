# SEO プレイブック（毎週の自動ブラッシュアップ）

coana.co.jp を「いつも最良の SEO の状態」に保つための、毎週の点検と改善の決まりごと。
毎週月曜の朝に Claude の週次タスクがこの文書に従って動く。人が手で行うときも同じ手順でよい。

**大前提：CLAUDE.md の方針をすべて引き継ぐ。** SEO のためにこれを曲げることはしない。
迷ったら「変えない」。何も直すものがない週は、無理に変えずにレポートだけ残す。

---

## 1. 仕組みの全体

| いつ | だれが | 何をする |
| --- | --- | --- |
| 毎日 6:17（日本時間） | GitHub Actions「SEO の監視」（`.github/workflows/seo-monitor.yml`） | 本番を点検（全ページの 200・title／description・canonical・構造化データ・内部リンク切れ・画像・sitemap・robots・llms.txt・ファビコン）。NG があれば Issue（ラベル `seo-alert`）を立てる。解消したら自動で閉じる。**直さない** |
| 毎週月曜 5:37 | 同上（週次） | 上に加えて外部リンクの生存確認と表示速度（Lighthouse・PageSpeed Insights、モバイル）。結果を Issue（ラベル `seo-data`）に JSON で残す |
| 毎週月曜 8:54 | Claude の週次タスク（スケジュールタスク「COANA SEO 週次ブラッシュアップ」`trig_01RrZBY7DC79EtMXno9werew`。専用セッション `session_01HbxZBk1N9D7dtypAM8AM36` に毎週届く。通知はプッシュのみ） | この文書の「2. 毎週の手順」。技術面は直して自動マージ、文章は「要承認」の PR、レポートを残してオーナーに要約を通知 |
| 2週に1回（週次タスクの中で） | 同上 | コラムを1本書き、品質ゲートに合格したら「コラム公開待ち」の PR を作る。オーナーに確認メールが届き、ボタンで公開／見送り（「8. コラムの自動作成」） |

- クラウドの作業環境からは本番（coana.co.jp）に直接つながらない。本番の数値は GitHub Actions が Issue に残したものを `tools/seo/fetch-prod-data.mjs` で受け取る。
- Search Console のデータ（検索クエリ・表示回数・インデックス状況）は使えない前提。必要ならオーナーが確認する。
- 費用：すべて無料枠（GitHub Actions の無料枠、Lighthouse、PageSpeed Insights の無料 API）。有料の API キーや追加課金が出る方法は使わない。

## 2. 毎週の手順（週次タスク）

1. **読む**：`CLAUDE.md` → `docs/HANDOFF.md` → この文書 → 前回のレポート（`docs/seo-reports/` の最新）。
2. **点検**：`bash tools/seo/weekly.sh`（ビルド → ローカル点検 → 本番データの取得 → レポートの下書き `docs/seo-reports/YYYY-MM-DD.md`）。
   - あわせて確認：開いている Issue（`seo-alert`）、前回の「要承認」PR の状態（マージ済み／放置）。
3. **仕分け**：見つかったものを「3. 線引き」で A（自動で直す）／B（要承認）／C（見送り）に分ける。
4. **A：技術面を直す**（小さな PR を1本。関係のない修正を混ぜない。多くても1回に5件程度まで）
   - ブランチ `claude/seo-auto-YYYYMMDD` → 修正 → `NO_REPORT=1 bash tools/seo/weekly.sh` で再点検 → **`bash tools/seo/run-tests.sh` が「全テスト合格」**。
   - PR（ラベル `seo-auto`）→ Cloudflare Pages のチェックが成功 → マージ（squash）。
   - **1つでも不合格ならマージしない**。PR は開いたまま、レポートと要約に理由を書く（直せる範囲なら直して再テスト）。
5. **B：文章の改善案**は別の PR（ブランチ `claude/seo-proposal-YYYYMMDD`、ラベル **`要承認`**）。**マージしない**。
   - PR の本文に「なぜ（点検の根拠）」「変更前 → 変更後」「CLAUDE.md の方針に反しない理由」を書く。テストは通しておく。
   - 前回の「要承認」PR がまだ開いていれば、同じ内容を重ねて出さない（必要なら同じ PR に追記）。1週に1本まで。
6. **レポート**：`docs/seo-reports/YYYY-MM-DD.md` の「今回の対応」に、A（PR とマージの結果）・B（PR）・C（理由）を書く。
   レポートは A の PR に入れる（A がない週はレポートだけの PR を作り、同じ条件でマージしてよい：文書だけの変更）。
7. **HANDOFF**：`docs/HANDOFF.md` の「SEO の週次」に、日付・結果・残っていること を1〜3行で追記。
8. **要約**：オーナー向けに日本語で短く（5〜10行）：直したもの／承認してほしいもの（PR のリンク）／気になる数値の変化／オーナーにしかできないこと。

## 3. 線引き：自動で直してよいもの／承認が必要なもの

### A. 自動で直してマージしてよい（技術面。テストがすべて合格したときだけ）

人が読む文章を変えないもの。表示（デザイン・アニメーション）も変えないもの。

- メタ情報の**仕組み**：canonical の欠け・誤り、og:url・og:image・twitter:card の欠け、hreflang、`<html lang>`、noindex の誤り（例：sitemap にあるのに noindex）
- 構造化データ（JSON-LD）の構文エラー、欠けている必須項目、BreadcrumbList の追加、サイトの内容と一致している事実だけを使った項目の補完（**新しい主張・数字・評価（星）は足さない**）
- sitemap.xml（重複・漏れ・lastmod）、robots.txt、llms.txt、feed.xml、site.webmanifest、ファビコン の不備
- 内部リンクのリンク切れ・転送を挟むリンク → 正しい URL に（リンクの文言は変えない）。旧 URL の転送（`public/_redirects`）の追加
- 画像：alt の欠け（画像の内容をそのまま説明する短い alt。キーワードを詰めない）、width／height の欠け、大きすぎる画像の圧縮・適切なサイズ（見た目を変えない）
- 表示速度：見た目と動きを変えない最適化（画像の圧縮、読み込みの優先度、preload／preconnect、キャッシュのヘッダー、未使用のファイルの整理 など）。CLS を増やさないこと
- アクセシビリティの技術的な修正（aria 属性、ラベルの関連付け、見出しの階層の誤り）で、見た目と文言を変えないもの
- ビルド（`vite.config.ts`）の書き出しの不具合（クローラー向け本文 `.seo-fallback`・構造化データ・sitemap などの生成）
- 点検ツール（`tools/seo`）自体の誤検出の修正

### B. 承認が必要（「要承認」ラベルの PR。マージしない）

人が読む表現・意味が変わるもの。

- title・description・見出し・本文・ボタンなどの**文言**（長さの調整も含む）
- サービス説明、FAQ の追加・変更、コラム記事の案（記事は `docs/column-guide.md` に従う。公開日は未来の日付で予約にしておく）
- 構造化データで新しい種類の情報を出すこと（例：Service の詳しい説明、FAQ の追加）
- 画像の差し替え・追加、ページの追加・削除・URL の変更
- デザインやレイアウトに少しでも影響する変更
- A か B か迷うもの（→ B にする）

### C. やらない（見送り、またはオーナーに相談）

- デザイン・アニメーション・ヒーロー・ページ構成の変更（オーナーが決めたもの）
- 外部サービスの追加、有料のツール、Search Console など設定画面での操作（必要ならオーナーへの依頼としてレポートに書く）
- 下の「4. 守ること」に反するもの

## 4. 守ること

### CLAUDE.md の方針（すべて引き継ぐ）
- 見やすさ・分かりやすさが最優先。読みやすさ・上品さを損なわない。WCAG AA。
- **数字・実績を捏造しない**（サイトにない数字は使わない。「月70時間削減」のような根拠のない数字は NG）。
- **電話番号は載せない**。メールアドレス（info@）はフッター1か所のみ（例外：プライバシーポリシーのお問い合わせ窓口、フォーム送信失敗時のエラー文）。
- **税理士・社労士などの士業の独占業務を COANA TOKYO が行うように見せない**（提携の専門家を紹介する立場）。
- 代表の紹介は会社概要ページだけ。相談の導線を重複させない。
- **デザイン・アニメーションは変えない**（docs/motion-rules.md）。オーナーが決めた文言は勝手に変えない（変えるなら B）。

### Google のガイドラインに反することはしない
- [スパムに関するポリシー](https://developers.google.com/search/docs/essentials/spam-policies)：キーワードの詰め込み、隠しテキスト・隠しリンク、クローキング（クローラーと人で違う内容）、誘導ページ、自動生成の薄いページ、リンクの売買・相互リンク集、偽のレビュー・評価の構造化データ — どれもしない。
  - クローラー向け本文（`.seo-fallback`）は**画面に表示されている内容と同じもの**だけにする（追加のキーワードを入れない）。
- [ユーザーを第一に考えた、役に立つコンテンツ](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)：検索エンジンのためでなく、初めての中小企業の経営者のために書く。経験・専門性・信頼性（E-E-A-T）を、事実だけで示す。
- [構造化データのガイドライン](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)：ページに表示されている内容と一致することだけを書く。
- 文章の改善でも、同じ言葉を不自然にくり返さない。title は「ページの内容が分かる」ことを優先し、会社名は後ろに。

## 5. 点検の項目と目安（`tools/seo/check-site.mjs`）

| 項目 | NG（直す） | 注意（確認・提案） |
| --- | --- | --- |
| 応答 | sitemap の URL が 200 でない、存在しない URL が 404 を返さない | 内部リンクが転送を挟む |
| title | ない、重複 | 全角換算 40 文字超（検索結果で切れる）、10 文字未満 → 文言なので B |
| description | ない、重複 | 50 文字未満・160 文字超 → B |
| canonical | ない、別の URL、coana.co.jp でない | og:url と違う |
| robots | sitemap のページに noindex、robots.txt で全体を拒否、Sitemap 行がない | 404 ページに noindex がない |
| OGP | og:title・og:description・og:image がない、画像が 200 でない | twitter:card がない |
| 構造化データ | JSON-LD の構文エラー | ない、BreadcrumbList がない |
| 見出し | h1 が1つでない（クローラー向け本文） | — |
| リンク | 内部リンク切れ、外部リンクが 404／410 | 外部リンクにつながらない（一時的なことが多い） |
| 画像 | 実在しない、alt がない | 400KB 超 |
| 内容 | 電話番号、Cloudflare のメール書き換え（`/cdn-cgi/l/email-protection`） | llms.txt に漏れているページ |
| 本番のみ | http→https の転送がない | www の扱い、ヘッダー |
| 表示速度（Lighthouse・モバイル） | — | Performance・LCP・CLS が前回より悪化、SEO・Accessibility が 100 未満 |

表示速度の目安（Core Web Vitals、モバイル）：LCP 2.5 秒以内、INP 200ms 以内、CLS 0.1 以内（実際の利用者の p75）。
Lighthouse の数値は回線や計測環境で揺れる。1回の悪化で慌てず、2週続けて悪化したら原因を調べる。

## 6. テスト（自動マージの条件）

`bash tools/seo/run-tests.sh` の「全テスト合格」と、PR の Cloudflare Pages のチェック成功の両方。
中身：`tools/seo/check-site.mjs`（ローカル、NG 0）、`tools/qa/full-check.cjs`（全ページ × 8幅＋横向き）、`story-test`、`wheel`、`a11y`。
重いテストは同時に走らせない。テストを飛ばす・弱める・書き換えて通すことはしない（点検ツールの誤検出を直すときは、その理由を PR に書く）。

## 7. オーナーにお願いすること（任意）

- PageSpeed Insights の無料 API キー（Google Cloud で作成。課金の設定は不要）を、GitHub のリポジトリの Settings → Secrets and variables → Actions に `PSI_API_KEY` として登録すると、実際の利用者のデータ（Chrome UX Report）が毎週安定して取れる。なくても Lighthouse の値で動く。
- クラウドの作業環境の Network access（Allowed domains）に `coana.co.jp` を追加すると、週次タスクが本番を直接確かめられる（今は GitHub Actions 経由）。
- 「要承認」の PR は、内容を確認してマージ（または閉じる）。放置されている間は、同じ提案を重ねて出さない。

## 8. コラムの自動作成（2週に1本・チェック合格で自動公開）

> **2026-10-20 からの公開のしかた**：オーナーが Actions「コラムの自動公開」（`.github/workflows/column-auto-publish.yml`）を追加。「コラム公開待ち」ラベルが付いた、オーナーのアカウント名義でこのリポジトリのブランチから作られた PR は、ほかのチェック（Cloudflare Pages など）がすべて合格すると自動でマージ＝公開される（1つでも失敗したら公開しない）。下の確認メールとボタンも動くが、自動公開が先に済むことが多い。**そのため、PR を作る前の品質ゲート（2.）が実質的な最後の関門。** 公開後に取り下げたいときは、記事を削除する PR（または `draft`）で対応する。

### 流れ

1. **週次タスクが書く**（2週に1本）：[seo-content-plan.md](seo-content-plan.md) の「記録」で最後に作った日から **14日以上** たち、「コラム公開待ち」の PR が開いていなければ、テーマ一覧から1つ選んで書く。書き方は [column-guide.md](column-guide.md) と既存のコラムと同じ型（導入・結論・本文・図解2〜4点・チェックリスト・よくある失敗・まとめ・CTA・著者欄）。
   - ファイル：`content/topics/<作成日YYYYMMDD>-<slug>.md`、`date` は作成日（日本時間）。PR がマージされた時点で表示される。
   - 図解：`public/images/topics/<slug>/*.svg`（column-guide.md「4. 図解の作り方」）。PNG に描画して、はみ出し・重なりを目で確かめる。
   - 見出し画像：`node tools/column/thumbnail.mjs --file <記事> --line1 … --line2 … --sub …`（既存と同じ型の 1200×675）。
   - 構造化データ（Article）・sitemap・feed・llms.txt・チャットの知識は、ビルド時に記事から自動で作られる（追加の作業なし）。
2. **品質ゲート**（1つでも不合格なら、その回は出さない。レポートに理由を書き、次回に回す）
   - ① **事実の確認**：法制度・補助金・税・期限・相場などは、一次情報（国税庁・各省庁・自治体・公的機関・製品の公式ヘルプ）で確かめ、本文に出典リンクと「〇年〇月時点」を書く。作業環境から官公庁のサイトは開けないことがあるので、WebSearch（公式ドメインに絞る）で本文を確かめる。**確かめられない事実は書かない**（言い切れないなら、その段落ごと削る）。
   - ② **禁止事項**：実績・数字・お客様の声の捏造、「月70時間削減」のような根拠のない数字、電話番号、士業の独占業務に当たる具体的な判断（「節税になります」「申告は不要です」等）、他社批判、キーワードの詰め込み、AI っぽい定型文（「いかがでしたか」等）、著作物の転載（引用は必要最小限で出典つき）。
   - ③ **機械チェック**：`node tools/column/check-column.mjs <記事> --keyword "<狙う検索語>"` が合格。
   - ④ **別のレビュー担当**：執筆とは別のサブエージェント（Agent ツール）に、記事・出典・このゲートを渡して厳しくレビューさせる（事実と出典の一致、禁止事項、読者に役立つか、読みやすさ、既存記事との重複、サイトのサービス内容との食い違い）。指摘はすべて直し、重大な指摘が残るなら出さない。
   - ⑤ **全テスト合格**：`bash tools/seo/run-tests.sh`（ローカル点検 NG 0、full-check、story-test、wheel、a11y）。
3. **PR を作る**（マージしない）：ブランチ `claude/column-YYYYMMDD-<slug>`、タイトル `【コラム公開待ち】<記事タイトル>`、ラベル **`コラム公開待ち`**。本文に次の見出しを必ず入れる（確認メールにそのまま載る）：
   - `## 要約`（3〜5行：誰向けに・何が分かるか）
   - `## 出典`（一次情報のリンクと、確認した日・時点）
   - `## レビュー結果`（レビュー担当の指摘と対応、品質ゲートの結果）
   - あわせて seo-content-plan.md の「状態」と「記録」を更新する。
   - PR 本文の出典は「- [名前](URL)」で行を終え、説明は次の行に書く（URL の直後に文字を続けると、作業環境から GitHub に書き込むときにリンクが崩れることがある）。本文の最後は「## その他」などの見出しにして、確認メールに載る3つの節の範囲をはっきりさせる。
4. **確認メール**：GitHub Actions「コラムの公開確認」（`.github/workflows/column-approval.yml`）が、Cloudflare Pages のチェック合格を待ってから、PR に @ibato-byte 宛てのコメントを付ける。PR の作成者であるオーナーに GitHub から通知メールが届く（ibato@coana.co.jp。2026-10-19 に、PR のコメントの通知がこのアドレスに届いていることを確認済み）。メールには、タイトル・要約・出典・レビュー結果・「記事を読む（プレビュー）」・「▶ 公開する」・「見送る」が載る。
5. **オーナーがボタンを押す**：リンクの先（`https://coana.co.jp/column-approval`、`functions/column-approval.ts`）は確認画面。そこでもう一度ボタンを押すと実行される（メールソフトのリンク先読みでは実行されない）。
   - 公開する → PR をマージ（main に入り、本番に自動で公開。数分）。完了画面に「公開しました」。
   - 見送る → PR をクローズ（公開しない）。完了画面に「見送りました」。
   - 安全のしくみ：署名付き（HMAC）・期限14日・PR ごと・コミットごと（記事が更新されると古いリンクは無効、新しいメールが届く）・一度だけ（実行後は PR が閉じる）・「コラム公開待ち」ラベルの PR だけ・main へのマージだけ・チェックがすべて合格しているときだけ。テスト：`node tools/column/approval.test.mjs`。

### オーナーの設定（最初に1回）

| # | どこで | 何をする |
| --- | --- | --- |
| 1 | パスワード管理アプリなど | 長いランダムな文字列（40文字以上）を1つ作る。これが「公開ボタンの合言葉」（COANA TOKYO 以外に教えない） |
| 2 | GitHub → 右上のアイコン → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token | 名前「coana-column-approval」、有効期限 1年、Repository access「Only select repositories」で `ibato-byte/coana-website` だけ。Permissions（Repository）：**Pull requests：Read and write**、**Contents：Read and write**、**Checks：Read-only**（一覧にない場合は不要。Metadata は自動）。作成したトークンを控える |
| 3 | Cloudflare ダッシュボード → Workers & Pages → coana-website → Settings → Variables and Secrets（**Production**） | 「Add」で種類を **Secret** にして2つ登録：`COLUMN_APPROVAL_SECRET`＝1の文字列、`GITHUB_COLUMN_TOKEN`＝2のトークン。保存後、次のデプロイ（main への次のマージ、またはダッシュボードの「Retry deployment」）から有効 |
| 4 | GitHub → リポジトリ coana-website → Settings → Secrets and variables → Actions → New repository secret | `COLUMN_APPROVAL_SECRET`＝1と同じ文字列 |

- 確認メールを送る前に、Actions が本番の公開ボタン（確認画面）を開いて動作を確かめ、結果をメールに書く。毎日の監視（SEO の監視）も、本番に設定があるか（でたらめな署名に 400 を返すか）を確かめる。
| 5 | GitHub → Settings → Notifications | 「Default notifications email」が ibato@coana.co.jp、「Participating, @mentions and custom」で Email にチェック（確認済み。変えた場合だけ見直す） |

- 設定がまだのときも、確認メール（プレビューのリンクつき）は届く。その場合は GitHub でその PR をマージすれば公開、クローズすれば見送り。設定したあとに Actions「コラムの公開確認」を PR 番号で手動実行すると、ボタン付きのメールが改めて届く。
- トークンの期限が切れたら、2 で作り直して 3 の `GITHUB_COLUMN_TOKEN` を差し替える（確認画面に「GitHub に接続できませんでした」と出る）。

### 取り下げ

- **公開前**：メールの「見送る」、または GitHub でその PR をクローズする。
- **公開後**：GitHub の PR 画面の「Revert」で取り消しの PR を作ってマージする（記事・画像が消える）。または、`content/topics/<記事>.md` の `draft: false` を `true` にしてマージ（CMS の /admin からも変更できる）。どちらも数分で本番から消える。検索結果から早く消したいときは Search Console の「削除」も使う。
- **仕組みごと止める**：週次タスクのプロンプトから「コラム」の手順を外す（スケジュールタスクの画面で編集）か、`docs/seo-content-plan.md` のテーマをすべて「保留」にする。公開ボタンを無効にするときは、Cloudflare の `COLUMN_APPROVAL_SECRET` を削除する。

## 9. Automation Hub への記録

- 週次タスク（台帳 `seo-weekly`・`column-auto`）と「SEO の監視」（台帳 `seo-monitor`）は、実行ごとに Automation Hub（https://automation-hub.pages.dev、リポジトリ `ibato-byte/automation-hub`）に結果を記録し、オーナーからの指示（Issue）を開始時に読む。約束ごとは automation-hub の docs/HUB_PROTOCOL.md。
- 週次タスク：プロンプトの H1（開始時：inbox。一時停止中なら何もしない）と H2（終了時：report・done）。docs/weekly-task-prompt.md。
- 「SEO の監視」：最後のステップで `tools/seo/hub-report.mjs` が NG・注意・ページ数を記録（Actions の Secrets `HUB_TOKEN` がなければ何もしない。記録に失敗しても監視の結果は変えない）。
- Hub の指示でも、この文書の線引き（技術面だけ自動マージ・文章は要承認・コラムはオーナーの公開ボタン）と CLAUDE.md の方針は変わらない。
