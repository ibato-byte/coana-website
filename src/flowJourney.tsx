import { useEffect, useRef, type RefObject } from "react";
import { birdPaths, BIRD_REST } from "./bird";
import { watchReading } from "./readingPause";

/* ───────────────────────── ご利用までの流れ（FLOW）：お客さまの「相談」が進んでいくアニメーション ─────────────────────────
 * 小さな手紙（＝お客さまからの相談）が、ステップの丸の上をひとつずつ弧を描いて進み、各ステップで小さな出来事が起きる。
 *   お問い合わせ … 手紙が届く（ふわっと現れて、丸が一度だけ波紋）
 *   ヒアリング   … 吹き出しが2つ、交互に言葉を交わす
 *   ご提案・お見積もり … 封が開いて、提案書が出てくる（手紙は提案書に）
 *   準備        … 提案書に、チェックが順に付く
 *   ご契約      … 提案書に、印がやさしく押される
 *   スタート    … 提案書が矢印に折られ、ボタンと同じ鳥になって翼を開き、次へ（最後なら空へ）飛び立つ
 *   改善・伴走  … 鳥が舞い降りて、丸のまわりに「続いていく」輪が描かれる
 * 動き：アニメーションの原則（予備動作・スローイン／スローアウト・弧の動き・控えめなスクワッシュ＆ストレッチ・フォロースルー）。
 * 1ステップ 約1秒の移動＋出来事の間。一周したら落ち着いた間をおいて繰り返す（docs/motion-rules.md）。
 * 文字・番号には重ならない（丸の上の余白を進む。スマホは丸の列の中だけ）。レイアウトもページの長さも変えない。
 * 止める：画面外・タブが非表示・ステップに実際にカーソルを合わせた／フォーカスした間（約2.5秒動かさなければ再開。readingPause.ts）。
 *   セクションに入っただけでは止めない。「動きを減らす」設定では何も出さない（FlowLine が判断）。 */

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

const EASE = "cubic-bezier(.22, 1, .36, 1)"; // 速く始まり、静かに止まる（サイト共通）
const SOFT = "cubic-bezier(.45, 0, .25, 1)"; // 両端がなめらか
const HOP_MS = 1000; // ステップ間の移動
const REST_MS = { short: 9000, long: 11000 }; // 一周のあとの間

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 3次ベジェのイージング（CSS の cubic-bezier と同じ） */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 18; i++) { t = (lo + hi) / 2; if (at(x1, x2, t) < x) lo = t; else hi = t; }
    return at(y1, y2, t);
  };
}
const slowInOut = bezier(0.45, 0, 0.25, 1);

type Pt = { x: number; y: number };

