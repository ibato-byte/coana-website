/* ───────────────────────── 説明を読んでいる間だけ、繰り返すアニメーションを止める ─────────────────────────
 * 図のカード（工程・ステップ）に「実際にカーソルを動かして合わせた」とき、またはキーボードでフォーカスしたときだけ止める。
 * - セクションに入っただけでは止めない（ホイールでスクロールすると、止まったカーソルの下に図が入ってきて
 *   pointerenter が起きるため。以前はこれで「マウスを動かさないと動かない」状態になっていた）。
 * - 判定はカードの上での pointermove。動いた量が 0 のもの（スクロールに伴う位置の更新）は数えない。
 * - カーソルが止まったまま約2.5秒たったら再開する。カードの外へ出たとき・フォーカスが外れたときも再開。
 * 状態が変わるたびに onChange を呼ぶ（呼び出し側は、待っている処理を起こして再評価する）。 */

const IDLE_MS = 2500;

export function watchReading(el: HTMLElement, cardSelector: string, onChange: () => void) {
  let pointer = false;
  let focus = false;
  let idle = 0;
  const set = (next: boolean) => {
    if (next !== pointer) { pointer = next; onChange(); }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as Element | null)?.closest?.(cardSelector);
    if (!card || !el.contains(card)) { window.clearTimeout(idle); set(false); return; }
    if (!e.movementX && !e.movementY) return; // スクロールに伴う位置の更新は「読んでいる」に数えない
    set(true);
    window.clearTimeout(idle);
    idle = window.setTimeout(() => set(false), IDLE_MS);
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(idle);
    set(false);
  };
  const onFocusIn = (e: FocusEvent) => {
    const t = e.target as Element | null;
    const next = !!t?.closest?.(cardSelector) && t.matches(":focus-visible");
    if (next !== focus) { focus = next; onChange(); }
  };
  const onFocusOut = () => {
    if (focus) { focus = false; onChange(); }
  };
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("focusin", onFocusIn);
  el.addEventListener("focusout", onFocusOut);
  return {
    reading: () => pointer || focus,
    stop: () => {
      window.clearTimeout(idle);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    },
  };
}
