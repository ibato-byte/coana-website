import type { RefObject } from "react";
import { useDoveCarrier, type Cargo, type DoveStop } from "./doveCarrier";

/* ───────────────────────── HOW IT WORKS：鳩がデータを運ぶ仕組みのアニメーション（各サービスLP） ─────────────────────────
 * 鳩の動きとタイミングは doveCarrier.tsx で共通。ここでは LP ごとに「運ぶもの」と「順路」だけを決める。
 * 各LPで「このアニメーションで伝えたい一文」（message）を先に決め、それが説明なしで伝わるかで判断する。
 * 工程の指定は、各図のカード（または SVG の要素）に付けた data-story="n0" などのキー。"c" は中心（COANA TOKYO）。
 * 鳩が止まる位置は data-perch（in-tr＝カードの右上の空き／above-tr・above-c＝上の縁の外）。 */

export type Story = {
  /** このアニメーションで伝えたい一文（PR とコードの説明用） */
  message: string;
  /** 一周ぶんの順路と運ぶもの。loop は何周目か（周ごとに例を変えるとき） */
  stops: (loop: number) => DoveStop[];
  /** 通ったら「✓」を付ける工程（一つずつ整っていく様子を見せるとき） */
  checks?: string[];
};

/** バックオフィス代行：領域ごとの荷物（請求書・給与明細・契約書・見積書・フロー図） */
const BO_AREAS: Cargo[] = ["receipt", "payslip", "contract", "estimate", "flowchart"];

export const STORIES: Record<string, Story> = {
  bookkeeping: {
    message: "御社は資料を入れるだけ。入力から月次の締めまで任せられて、毎月レポートが届き、決算用のデータは顧問税理士へ渡る。",
    stops: () => [
      { at: "n0", cargo: "receipt" },
      { at: "n1", cargo: "receipt" },
      { at: "n2", cargo: "data" },
      { at: "n3", cargo: "data" },
      { at: "n4", cargo: "report", gold: true },
      { at: "n5", cargo: "data" },
    ],
  },
  "backoffice-dx": {
    message: "経営者はチャットで依頼するだけ。COANA TOKYO のチームが受けて担当の領域で対応し、完了を報告。手順はマニュアルとして残り、任せるほど仕組みが整う。",
    // 周ごとに、依頼の内容（＝届ける領域と荷物）が変わる：経理→労務・人事→総務・秘書→営業事務→業務整理・DX
    stops: (loop) => {
      const k = loop % BO_AREAS.length;
      return [
        { at: "client", cargo: "chat" },
        { at: "c", cargo: "chat" },
        { at: "n" + k, cargo: BO_AREAS[k] },
        { at: "r0", cargo: "check", event: "check" },
        { at: "r1", event: "page" },
        { at: "client", cargo: "check", gold: true },
      ];
    },
  },
  "cloud-accounting": {
    message: "銀行・カード・請求書のデータが自動で会計ソフトに集まり、顧問税理士と共有され、経営者は翌月早々に数字が分かる。",
    stops: () => [
      { at: "n0", cargo: "card" },
      { at: "n1", cargo: "doc" },
      { at: "n2", via: "c", cargo: "data" },
      { at: "n3", cargo: "data" },
      { at: "n4", via: "c", cargo: "report", gold: true },
    ],
  },
  "startup-support": {
    message: "ひとつの窓口に相談すると、計画・資金・事務・集客・専門家との連携が順番に整い、開業の土台ができあがる。",
    checks: ["n0", "n1", "n2", "n3", "n4"],
    stops: () => [
      { at: "n5", cargo: "chat" },
      { at: "c", cargo: "chat" },
      { at: "n0", cargo: "doc" },
      { at: "n1", cargo: "card" },
      { at: "n2", cargo: "data" },
      { at: "n3", cargo: "megaphone" },
      { at: "n4", cargo: "handshake" },
      { at: "n5", via: "c", cargo: "check", gold: true },
    ],
  },
  "startup-support-en": {
    message: "One point of contact gets your plan, funding, back office, customs and professionals in place, one by one, until your foundation is ready.",
    checks: ["n0", "n1", "n2", "n3", "n4"],
    stops: () => [
      { at: "n5", cargo: "chat" },
      { at: "c", cargo: "chat" },
      { at: "n0", cargo: "doc" },
      { at: "n1", cargo: "card" },
      { at: "n2", cargo: "data" },
      { at: "n3", cargo: "check" },
      { at: "n4", cargo: "handshake" },
      { at: "n5", via: "c", cargo: "check", gold: true },
    ],
  },
  "sales-support": {
    message: "見込み客が、相談→商談→受注まで一本の流れで進み、振り返りが次の一手につながる。",
    stops: () => [
      { at: "n0", cargo: "person" },
      { at: "n1", cargo: "person" },
      { at: "n2", cargo: "chat" },
      { at: "n3", cargo: "doc" },
      { at: "n3", cargo: "star", gold: true },
      { at: "n4", cargo: "chart" },
      { at: "n0", via: "below", cargo: "refresh" },
    ],
  },
  "seminar-event": {
    message: "告知で集まった参加者が、当日の体験と開催後のフォローを経て、お客さまに変わる。",
    stops: () => [
      { at: "n0", cargo: "target" },
      { at: "n1", cargo: "megaphone" },
      { at: "n2", cargo: "people" },
      { at: "n3", cargo: "people" },
      { at: "n4", cargo: "people" },
      { at: "n4", cargo: "handshake", gold: true },
    ],
  },
  "sns-management": {
    message: "計画→投稿→反応の振り返りが毎月まわり、次の月の投稿に活かされていく。",
    stops: () => [
      { at: "n0", cargo: "target" },
      { at: "n1", cargo: "calendar" },
      { at: "n2", cargo: "photo" },
      { at: "n3", cargo: "photo" },
      { at: "n4", cargo: "heart" },
      { at: "n1", via: "below", cargo: "refresh", gold: true },
    ],
  },
  "web-production": {
    message: "目的から原稿・デザインへとサイトが組み上がり、訪れた人が問い合わせにつながる。",
    stops: () => [
      { at: "n0", cargo: "layout" },
      { at: "n1", cargo: "doc" },
      { at: "n2", cargo: "layout" },
      { at: "n3", cargo: "person" },
      { at: "n3", cargo: "mail", gold: true },
      { at: "n4", cargo: "chart" },
    ],
  },
};

/** HOW IT WORKS の図に鳩を飛ばす。verticalQuery：縦に並ぶレイアウトになる幅。hold：工程の説明を開いている間など */
export function useSchemeStory(box: RefObject<HTMLElement | null>, story: Story | undefined, keys: string[], verticalQuery: string, hold = false, route = true) {
  return useDoveCarrier(box, story?.stops, keys, { verticalQuery, hold, rail: "edge", route });
}
