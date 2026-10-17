import { useEffect, useRef } from "react";
import { birdPaths } from "./bird";

/* ───────────────────────── トップのヒーロー：下線を引いて飛び去る鳩 ─────────────────────────
 * ページを開いたとき、小さな鳩が見出し「ビジネスの成長を加速させる」の下線の位置を左から右へ低く滑空し、
 * 尾の後ろから黄色い下線が引かれていく。右端で少し上昇して、ふわっと右上へ消える（全体 約1.3秒、PC）。
 * - 形はボタンの「矢印 → 鳥」と同じ（bird.ts）。紺の線で、前の翼の先だけロゴの黄色。目やくちばしは描かない。
 * - 見出しの文字は最初から表示。鳩は文字の下の線の位置だけを飛ぶ（翼は低めの姿勢で、文字にかからないように）。
 * - 位置は transform だけで動かし、線は親（.title-underline）の --ul を進める。レイアウトは動かさない。
 * - ページを開いたときに1回だけ（トップへ戻ってきても再生しない）。「動きを減らす」設定では使わない（HeroSection が判断）。
 * - 飛び去ったら window に "coana:dove-done" を送る（回転ワードはそのあとで切り替え始める）。
 */
let played = false;
export const dovePlayed = () => played;

/** 3次ベジェのイージング（CSS の cubic-bezier と同じ） */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 20; i++) {
      t = (lo + hi) / 2;
      if (at(x1, x2, t) < x) lo = t;
      else hi = t;
    }
    return at(y1, y2, t);
  };
}
// 滑空：すっと入って加速し、右端の手前でやわらかく減速する
const glideEase = bezier(0.42, 0, 0.22, 1);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** 羽ばたき：start〜end の間に cycles 回、翼を lo（上げ）〜hi（下げ）の間で動かす */
function flapIn(t: number, start: number, end: number, cycles: number, lo: number, hi: number) {
  if (t < start || t > end) return null;
  const k = (t - start) / (end - start);
  return lo + (hi - lo) * (0.5 - 0.5 * Math.cos(k * cycles * 2 * Math.PI));
}

export function HeroDove() {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const line = el?.parentElement;
    const body = el?.querySelector<SVGPathElement>(".dove-body");
    const wings = el ? Array.from(el.querySelectorAll<SVGPathElement>(".dove-wing")) : [];
    if (!el || !line || !body) return;
    played = true;
    const small = window.matchMedia("(max-width: 640px)").matches;
    // スマホは短く、羽ばたきも少なめに
    const T = small ? { glide: 0.8, away: 0.36 } : { glide: 0.95, away: 0.42 };
    const flaps = small
      ? [[0, 0.26, 1, 0.58, 1], [T.glide, T.glide + T.away, 1.5, 0.1, 0.9]]
      : [[0, 0.34, 2, 0.58, 1], [0.54, 0.72, 1, 0.6, 0.98], [T.glide, T.glide + T.away, 2, 0.05, 0.95]];
    const GLIDE_POSE = 0.74; // 滑空中の翼：水平よりやや下げて、文字にかからない低い姿勢
    let frame = 0;
    let start = 0;
    let lastFlap = -1;
    const finish = () => {
      line.style.setProperty("--ul", "1");
      line.style.setProperty("--tip", "0");
      line.classList.add("is-done");
      el.style.opacity = "0";
      window.dispatchEvent(new Event("coana:dove-done"));
    };
    const step = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const fs = parseFloat(getComputedStyle(line).fontSize);
      const W = line.offsetWidth;
      const S = Math.max(20, fs * (small ? 0.74 : 0.72)); // 鳩の大きさ：文字より一回り小さく
      const lineY = line.offsetHeight - fs * 0.07; // 下線の中心（下線の太さ .14em の半分）
      // 尾（24×24 の 9, 14 あたり）が線の先端に来るように置く
      const glideK = clamp01(t / T.glide);
      const pos = -0.06 + 1.06 * glideEase(glideK);
      const ul = clamp01(pos);
      line.style.setProperty("--ul", ul.toFixed(4));
      line.style.setProperty("--tip", (1 - smooth(clamp01((t - T.glide) / 0.16))).toFixed(3));
      const away = clamp01((t - T.glide) / T.away);
      const a = away * away; // 飛び去りは、だんだん加速
      const bob = Math.sin(t * Math.PI * 4.4) * 0.6 * (1 - away);
      const x = pos * W - (9 / 24) * S + a * S * 1.6;
      const y = lineY - (14 / 24) * S + S * 0.1 + bob - a * S * 1.3; // 線より少し下を飛び、翼が文字にかからないように
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(-16 * a).toFixed(2)}deg) scale(${(1 - 0.18 * a).toFixed(3)})`;
      el.style.width = el.style.height = S.toFixed(1) + "px";
      el.style.opacity = (1 - smooth(clamp01((away - 0.45) / 0.55))).toFixed(3);
      let flap = GLIDE_POSE;
      for (const [s0, s1, c, lo, hi] of flaps) {
        const f = flapIn(t, s0, s1, c, lo, hi);
        if (f !== null) flap = f;
      }
      if (Math.abs(flap - lastFlap) > 0.004) {
        const d = birdPaths(1, flap);
        body.setAttribute("d", d.body);
        wings.forEach((w) => w.setAttribute("d", d.wing));
        lastFlap = flap;
      }
      if (t >= T.glide + T.away) finish();
      else frame = requestAnimationFrame(step);
    };
    // 見出しが表示されて、フォントが読み込まれてから飛ぶ（位置を正しく測るため）
    let cancelled = false;
    const delay = new Promise((r) => window.setTimeout(r, 700));
    Promise.all([delay, document.fonts?.ready ?? Promise.resolve()]).then(() => {
      if (!cancelled) frame = requestAnimationFrame(step);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (line.style.getPropertyValue("--ul") !== "1") finish();
    };
  }, []);
  const rest = birdPaths(1, 0.74);
  return (
    <span className="hero-dove" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path className="dove-body" d={rest.body} />
        <path className="dove-wing" d={rest.wing} />
        <path className="dove-wing dove-tip" d={rest.wing} pathLength={1} />
      </svg>
    </span>
  );
}
