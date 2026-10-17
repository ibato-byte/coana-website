/* ───────────────────────── お問い合わせ系の主ボタン（.button-wing）の細かな動き ─────────────────────────
 * - カーソルの位置に合わせて、ボタンが数pxだけカーソルへ引き寄せられる（--mx / --my）
 * - カーソルが入ってきた位置から、わずかに深い色の塗りが広がる（--fx / --fy。出ていくときは出ていく位置へ縮む）
 * - 押した瞬間に翼が一度だけ強く羽ばたく（.is-flap）。ページの移動は遅らせない
 * マウスなど細かく指せる端末だけで動かし、タッチ端末と「動きを減らす」設定では何もしない。見た目は index.css の .button-wing。
 * ボタンごとに処理を付けず、document で受けて対象のボタンを探す（ページを移動しても付け直さなくてよい）。
 */
const MAX_X = 3; // 引き寄せの最大量（px）
const MAX_Y = 2.5;

export function installButtonFx() {
  if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const buttonOf = (e: Event) => (e.target instanceof Element ? (e.target.closest(".button-wing") as HTMLElement | null) : null);
  const crossed = (button: HTMLElement, e: PointerEvent) => !(e.relatedTarget instanceof Node && button.contains(e.relatedTarget));
  const setOrigin = (button: HTMLElement, e: PointerEvent) => {
    const r = button.getBoundingClientRect();
    button.style.setProperty("--fx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
    button.style.setProperty("--fy", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
  };

  document.addEventListener("pointerover", (e) => {
    const button = buttonOf(e);
    if (button && crossed(button, e)) setOrigin(button, e);
  });
  document.addEventListener("pointerout", (e) => {
    const button = buttonOf(e);
    if (!button || !crossed(button, e)) return;
    setOrigin(button, e);
    button.style.setProperty("--mx", "0px");
    button.style.setProperty("--my", "0px");
  });

  let frame = 0;
  let last: PointerEvent | null = null;
  document.addEventListener("pointermove", (e) => {
    if (reduce.matches || !buttonOf(e)) return;
    last = e;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const button = last && buttonOf(last);
      if (!button || !last) return;
      const r = button.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (last.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const dy = Math.max(-1, Math.min(1, (last.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      button.style.setProperty("--mx", (dx * MAX_X).toFixed(2) + "px");
      button.style.setProperty("--my", (dy * MAX_Y).toFixed(2) + "px");
    });
  }, { passive: true });

  const flap = (button: HTMLElement) => {
    button.classList.remove("is-flap");
    void button.offsetWidth; // 続けて押したときも羽ばたきを最初から再生する
    button.classList.add("is-flap");
    window.setTimeout(() => button.classList.remove("is-flap"), 520);
  };
  document.addEventListener("pointerdown", (e) => {
    const button = buttonOf(e);
    if (button && !reduce.matches && e.button === 0) flap(button);
  });
  // キーボード（Enter）で押したとき（detail が 0 の click）も羽ばたく
  document.addEventListener("click", (e) => {
    const button = buttonOf(e);
    if (button && !reduce.matches && e.detail === 0) flap(button);
  });
}
