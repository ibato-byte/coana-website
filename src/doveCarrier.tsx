import type { RefObject } from "react";

/* ───────────────────────── 仕組みの図・ご利用までの流れの表示（HOW IT WORKS・FLOW 共通） ─────────────────────────
 * 2026-10-26 オーナー指示：「鳩がデータを運ぶ」アニメーションは「うるさい」という声があったため廃止。
 * 図はすべての工程が点灯した完成形で、最初から静止して見せる（読みやすさを最優先。動きで目を奪わない）。
 * 以前の順路の定義（schemeStory.tsx・flowJourney.ts）はそのまま残すが、ここでは動かさない。
 * 画面に入ったときのやわらかな表示は、ほかの要素と同じ [data-reveal]（motion.ts）に任せる。
 */

export type Cargo = "receipt" | "doc" | "data" | "report" | "mail" | "chat" | "person" | "people" | "card" | "calendar" | "heart" | "check" | "star" | "layout" | "manual" | "target" | "megaphone" | "photo" | "handshake" | "chart" | "refresh" | "payslip" | "contract" | "estimate" | "flowchart";

export type DoveStop = {
  /** 工程のキー（data-story） */
  at: string;
  cargo?: Cargo;
  gold?: boolean;
  event?: "chat" | "check" | "stamp" | "ring" | "page";
};

type Options = {
  verticalQuery: string;
  hold?: boolean;
  cardSelector?: string;
  visibleRatio?: number;
};

/** すべての工程を「済み」の状態で返す（動きはない） */
export function useDoveCarrier(_box: RefObject<HTMLElement | null>, _stops: ((loop: number) => DoveStop[]) | undefined, keys: string[], _opts: Options) {
  const state = (_key: string) => " is-done";
  return { state, layer: null, running: false, still: true, now: null as string | null, done: keys };
}
