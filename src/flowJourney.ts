import type { RefObject } from "react";
import { useDoveCarrier, type DoveStop } from "./doveCarrier";

/* ───────────────────────── ご利用までの流れ（FLOW）：お客さまの「相談」を鳩が運んでいく ─────────────────────────
 * HOW IT WORKS と同じ鳩（doveCarrier.tsx）が、相談の手紙をくわえてステップを進み、各ステップで小さな出来事が起きる。
 *   お問い合わせ … 手紙を持って起点に止まる
 *   ヒアリング   … 吹き出しが2つ、交互に言葉を交わす
 *   ご提案・お見積もり … 手紙が提案書に持ち替わる
 *   準備        … 提案書にチェック
 *   ご契約      … 提案書に印
 *   スタート    … 提案書が黄色の「✓」に（始まった）
 *   改善・伴走  … 丸のまわりに「続いていく」輪
 *   最後は鳩が空へ飛び立って、また起点から。
 * 鳩は丸の上の余白に止まり、文字・番号には重ならない（スマホは丸の列の中を、丸の後ろをくぐって進む）。 */

type Kind = "inquiry" | "hearing" | "proposal" | "prepare" | "contract" | "start" | "after";

/** ステップ名から、そのステップで起きる出来事を決める（日本語・英語） */
export function journeyKinds(name: string): Kind[] {
  // 開始後のステップ（改善・定着・伴走・公開後の運用など）は「続いていく」だけ
  if (/改善|定着|伴走|後の運用|フォロー|ongoing/i.test(name)) return ["after"];
  const k: Kind[] = [];
  if (/問い合わせ|相談|consultation/i.test(name)) k.push("inquiry");
  if (/ヒアリング|hearing/i.test(name)) k.push("hearing");
  if (/提案|見積|quote|roadmap|proposal/i.test(name)) k.push("proposal");
  if (/準備|整備|設定|移行|棚卸|原稿|デザイン|preparation|plan and/i.test(name)) k.push("prepare");
  if (/契約|contract/i.test(name)) k.push("contract");
  if (/スタート|開始|開催|公開|立ち上げ|launch|start/i.test(name)) k.push("start");
  return k;
}

/** ステップの並びから、鳩の順路・運ぶもの・出来事を作る */
function journeyStops(names: string[]): DoveStop[] {
  return names.map((name, i) => {
    const k = journeyKinds(name);
    const stop: DoveStop = { at: "n" + i };
    if (i === 0) stop.cargo = "mail";
    if (k.includes("proposal")) stop.cargo = "doc";
    if (k.includes("start")) { stop.cargo = "check"; stop.gold = true; }
    // 出来事は1つだけ（いちばん大事なもの）
    stop.event = k.includes("hearing") ? "chat" : k.includes("contract") ? "stamp" : k.includes("prepare") ? "check" : k.includes("after") ? "ring" : undefined;
    return stop;
  });
}

export function useFlowJourney(box: RefObject<HTMLElement | null>, names: string[], enabled: boolean) {
  const stops = enabled ? STOPS_CACHE.get(names.join("|")) ?? cache(names) : undefined;
  return useDoveCarrier(box, stops, names.map((_, i) => "n" + i), { verticalQuery: "(max-width: 980px)", cardSelector: ".flowx-step", visibleRatio: 0.35 });
}

// 順路の関数は、同じステップの並びなら同じものを使う（再描画で作り直さない）
const STOPS_CACHE = new Map<string, () => DoveStop[]>();
function cache(names: string[]) {
  const list = journeyStops(names);
  const fn = () => list;
  STOPS_CACHE.set(names.join("|"), fn);
  return fn;
}
