/* ───────────────────────── お問い合わせ系の主ボタン（.button-fly）の動き ─────────────────────────
 * - 矢印 → 鳥：カーソルを当てる（キーボードでフォーカスする）と、矢印の線がつながったまま形を変えて鳥になり（バネの動き）、
 *   翼を一度だけゆったり羽ばたかせ、少し前上方へ浮いてその場で止まる。外すと、翼をたたむように矢印へ戻る。
 * - 押した瞬間：もう一度力強く羽ばたき、前へ少し進む。ページの移動は遅らせない。
 * - カーソルの位置に合わせて、ボタンが数pxだけカーソルへ引き寄せられる（--mx / --my）
 * - カーソルが入ってきた位置から、わずかに深い色の塗りが広がる（--fx / --fy。出ていくときは出ていく位置へ縮む）
 * 形は bird.ts、見た目は index.css の .button-fly。タッチ端末ではホバーの動きを付けない（キーボードのフォーカスだけ）。
 * 「動きを減らす」設定では何もしない（矢印のまま、色が深くなるだけ）。
 * ボタンごとに処理を付けず、document で受けて対象のボタンを探す（ページを移動しても付け直さなくてよい）。
 */
import { BIRD_REST, birdPaths } from "./bird";

const MAX_X = 3; // 引き寄せの最大量（px）
const MAX_Y = 2.5;
const LIFT_X = 1.6; // 鳥になったときに前上方へ浮く量（px）
const LIFT_Y = -1.8;

/** 1つの値をバネで目標へ近づける（少しだけ行き過ぎて落ち着く） */
class Spring {
  value = 0;
  velocity = 0;
  target = 0;
  constructor(private stiffness: number, private damping: number) {}
  step(dt: number) {
    const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += force * dt;
    this.value += this.velocity * dt;
  }
  get resting() {
    return Math.abs(this.target - this.value) < 0.0005 && Math.abs(this.velocity) < 0.002;
  }
}

type Flap = { start: number; duration: number; amount: number; push: number };

/** 1つのボタンの矢印の状態 */
class Bird {
  morph = new Spring(190, 20); // 0 = 矢印、1 = 鳥（約0.45秒で落ち着く）
  liftX = new Spring(120, 16);
  liftY = new Spring(120, 16);
  flap: Flap | null = null;
  hovered = false;
  focused = false;
  frame = 0;
  last = 0;
  private body: SVGPathElement | null;
  private wing: SVGPathElement | null;
  private tip: SVGPathElement | null;
  private svg: SVGSVGElement | null;

  constructor(readonly button: HTMLElement) {
    this.svg = button.querySelector(".bird-arrow");
    this.body = button.querySelector(".bird-body");
    this.wing = button.querySelector(".bird-wing");
    this.tip = button.querySelector(".bird-tip");
  }

  setActive() {
    const active = this.hovered || this.focused;
    if (active === this.morph.target > 0) return;
    this.morph.target = active ? 1 : 0;
    this.liftX.target = active ? LIFT_X : 0;
    this.liftY.target = active ? LIFT_Y : 0;
    // 鳥になったら、変身が落ち着くころに一度だけゆったり羽ばたく
    this.flap = active ? { start: performance.now() + 260, duration: 820, amount: 0.38, push: 0 } : null;
    this.run();
  }

  /** 押した瞬間の、力強い羽ばたき */
  strongFlap() {
    if (this.morph.target === 0) return;
    this.flap = { start: performance.now(), duration: 420, amount: 0.62, push: 2.4 };
    this.run();
  }

  private run() {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.button.isConnected) return;
    const dt = Math.min(1 / 30, (now - this.last) / 1000);
    this.last = now;
    for (const s of [this.morph, this.liftX, this.liftY]) s.step(dt);

    // 羽ばたき：止まっている姿勢 → 打ち下ろし → 元へ（ゆっくり入って、ゆっくり戻る）
    let flap = BIRD_REST;
    let push = 0;
    let flapping = false;
    if (this.flap) {
      const p = (now - this.flap.start) / this.flap.duration;
      if (p >= 1) this.flap = null;
      else if (p > 0) {
        const wave = Math.sin(Math.PI * (0.5 - 0.5 * Math.cos(Math.PI * p)));
        flap = BIRD_REST + this.flap.amount * wave;
        push = this.flap.push * wave;
      }
      flapping = !!this.flap;
    }

    const m = this.morph.value;
    const { body, wing } = birdPaths(m, flap);
    this.body?.setAttribute("d", body);
    this.wing?.setAttribute("d", wing);
    this.tip?.setAttribute("d", wing);
    if (this.tip) this.tip.style.opacity = String(Math.max(0, Math.min(1, (m - 0.55) / 0.45)));
    if (this.svg) this.svg.style.transform = `translate(${(this.liftX.value * m + push).toFixed(2)}px, ${(this.liftY.value * m).toFixed(2)}px)`;

    if (flapping || !this.morph.resting || !this.liftX.resting || !this.liftY.resting) this.frame = requestAnimationFrame(this.tick);
    else if (this.morph.target === 0 && this.svg) this.svg.style.transform = "";
  };
}

export function installButtonFx() {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const birds = new WeakMap<HTMLElement, Bird>();
  const buttonOf = (e: Event) => (e.target instanceof Element ? (e.target.closest(".button-fly") as HTMLElement | null) : null);
  const birdOf = (button: HTMLElement) => {
    let bird = birds.get(button);
    if (!bird) birds.set(button, (bird = new Bird(button)));
    return bird;
  };

  // キーボードのフォーカス（タッチ端末でも、キーボードで操作したときは動かす）
  document.addEventListener("focusin", (e) => {
    const button = buttonOf(e);
    if (!button || reduce.matches || !button.matches(":focus-visible")) return;
    const bird = birdOf(button);
    bird.focused = true;
    bird.setActive();
  });
  document.addEventListener("focusout", (e) => {
    const button = buttonOf(e);
    if (!button) return;
    const bird = birdOf(button);
    bird.focused = false;
    bird.setActive();
  });
  // キーボード（Enter）で押したとき（detail が 0 の click）も羽ばたく
  document.addEventListener("click", (e) => {
    const button = buttonOf(e);
    if (button && !reduce.matches && e.detail === 0) birdOf(button).strongFlap();
  });

  if (!finePointer) return;
  const crossed = (button: HTMLElement, e: PointerEvent) => !(e.relatedTarget instanceof Node && button.contains(e.relatedTarget));
  const setOrigin = (button: HTMLElement, e: PointerEvent) => {
    const r = button.getBoundingClientRect();
    button.style.setProperty("--fx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
    button.style.setProperty("--fy", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
  };

  document.addEventListener("pointerover", (e) => {
    const button = buttonOf(e);
    if (!button || !crossed(button, e)) return;
    setOrigin(button, e);
    if (reduce.matches) return;
    const bird = birdOf(button);
    bird.hovered = true;
    bird.setActive();
  });
  document.addEventListener("pointerout", (e) => {
    const button = buttonOf(e);
    if (!button || !crossed(button, e)) return;
    setOrigin(button, e);
    button.style.setProperty("--mx", "0px");
    button.style.setProperty("--my", "0px");
    const bird = birdOf(button);
    bird.hovered = false;
    bird.setActive();
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

  document.addEventListener("pointerdown", (e) => {
    const button = buttonOf(e);
    if (button && !reduce.matches && e.button === 0) birdOf(button).strongFlap();
  });
}
