/* ───────────────────────── サポートチャット：サイト内の知識の検索 ─────────────────────────
 * /chat-knowledge.json（ビルド時に vite.config.ts がサイトの全コンテンツから作る）を、質問の言葉で探す。
 * AI に渡す根拠の選び出し（functions/api/chat.ts）と、AI が使えないときのキーワード検索（ブラウザ）の両方で使う。
 * 日本語は単語に区切らず、2文字ずつの並び（バイグラム）で一致を数える。よく出る並びほど重みを下げる。
 */
export type Chunk = { id: string; t: string; u: string; k: string; x: string };
export type Knowledge = { generated: string; site: string; chunks: Chunk[] };

/** 言い換え：お客さまの言葉 → サイトで使っている言葉（検索語に足す） */
const SYNONYMS: [RegExp, string][] = [
  [/料金|費用|値段|価格|いくら|金額|予算|月額|安い|高い/, "料金 お見積もり"],
  [/記帳|仕訳|帳簿|会計|経理/, "経理 記帳 会計"],
  [/起業|開業|独立|会社を作|法人化|設立/, "創業 起業"],
  [/ホームページ|ＨＰ|HP|サイト|ウェブ|LP/i, "Webサイト制作"],
  [/インスタ|Instagram|X（|ツイッター|TikTok|Facebook|発信/i, "SNS運用"],
  [/営業|販路|売上|新規顧客|顧客開拓/, "営業 販路開拓"],
  [/セミナー|講座|研修|講師|登壇|イベント/, "セミナー イベント"],
  [/freee|フリー/i, "freee クラウド会計"],
  [/マネーフォワード|マネフォ|MF/i, "マネーフォワード クラウド会計"],
  [/税理士/, "税理士 士業 専門家"],
  [/社労士|社会保険|労務|給与|勤怠/, "労務 社会保険 給与"],
  [/英語|English|外国/i, "英語 English"],
  [/地域|エリア|地方|全国|遠方|オンライン|来社|訪問/, "対応エリア 全国 オンライン"],
  [/代表|社長|経歴|プロフィール|どんな人/, "代表プロフィール 代表メッセージ"],
  [/所在地|住所|場所|どこに|オフィス|事務所|会社概要|設立/, "所在地 会社概要"],
  [/創業前|起業前|開業前|これから/, "創業支援 これから起業する方"],
  [/個人情報|プライバシー|情報の扱い/, "プライバシーポリシー 個人情報"],
  [/流れ|始め|進め方|手順|申し込み|依頼方法/, "流れ ご利用"],
  [/一部|だけ|少し|部分/, "一部 必要な分だけ"],
  [/対応.*ツール|ツール.*対応|使えるツール|どんなツール|どのツール|使っているソフト/, "対応ツール freee マネーフォワード クラウド Odoo"],
  [/ツール|ソフト|システム|ERP|Odoo|kintone/i, "ツール 導入"],
];

const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
const JA = /[ぁ-ゖァ-ヺー一-龠々]/;

/** 検索に使う言葉のかけら：日本語は2文字ずつ、英数字は単語ごと */
export function grams(text: string): string[] {
  const out: string[] = [];
  const t = normalize(text);
  for (const word of t.match(/[a-z0-9][a-z0-9.+-]*/g) ?? []) if (word.length >= 2) out.push(word);
  const ja = t.replace(/[^ぁ-ゖァ-ヺー一-龠々]+/g, " ");
  for (const run of ja.split(" ")) {
    if (run.length === 1 && /[一-龠]/.test(run)) out.push(run);
    for (let i = 0; i + 1 < run.length; i++) out.push(run.slice(i, i + 2));
  }
  return out;
}

/** 質問の言葉に言い換えを足す */
export function expandQuery(query: string) {
  let q = query;
  for (const [re, add] of SYNONYMS) if (re.test(query)) q += " " + add;
  return q;
}