export function useFlowJourney(box: RefObject<HTMLElement | null>, kinds: Kind[][], enabled: boolean) {
  const layer = useRef<HTMLDivElement | null>(null);
  const key = kinds.map((k) => k.join("+")).join("|");
  useEffect(() => {
    const root = box.current;
    const el = layer.current;
    if (!enabled || !root || !el) return;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    const traveler = q<HTMLDivElement>(".flowj-traveler");
    const body = q<HTMLDivElement>(".flowj-body");
    const shadow = q<HTMLDivElement>(".flowj-shadow");
    const fx = q<HTMLDivElement>(".flowj-fx");
    const env = q<SVGGElement>(".f-env");
    const flap = q<SVGGElement>(".f-flap");
    const envBody = q<SVGGElement>(".f-env-body");
    const sheet = q<SVGGElement>(".f-sheet");
    const ticks = Array.from(el.querySelectorAll<SVGPathElement>(".f-tick"));
    const stamp = q<SVGGElement>(".f-stamp");
    const bird = q<SVGGElement>(".f-bird");
    const birdBody = q<SVGPathElement>(".f-bird-body");
    const birdWings = Array.from(el.querySelectorAll<SVGPathElement>(".f-bird-wing"));
    const bubbles = Array.from(el.querySelectorAll<HTMLSpanElement>(".flowj-bubble"));
    const ring = q<HTMLSpanElement>(".flowj-ring");
    const loopArc = q<SVGSVGElement>(".flowj-loop");
    const steps = Array.from(root.querySelectorAll<HTMLElement>(".flowx-step"));
    const vertical = window.matchMedia("(max-width: 980px)");

    let cancelled = false;
    let visible = false;
    let wake = () => {};
    let reading = () => false;
    const paused = () => !visible || document.hidden || reading();
    const gate = () => new Promise<void>((resolve) => {
      const check = () => { if (cancelled || !paused()) { wake = () => {}; resolve(); } };
      wake = check;
      check();
    });
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const anim = (target: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => target.animate(frames, { fill: "forwards", ...opts }).finished.catch(() => undefined);

    // 位置：丸の中心から。PC は丸の上（文字に重ならない）、スマホは丸の列の中（丸の上）
    const node = (i: number) => {
      const n = steps[i]?.querySelector(".flowx-node");
      if (!n) return null;
      const r = n.getBoundingClientRect(), b = root.getBoundingClientRect();
      return { cx: r.left - b.left + r.width / 2, top: r.top - b.top, size: r.width };
    };
    const rest = (i: number): Pt | null => {
      const n = node(i);
      // 見出しとの間（PC 44px・スマホ 30px）におさまる高さ
      return n ? { x: n.cx, y: n.top - (vertical.matches ? 9 : 20) } : null;
    };

    let pos: Pt = { x: 0, y: 0 };
    let tilt = 0;
    const place = (p: Pt, rot = 0) => {
      pos = p;
      tilt = rot;
      traveler.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
    };
    const ground = (i: number, lift = 0) => {
      const n = node(i);
      if (!n || vertical.matches) { shadow.style.opacity = "0"; return; }
      const s = 1 - Math.min(0.55, lift / 60);
      shadow.style.opacity = (0.55 * s).toFixed(3);
      shadow.style.transform = `translate(${pos.x.toFixed(2)}px, ${(n.top - 4).toFixed(2)}px) scale(${s.toFixed(3)})`;
    };
    const fxAt = (i: number) => {
      const n = node(i);
      if (n) fx.style.transform = `translate(${n.cx.toFixed(2)}px, ${(n.top + n.size / 2).toFixed(2)}px)`;
    };
    const setStep = (now: number, done: number) => steps.forEach((s, i) => {
      s.classList.toggle("is-journey-now", i === now);
      s.classList.toggle("is-journey-done", i < done);
    });

    // 鳥の形（m：0 = 矢印 〜 1 = 鳥、flap：翼の姿勢）
    const drawBird = (m: number, f: number) => {
      const d = birdPaths(m, f);
      birdBody.setAttribute("d", d.body);
      birdWings.forEach((w) => w.setAttribute("d", d.wing));
    };

    /** 弧を描いて移動。予備動作（少し沈む）→ 伸びて跳ぶ → 着地で少しつぶれて、行き過ぎてから戻る */
    const hop = async (to: number, opts: { height?: number; flying?: boolean; away?: Pt } = {}) => {
      const a = pos;
      const b = opts.away ?? rest(to);
      if (!b) return;
      const flying = !!opts.flying;
      if (!flying) await anim(body, [{ transform: "none" }, { transform: "translateY(2px) scale(1.07, .9)" }], { duration: 150, easing: "ease-out" });
      const H = vertical.matches ? 0 : opts.height ?? 22; // 縦並びはまっすぐ下へ（丸の後ろをくぐる）
      const dur = opts.away ? HOP_MS * 1.15 : HOP_MS;
      const t0 = performance.now();
      if (!flying) void anim(body, [{ transform: "translateY(2px) scale(1.07, .9)" }, { transform: "scale(.95, 1.06)", offset: 0.25 }, { transform: "scale(1, 1)", offset: 0.6 }, { transform: "scale(1, 1)" }], { duration: dur, easing: "linear" });
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          if (cancelled) return resolve();
          const raw = clamp01((now - t0) / dur);
          const t = slowInOut(raw);
          const arc = 4 * t * (1 - t);
          // 横並びは上へ、縦並びは左へふくらむ弧
          const x = a.x + (b.x - a.x) * t - (vertical.matches && !opts.away ? arc * H : 0);
          const y = a.y + (b.y - a.y) * t - (vertical.matches && !opts.away ? 0 : arc * H);
          // 進む向きに少し傾く（上るときは上向き、下りるときは下向き）
          const slope = (1 - 2 * t) * (vertical.matches ? 0 : 1);
          place({ x, y }, opts.away ? -18 * t : -10 * slope);
          ground(to, arc * H);
          if (flying) drawBird(1, 0.5 + 0.5 * Math.sin(raw * Math.PI * 4 - Math.PI / 2));
          if (opts.away) traveler.style.opacity = (1 - clamp01((raw - 0.45) / 0.55)).toFixed(3);
          if (raw < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      place(b, 0);
      if (opts.away) return;
      ground(to, 0);
      if (flying) drawBird(1, BIRD_REST);
      // 着地：少しつぶれて、少し伸び返して止まる（フォロースルー）
      await anim(body, [{ transform: "scale(1, 1)" }, { transform: "translateY(1.5px) scale(1.08, .9)", offset: 0.3 }, { transform: "scale(.98, 1.03)", offset: 0.65 }, { transform: "none" }], { duration: 380, easing: SOFT });
    };

    // ── 各ステップの出来事 ──
    const pulse = () => anim(ring, [{ opacity: 0.55, transform: "translate(-50%, -50%) scale(.9)" }, { opacity: 0, transform: "translate(-50%, -50%) scale(1.45)" }], { duration: 900, easing: EASE });
    const events: Record<Kind, (i: number) => Promise<unknown>> = {
      inquiry: async () => {
        void pulse();
        await wait(500);
      },
      hearing: async () => {
        const [a, b] = bubbles;
        // 縦並び（スマホ）は丸の列が狭いので、手紙がいったん控えて、同じ場所で吹き出しが言葉を交わす
        const stepAside = vertical.matches;
        if (stepAside) await anim(body, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.7)" }], { duration: 260, easing: "ease-in" });
        const pop = (e: Element) => anim(e, [{ opacity: 0, transform: "translate(var(--bx), var(--by)) scale(.4)" }, { opacity: 1, transform: "translate(var(--bx), var(--by)) scale(1.1)", offset: 0.6 }, { opacity: 1, transform: "translate(var(--bx), var(--by)) scale(1)" }], { duration: 380, easing: EASE });
        await pop(a);
        await wait(180);
        await pop(b);
        // 交互に、うなずくように
        for (let k = 0; k < 1; k++) {
          await Promise.all([
            anim(a, [{ transform: "translate(var(--bx), var(--by)) scale(1)" }, { transform: "translate(var(--bx), calc(var(--by) - 2px)) scale(1.04)" }, { transform: "translate(var(--bx), var(--by)) scale(1)" }], { duration: 420, easing: SOFT }),
            wait(210).then(() => anim(b, [{ transform: "translate(var(--bx), var(--by)) scale(1)" }, { transform: "translate(var(--bx), calc(var(--by) - 2px)) scale(1.04)" }, { transform: "translate(var(--bx), var(--by)) scale(1)" }], { duration: 420, easing: SOFT })),
          ]);
        }
        await wait(200);
        await Promise.all(bubbles.map((e) => anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-in" })));
        if (stepAside) await anim(body, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1.05)", offset: 0.7 }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE });
      },
      proposal: async () => {
        // 封が開き（ふたが向こうへ返る）、提案書がすっと出てくる。封筒は少し下がって消える（フォロースルー）
        await anim(flap, [{ transform: "scaleY(1)" }, { transform: "scaleY(-1)" }], { duration: 420, easing: SOFT });
        await anim(sheet, [{ opacity: 1, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(-3px)", offset: 0.7 }, { opacity: 1, transform: "translateY(-2px)" }], { duration: 520, easing: EASE });
        await Promise.all([
          anim(envBody, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(6px)" }], { duration: 360, easing: "ease-in" }),
          anim(flap, [{ opacity: 1, transform: "scaleY(-1)" }, { opacity: 0, transform: "scaleY(-1) translateY(-4px)" }], { duration: 360, easing: "ease-in" }),
          anim(sheet, [{ transform: "translateY(-2px)" }, { transform: "translateY(2px)" }], { duration: 420, easing: SOFT }),
        ]);
        await wait(260);
      },
      prepare: async () => {
        for (const t of ticks) {
          await anim(t, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 260, easing: SOFT });
          await wait(120);
        }
        await wait(260);
      },
      contract: async () => {
        // 印：少し持ち上げてから（予備動作）、やさしく押す。押した瞬間に小さな波紋
        await anim(stamp, [{ opacity: 0, transform: "translate(0, -10px) scale(1.2)" }, { opacity: 1, transform: "translate(0, -13px) scale(1.15)" }], { duration: 280, easing: EASE });
        await anim(stamp, [{ transform: "translate(0, -13px) scale(1.15)" }, { transform: "translate(0, 0) scale(.88)", offset: 0.7 }, { transform: "translate(0, 0) scale(1)" }], { duration: 300, easing: "cubic-bezier(.5, 0, .7, .4)" });
        void anim(body, [{ transform: "none" }, { transform: "translateY(1px) scale(1.04, .95)" }, { transform: "none" }], { duration: 260, easing: SOFT });
        void pulse();
        await wait(520);
      },
      start: async () => {
        // 提案書が矢印に折られ（横に縮む）、矢印がボタンと同じように鳥になって翼を開く
        await Promise.all([
          anim(sheet, [{ opacity: 1, transform: "translateY(2px) scaleX(1)" }, { opacity: 0, transform: "translateY(2px) scaleX(0)" }], { duration: 280, easing: "ease-in" }),
          anim(stamp, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in" }),
          anim(env, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in" }),
        ]);
        bird.style.opacity = "1";
        const t0 = performance.now();
        await new Promise<void>((resolve) => {
          const frame = (now: number) => {
            const k = clamp01((now - t0) / 700);
            const m = slowInOut(k);
            drawBird(m, BIRD_REST + (1 - BIRD_REST) * Math.sin(k * Math.PI) * 0.6);
            if (k < 1 && !cancelled) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        await wait(160);
      },
      after: async (i) => {
        // 「続いていく」輪：丸のまわりをひと回り描いて、静かに消える
        fxAt(i);
        await anim(loopArc, [{ opacity: 1, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0 }], { duration: 900, easing: SOFT });
        await wait(500);
        await anim(loopArc, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" });
      },
    };

    const reset = () => {
      for (const a of el.getAnimations({ subtree: true })) a.cancel();
      traveler.style.opacity = "0";
      env.style.opacity = "1";
      bird.style.opacity = "0";
      drawBird(0, BIRD_REST);
      setStep(-1, 0);
    };

    const run = async () => {
      const n = kinds.length;
      const restMs = n > 4 ? REST_MS.long : REST_MS.short;
      while (!cancelled) {
        reset();
        await gate();
        if (cancelled) return;
        let isBird = false;
        for (let i = 0; i < n; i++) {
          await gate();
          if (cancelled) return;
          const p = rest(i);
          if (!p) break;
          fxAt(i);
          if (i === 0) {
            // 手紙が届く：上からふわっと現れる（少し行き過ぎて止まる）
            place({ x: p.x, y: p.y - 10 }, -6);
            traveler.style.opacity = "1";
            ground(0, 10);
            await Promise.all([
              anim(traveler, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out", fill: "none" }), // 残さない（最後に飛び去るときの透明度を上書きしないように）
              (async () => {
                const t0 = performance.now();
                await new Promise<void>((resolve) => {
                  const frame = (now: number) => {
                    const k = clamp01((now - t0) / 700);
                    const e = 1 - Math.pow(1 - k, 3);
                    place({ x: p.x, y: p.y - 10 * (1 - e) }, -6 * (1 - e));
                    ground(0, 10 * (1 - e));
                    if (k < 1 && !cancelled) requestAnimationFrame(frame);
                    else resolve();
                  };
                  requestAnimationFrame(frame);
                });
              })(),
            ]);
            await anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.06, .92)", offset: 0.35 }, { transform: "scale(.99, 1.02)", offset: 0.7 }, { transform: "none" }], { duration: 360, easing: SOFT });
          } else {
            await hop(i, { flying: isBird, height: isBird ? 9 : 7 });
          }
          setStep(i, i);
          for (const k of kinds[i]) {
            await gate(); // 出来事の前でも止まれるように（カーソルを当てたらすぐ止まる）
            if (cancelled) return;
            await events[k](i);
            if (k === "start") isBird = true;
          }
          await wait(420);
          setStep(i, i + 1);
        }
        // 最後：鳥なら空へ飛び立つ。手紙・提案書のままなら、そっと消える
        await wait(300);
        if (isBird) {
          // 空へ：横並びは右上へ、縦並びは丸の列の中を上へ（文字の上を通らない）
          await hop(n, { flying: true, away: vertical.matches ? { x: pos.x, y: pos.y - 44 } : { x: pos.x + 64, y: pos.y - 30 } });
        } else {
          await anim(traveler, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease-in", fill: "none" });
          traveler.style.opacity = "0";
        }
        shadow.style.opacity = "0";
        setStep(-1, n);
        await wait(restMs);
      }
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible = e.isIntersecting && e.intersectionRatio >= 0.35;
      wake();
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(root);
    const onVis = () => wake();
    document.addEventListener("visibilitychange", onVis);
    // ステップを読んでいる間だけ止める（セクションに入っただけでは止めない）
    const watcher = watchReading(root, ".flowx-step", () => wake());
    reading = watcher.reading;
    const onResize = () => { const p = rest(Math.max(0, steps.findIndex((s) => s.classList.contains("is-journey-now")))); if (p) place(p, tilt); };
    window.addEventListener("resize", onResize);
    void run();
    return () => {
      cancelled = true;
      wake();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      watcher.stop();
      window.removeEventListener("resize", onResize);
      for (const a of el.getAnimations({ subtree: true })) a.cancel();
      setStep(-1, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, key, enabled]);
  return layer;
}

/** 動く手紙・鳥と、各ステップの出来事（読み上げない・クリックできない重ね絵） */
export function FlowJourneyLayer({ layer }: { layer: RefObject<HTMLDivElement | null> }) {
  const bird = birdPaths(0, BIRD_REST);
  return (
    <div className="flowj" ref={layer} aria-hidden="true">
      <div className="flowj-shadow" />
      <div className="flowj-fx">
        <span className="flowj-ring" />
        <span className="flowj-bubble is-a">
          <svg viewBox="0 0 22 16" width="22" height="16"><path d="M3 1.5h16a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9l-4 3v-3H3a2 2 0 0 1-2-2V3.5a2 2 0 0 1 2-2z" /><circle cx="7" cy="7" r="1" /><circle cx="11" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></svg>
        </span>
        <span className="flowj-bubble is-b">
          <svg viewBox="0 0 22 16" width="22" height="16"><path d="M19 1.5H3a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10l4 3v-3h2a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2z" /><path d="M6 6.5h10M6 9h6" /></svg>
        </span>
        <svg className="flowj-loop" viewBox="-40 -40 80 80">
          <path d="M0 -32a32 32 0 1 1 -22.6 9.4" pathLength={1} />
          <path className="head" d="M-22.6 -22.6l-1.2 7.6M-22.6 -22.6l7.4 -1.6" />
        </svg>
      </div>
      <div className="flowj-traveler">
        <div className="flowj-body">
          <svg viewBox="0 0 32 32" width="32" height="32">
            {/* 提案書（封筒の中から出てくる） */}
            <g className="f-sheet">
              <rect x="9" y="5" width="14" height="18" rx="2" />
              <path className="line" d="M14 10h6M14 14h6M14 18h4" />
              <path className="f-tick" d="M10.6 10l1.1 1.1 1.9-2.2" pathLength={1} />
              <path className="f-tick" d="M10.6 14l1.1 1.1 1.9-2.2" pathLength={1} />
              <path className="f-tick" d="M10.6 18l1.1 1.1 1.9-2.2" pathLength={1} />
              <g className="f-stamp">
                <circle cx="20" cy="19.5" r="4.2" />
                <path d="M18.2 19.6l1.3 1.3 2.4-2.6" />
              </g>
            </g>
            {/* 封筒（相談の手紙） */}
            <g className="f-env">
              <g className="f-env-body">
                <rect x="4" y="11" width="24" height="16" rx="2.6" />
                <path className="fold" d="M4.8 26.2l8.6-7M27.2 26.2l-8.6-7" />
                <circle className="seal" cx="16" cy="19.6" r="1.7" />
              </g>
              <g className="f-flap">
                <path d="M4.6 11.6L16 20.2l11.4-8.6" />
              </g>
            </g>
            {/* 鳥（ボタンの矢印と同じ形から開く） */}
            <g className="f-bird" transform="translate(4 4)">
              <path className="f-bird-body" d={bird.body} />
              <path className="f-bird-wing" d={bird.wing} />
              <path className="f-bird-wing f-bird-tip" d={bird.wing} pathLength={1} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