type Index = { docs: { chunk: Chunk; title: Set<string>; body: Map<string, number> }[]; df: Map<string, number> };
const cache = new WeakMap<Knowledge, Index>();

function indexOf(knowledge: Knowledge): Index {
  const hit = cache.get(knowledge);
  if (hit) return hit;
  const df = new Map<string, number>();
  const docs = knowledge.chunks.map((chunk) => {
    const body = new Map<string, number>();
    for (const g of grams(chunk.t + " " + chunk.x)) body.set(g, (body.get(g) ?? 0) + 1);
    for (const g of body.keys()) df.set(g, (df.get(g) ?? 0) + 1);
    return { chunk, title: new Set(grams(chunk.t)), body };
  });
  const index = { docs, df };
  cache.set(knowledge, index);
  return index;
}

/** 質問に近い順に、知識のかたまりを返す（score > 0 のものだけ） */
export function search(knowledge: Knowledge, query: string, limit = 5): { chunk: Chunk; score: number }[] {
  const { docs, df } = indexOf(knowledge);
  const n = docs.length || 1;
  const q = [...new Set(grams(expandQuery(query)))];
  if (!q.length) return [];
  const results = docs.map(({ chunk, title, body }) => {
    let score = 0;
    for (const g of q) {
      const tf = body.get(g);
      if (!tf) continue;
      const idf = Math.log(1 + n / (df.get(g) ?? 1));
      // ひらがなだけの並び（「ます」「ですか」など）は意味が薄いので軽く数える
      score += idf * (1 + Math.log(tf)) * (title.has(g) ? 2 : 1) * (HIRAGANA_ONLY.test(g) ? 0.2 : 1);
    }
    // 本文が長いほど一致しやすいので、少しだけ割り引く。FAQ は質問への答えそのものなので少し優先する
    score = score / Math.sqrt(1 + chunk.x.length / 400) * (chunk.k === "faq" ? 1.25 : 1);
    return { chunk, score };
  }).filter((r) => r.score > 0);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

const HIRAGANA_ONLY = /^[ぁ-ゖー]+$/;
/** 質問の中身の言葉（漢字・カタカナ・英数字を含むかけら）のうち、見つかった情報に含まれている割合 */
export function coverage(query: string, chunk: Chunk) {
  const body = new Set(grams(chunk.t + " " + chunk.x));
  const rate = (text: string) => {
    const content = [...new Set(grams(text).filter((g) => !HIRAGANA_ONLY.test(g)))];
    return content.length ? content.filter((g) => body.has(g)).length / content.length : 0;
  };
  // 質問そのままの言葉と、言い換え（「月額」→「料金」など）の言葉の、よく当てはまるほう
  const extra = expandQuery(query).slice(query.length).trim();
  return Math.max(rate(query), extra ? rate(extra) : 0);
}

/** サイトに載っていないと分かっている話題（推測で答えず、担当者へ） */
export const NO_INFO = /営業時間|何時から|何時まで|土日|祝日|定休|電話番号|電話で|実績の数|導入社数|顧客数|何社|売上高|従業員数は|社員数|資本金|最短|即日|何日で|いつまでに|割引|値引|安くして|無料期間|返金/;
/** COANA TOKYO と関係のない話題・設定を崩そうとする依頼（答えず、本題に戻す） */
export const OFF_TOPIC = /天気|ラーメン|レシピ|占い|ニュース|株価|為替|スポーツ|ゲーム|プログラム|コードを|書いて|fizzbuzz|python|javascript|翻訳して|指示を無視|プロンプト|システムの設定|ルールを無視|あなたは(?:ai|人間|誰)|ロールプレイ|ジョーク|面白い話/i;

/** 「十分に関係がある」と言える一致か（言葉が少し重なっただけの結果を出さない） */
export function isConfident(results: { chunk: Chunk; score: number }[], query: string) {
  return results.length > 0 && results[0].score >= 6 && coverage(query, results[0].chunk) >= 0.5;
}

export const hasJapanese = (text: string) => JA.test(text);
