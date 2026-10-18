import { useEffect, useRef, useState, type RefObject } from "react";
import { watchReading } from "./readingPause";

/* ───────────────────────── 鳩がデータを運ぶ（HOW IT WORKS・FLOW 共通） ─────────────────────────
 * 小さな鳩が、そのサービスのデータ（領収書・会計データ・レポート・手紙など）をくちばしにくわえて、工程から工程へ届けていく。
 * 動き・タイミングはすべての図で共通。サービスごとに変えるのは、運ぶものと順路だけ（schemeStory.tsx・flowJourney.ts）。
 *
 * 流れ：起点に現れて工程が点灯 → 約1.2秒静止 → しゃがんで（予備動作）飛び立つ → 弧を描いて約1秒で次の工程へ → 着地でわずかにつぶれて戻り、
 *       荷物をそっと置く → 約1秒止まって「今ここ」を読ませる → … → 終点で約2秒の余韻 → 消えて起点に戻り、また静止から。
 * 軽さ：動かすのは transform と opacity だけ（Web Animations API と CSS animation。毎フレーム DOM を書き換える処理はない）。
 *       位置の計算は止まるたびに1回だけ。鳩・翼・荷物は別々の要素で、それぞれ合成レイヤーで動く。
 * 止める：画面外・タブが非表示・カードを読んでいる間（readingPause.ts）・工程の説明を開いている間。
 *         「動きを減らす」設定では鳩を出さず、全工程を終えた状態で見せる。
 * 鳩・荷物は文字に重ならない位置に止まる（カードの右上の空き、または上の縁の外。data-perch で指定）。
 */

export type Cargo = "receipt" | "doc" | "data" | "report" | "mail" | "chat" | "person" | "people" | "card" | "calendar" | "heart" | "check" | "star" | "layout" | "manual" | "target" | "megaphone" | "photo" | "handshake" | "chart" | "refresh";

export type DoveStop = {
  /** 止まる工程のキー（data-story） */
  at: string;
  /** この工程へ運ぶもの（省略すると前と同じ） */
  cargo?: Cargo;
  /** 成果（レポート・受注・お客さまなど）は黄色のカードで */
  gold?: boolean;
  /** 途中で通る点："c"（中心）など、または "below"（図の下の余白を回って戻る） */
  via?: string;
  /** 着いたときの小さな出来事（FLOW）：吹き出しが交わる／チェック／印／続いていく輪 */
  event?: "chat" | "check" | "stamp" | "ring";
};

type Options = {
  /** 縦に並ぶレイアウトになる幅 */
  verticalQuery: string;
  /** 一時停止したいとき（工程の説明を開いている間など） */
  hold?: boolean;
  /** 「読んでいる」と判定するカード */
  cardSelector?: string;
  /** 画面にどれだけ入ったら進めるか */
  visibleRatio?: number;
  /** 最後に飛び去ってから次の周へ（FLOW） */
  flyAway?: boolean;
  /** 縦並びでの移動の通り道：カードの右の縁（HOW IT WORKS）／丸の列（FLOW、丸の後ろをくぐる） */
  rail?: "edge" | "line";
};

/* 時間（ミリ秒） */
const T = { appear: 450, startHold: 1200, crouch: 220, fly: 1000, land: 320, setDown: 380, dwell: 1000, endHold: 2000, gap: 600 };
const EASE_FLY = "cubic-bezier(.45, 0, .25, 1)"; // 飛ぶ：ゆっくり出て、ゆっくり降りる
const EASE_OUT = "cubic-bezier(.22, 1, .36, 1)";

type Pt = { x: number; y: number };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useDoveCarrier(box: RefObject<HTMLElement | null>, stops: ((loop: number) => DoveStop[]) | undefined, keys: string[], opts: Options) {
  const [reduce] = useState(reducedMotion);
  const still = reduce || !stops;
  const [now, setNow] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(still ? keys : []);
  const [running, setRunning] = useState(false);
  const layer = useRef<HTMLDivElement | null>(null);
  const holdRef = useRef(!!opts.hold);
  const wakeRef = useRef<() => void>(() => {});
  holdRef.current = !!opts.hold;
  const keyList = keys.join(",");

  useEffect(() => {
    if (!opts.hold) wakeRef.current();
  }, [opts.hold]);

  useEffect(() => {
    const root = box.current;
    const el = layer.current;
    if (still || !root || !el || !stops) return;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    const dove = q<HTMLDivElement>(".dove");
    const flip = q<HTMLDivElement>(".dove-flip");
    const body = q<HTMLDivElement>(".dove-body");
    const cargoEl = q<HTMLDivElement>(".dove-cargo");
    const cargoCard = q<HTMLSpanElement>(".cargo-card");
    const cargoPath = q<SVGPathElement>(".cargo-glyph");
    const fx = q<HTMLDivElement>(".dove-fx");
    const vertical = window.matchMedia(opts.verticalQuery);

    let cancelled = false;
    let visible = false;
    let reading = () => false;
    const paused = () => !visible || document.hidden || holdRef.current || reading();
    const gate = () => new Promise<void>((resolve) => {
      const check = () => { if (cancelled || !paused()) { wakeRef.current = () => {}; resolve(); } };
      wakeRef.current = check;
      check();
    });
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    /** Web Animations で動かし、終わったら最終の値を style に残して animation は片付ける（積み重ねない） */
    const anim = async (target: HTMLElement, frames: Keyframe[], o: KeyframeAnimationOptions) => {
      const a = target.animate(frames, { fill: "forwards", ...o });
      await a.finished.catch(() => undefined);
      if (cancelled) return;
      try { a.commitStyles(); } catch { /* 表示されていないとき */ }
      a.cancel();
    };

    // ── 位置：工程の要素から、鳩の足もと（止まる点）を求める ──
    const size = () => parseFloat(getComputedStyle(el).getPropertyValue("--dove")) || 34;
    const find = (key: string) => {
      for (const t of root.querySelectorAll<Element>(`[data-story="${key}"]`)) {
        const r = t.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return { t, r };
      }
      return null;
    };
    const perch = (key: string): Pt | null => {
      const f = find(key);
      if (!f) return null;
      const b = root.getBoundingClientRect();
      const s = size();
      const mode = (vertical.matches && f.t.getAttribute("data-perch-v")) || f.t.getAttribute("data-perch") || "above-tr";
      const r = { left: f.r.left - b.left, right: f.r.right - b.left, top: f.r.top - b.top, width: f.r.width };
      if (mode === "in-tr") return { x: r.right - s * 0.78 - 10, y: r.top + 10 + s * 0.82 };
      if (mode === "above-c") return { x: r.left + r.width / 2 - s * 0.18, y: r.top - 3 };
      return { x: r.right - s * 0.78 - 10, y: r.top + 1 }; // above-tr
    };
    const center = (key: string): Pt | null => {
      const f = find(key);
      if (!f) return null;
      const b = root.getBoundingClientRect();
      return { x: f.r.left - b.left + f.r.width / 2, y: f.r.top - b.top + f.r.height / 2 };
    };
    const below = () => {
      const top = root.getBoundingClientRect().top;
      return Math.max(...keys.map((k) => { const f = find(k); return f ? f.r.bottom - top : 0; })) + size() * 0.9 + 6;
    };

    let pos: Pt = { x: 0, y: 0 };
    let facing = 1;
    let curKey = ""; // いま止まっている工程（画面幅が変わったときに置き直す）
    const place = (p: Pt) => { pos = p; dove.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };
    const face = (dir: number) => { if (dir !== facing) { facing = dir; flip.style.transform = dir < 0 ? "scaleX(-1)" : ""; } };

    // ── 荷物 ──
    const setCargo = (c: Cargo, gold: boolean) => {
      cargoPath.setAttribute("d", GLYPHS[c]);
      cargoCard.classList.toggle("is-gold", gold);
    };
    const swapCargo = async (c: Cargo, gold: boolean) => {
      if (cargoPath.getAttribute("d") === GLYPHS[c] && cargoCard.classList.contains("is-gold") === gold) return;
      await anim(cargoCard, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.6)" }], { duration: 160, easing: "ease-in" });
      setCargo(c, gold);
      await anim(cargoCard, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1.12)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }], { duration: 280, easing: EASE_OUT });
    };

    // ── 飛ぶ：予備動作 → 弧を描いて移動（翼は CSS で羽ばたき、荷物は揺れる）→ 着地 → 荷物をそっと置く ──
    const fly = async (path: Pt[], { exit = false } = {}) => {
      const to = path[path.length - 1];
      face(to.x < pos.x - 4 ? -1 : 1);
      await anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.07, .88)" }], { duration: T.crouch, easing: "ease-out" });
      dove.classList.add("is-flying");
      // 弧：区間ごとに、横の移動は上へ、縦の移動は少し横へふくらませる
      const pts: Pt[] = [pos, ...path];
      const frames: Keyframe[] = [];
      const N = 8;
      pts.slice(1).forEach((b, si) => {
        const a = pts[si];
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const h = Math.min(26, 8 + len * 0.08);
        for (let i = si === 0 ? 0 : 1; i <= N; i++) {
          const t = i / N, arc = 4 * t * (1 - t) * h;
          const horiz = Math.abs(dx) >= Math.abs(dy);
          const x = a.x + dx * t + (horiz ? 0 : -arc * 0.4);
          const y = a.y + dy * t - (horiz ? arc : 0);
          const tilt = horiz ? (1 - 2 * t) * -9 * Math.sign(dx || 1) * facing : 0;
          const f: Keyframe = { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)` };
          if (exit) f.opacity = String(1 - Math.max(0, (si * N + i) / (N * (pts.length - 1)) - 0.45) / 0.55);
          frames.push(f);
        }
      });
      const legs = pts.length - 1;
      void anim(body, [{ transform: "translateY(1.5px) scale(1.07, .88)" }, { transform: "scale(.95, 1.06)", offset: 0.25 }, { transform: "none", offset: 0.6 }, { transform: "none" }], { duration: T.fly * 0.6, easing: "linear" });
      await anim(dove, frames, { duration: T.fly * (legs > 1 ? 1.35 : 1), easing: EASE_FLY });
      pos = to;
      dove.style.transform = `translate(${to.x.toFixed(1)}px, ${to.y.toFixed(1)}px)`;
      dove.classList.remove("is-flying");
      if (exit) return;
      // 着地：わずかにつぶれて戻る。荷物は少し遅れて揺れが収まる（フォロースルー）
      await Promise.all([
        anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.08, .9)", offset: 0.35 }, { transform: "scale(.98, 1.03)", offset: 0.7 }, { transform: "none" }], { duration: T.land, easing: EASE_FLY }),
        anim(cargoEl, [{ transform: "rotate(10deg)" }, { transform: "rotate(-5deg)", offset: 0.45 }, { transform: "rotate(2deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], { duration: T.land + 160, easing: EASE_FLY }),
      ]);
      // 荷物をそっと置く：少しかがんで荷物が下につき、また顔を上げる
      await Promise.all([
        anim(body, [{ transform: "none" }, { transform: "rotate(6deg)", offset: 0.45 }, { transform: "none" }], { duration: T.setDown, easing: EASE_FLY }),
        anim(cargoEl, [{ transform: "none" }, { transform: "translateY(2px)", offset: 0.45 }, { transform: "none" }], { duration: T.setDown, easing: EASE_FLY }),
      ]);
    };

    // ── 着いたときの小さな出来事（FLOW） ──
    const fxAt = (p: Pt) => { fx.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };
    const play = async (cls: string, ms: number) => {
      fx.classList.remove(cls);
      void fx.offsetWidth; // 同じ出来事をもう一度起こすため
      fx.classList.add(cls);
      await wait(ms);
      fx.classList.remove(cls);
    };
    const events = {
      chat: async () => {
        fxAt(pos);
        // 縦並び（丸の列が狭い）では、鳩がいったん控えて、同じ場所で吹き出しが交わる
        if (vertical.matches) await anim(body, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in" });
        await play(vertical.matches ? "is-chat is-narrow" : "is-chat", 1900);
        if (vertical.matches) await anim(body, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE_OUT });
      },
      stamp: async () => {
        const c = cargoCard.getBoundingClientRect(), b = root.getBoundingClientRect();
        fxAt({ x: c.left + c.width / 2 - b.left, y: c.top + c.height / 2 - b.top });
        await play("is-stamp", 1000);
      },
      ring: async (key: string) => { const c = center(key); if (c) fxAt(c); await play("is-ring", 1300); },
    };
    // 印・チェックは荷物（カード）の上に出す
    const badge = async (kind: "check" | "stamp") => {
      cargoCard.classList.remove("show-check", "show-stamp");
      void cargoCard.offsetWidth;
      cargoCard.classList.add(kind === "check" ? "show-check" : "show-stamp");
      await wait(kind === "check" ? 700 : 900);
    };

    const setStep = (nowKey: string | null, doneKeys: string[]) => { setNow(nowKey); setDone(doneKeys); if (nowKey) curKey = nowKey; };

    const run = async () => {
      let loop = 0;
      while (!cancelled) {
        const list = stops(loop);
        await gate();
        if (cancelled) return;
        const first = list[0];
        const p0 = perch(first.at);
        if (!p0) return;
        // 起点：鳩が現れて、最初の工程が点灯。しばらく静止してから出発する
        face(1);
        place(p0);
        setCargo(first.cargo ?? "doc", !!first.gold);
        cargoCard.classList.remove("show-check", "show-stamp");
        setStep(first.at, [first.at]);
        await anim(dove, [{ opacity: 0, transform: `translate(${p0.x}px, ${p0.y + 6}px) scale(.92)` }, { opacity: 1, transform: `translate(${p0.x}px, ${p0.y}px)` }], { duration: T.appear, easing: EASE_OUT });
        dove.style.opacity = "1";
        await wait(T.startHold);
        if (first.event) await runEvent(first);
        const visited = [first.at];
        for (const stop of list.slice(1)) {
          await gate();
          if (cancelled) return;
          // 運ぶものを持ち替えてから飛び立つ
          if (stop.cargo) await swapCargo(stop.cargo, !!stop.gold);
          const to = perch(stop.at);
          if (!to) continue;
          setStep(null, [...visited]);
          const path: Pt[] = [];
          if (stop.via === "below" && !vertical.matches) {
            const y = below();
            path.push({ x: pos.x, y }, { x: to.x, y });
          } else if (stop.via) {
            const v = perch(stop.via);
            if (v) path.push(v);
          } else if (vertical.matches && opts.rail === "edge" && Math.abs(to.y - pos.y) > 4) {
            // 縦並び：カードの右の縁を通る（文字の上を横切らない）
            const x = Math.max(pos.x, to.x) + size() * 0.45;
            path.push({ x, y: pos.y - size() * 0.5 }, { x, y: to.y - size() * 0.5 });
          }
          path.push(to);
          await fly(path);
          if (cancelled) return;
          visited.push(stop.at);
          setStep(stop.at, [...visited]);
          if (stop.event) await runEvent(stop);
          await wait(T.dwell);
        }
        // 終点：余韻のあと、飛び去る（FLOW）か、静かに消えて起点へ戻る
        await wait(T.endHold);
        if (opts.flyAway) {
          const away = vertical.matches ? { x: pos.x, y: pos.y - size() * 1.8 } : { x: pos.x + size() * 2, y: pos.y - size() * 1.3 };
          await fly([away], { exit: true });
        } else {
          await anim(dove, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-in" });
        }
        dove.style.opacity = "0";
        setStep(null, []);
        await wait(T.gap);
        loop++;
      }
    };
    const runEvent = async (stop: DoveStop) => {
      if (stop.event === "check" || stop.event === "stamp") await badge(stop.event);
      if (stop.event === "stamp") await events.stamp();
      else if (stop.event === "ring") await events.ring(stop.at);
      else if (stop.event === "chat") await events.chat();
    };

    // 画面に入っている間だけ進める
    const ratio = opts.visibleRatio ?? 0.2;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible = e.isIntersecting && e.intersectionRatio >= ratio;
      wakeRef.current();
    }, { threshold: [0, ratio, Math.min(1, ratio + 0.2)] });
    io.observe(root);
    const onVis = () => wakeRef.current();
    document.addEventListener("visibilitychange", onVis);
    // カードを読んでいる間だけ止める（セクションに入っただけでは止めない）
    const watcher = watchReading(root, opts.cardSelector ?? "[data-story]", () => wakeRef.current());
    reading = watcher.reading;
    // 画面幅が変わったら、今いる工程へ（動きなしで）
    const ro = new ResizeObserver(() => { if (curKey && !dove.classList.contains("is-flying")) { const p = perch(curKey); if (p) place(p); } });
    ro.observe(root);
    setRunning(true);
    void run();
    return () => {
      cancelled = true;
      wakeRef.current();
      io.disconnect();
      ro.disconnect();
      watcher.stop();
      document.removeEventListener("visibilitychange", onVis);
      for (const a of el.getAnimations({ subtree: true })) a.cancel();
      setRunning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, stops, still, keyList, opts.verticalQuery, opts.flyAway, opts.rail]);

  const state = (key: string) => `${done.includes(key) ? " is-done" : ""}${now === key ? " is-now" : ""}`;
  const node = still ? null : <DoveLayer layer={layer} />;
  return { state, layer: node, running, still };
}

/** 鳩と荷物、着いたときの出来事（読み上げない・クリックできない重ね絵） */
function DoveLayer({ layer }: { layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="dove-layer" ref={layer} aria-hidden="true">
      <div className="dove-fx">
        <span className="fx-bubble is-a"><svg viewBox="0 0 22 16"><path d="M3 1.5h16a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9l-4 3v-3H3a2 2 0 0 1-2-2V3.5a2 2 0 0 1 2-2z" /><circle cx="7" cy="7" r="1" /><circle cx="11" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></svg></span>
        <span className="fx-bubble is-b"><svg viewBox="0 0 22 16"><path d="M19 1.5H3a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10l4 3v-3h2a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2z" /><path className="ln" d="M6 6.5h10M6 9h6" /></svg></span>
        <span className="fx-ring" />
        <span className="fx-ripple" />
      </div>
      <div className="dove">
        <div className="dove-flip">
          <div className="dove-bob">
            <div className="dove-body">
              <svg className="dove-shape" viewBox="0 0 40 33">
                <path className="tail" d="M10.4 20.6C8 18.8 5.6 17.4 2.8 17.3c1.5 1.8 2.3 3.8 2.3 6 2-.4 3.9-1.2 5.6-2.2" />
                <path className="bodyline" d="M9.6 21.4c0-6.3 5-10.2 11.4-10.2 2.3 0 4.2.6 5.6 1.6 1.2-2.8 3.4-4.4 6-4.4 2.8 0 4.6 2 4.6 4.6 0 1.6-.6 2.9-1.6 3.9-.6 5.8-5.8 10.1-13.2 10.1-7.8 0-12.8-2.1-12.8-5.6z" />
                <path className="beak" d="M36.9 12.6l2.7 1.1-2.7 1.2z" />
                <circle className="eye" cx="33.3" cy="12.3" r="1.25" />
                <path className="feet" d="M20.2 27.3v2.6M24.4 27.2v2.7M19 29.9h2.4M23.2 29.9h2.4" />
              </svg>
              <div className="dove-wing">
                <svg viewBox="0 0 40 33">
                  <path className="wing" d="M13.6 19.6c1.6-4.8 6.1-7.1 11-6.1-1.8 1.8-3 4.5-3.2 7.9-2.7.2-5.8-.4-7.8-1.8z" />
                  <path className="wing-tip" d="M15 17.6c1.6-2.4 4.4-3.6 7.4-3.4" />
                </svg>
              </div>
              <div className="dove-cargo">
                <span className="cargo-card">
                  <svg viewBox="0 0 24 24"><path className="cargo-glyph" d={GLYPHS.doc} /></svg>
                  <span className="cargo-badge is-check"><svg viewBox="0 0 12 12"><path d="M2.6 6.2l2.1 2.1 4.4-4.6" /></svg></span>
                  <span className="cargo-badge is-stamp"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.2" /><path d="M4.1 6.1l1.3 1.3 2.6-2.8" /></svg></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 運ぶものの絵（24×24・線） */
const GLYPHS: Record<Cargo, string> = {
  receipt: "M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h3",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  data: "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  report: "M5 3h14v18H5zM9 17v-3M12 17v-6M15 17V9",
  mail: "M3 6h18v12H3zM3 7l9 6.5L21 7",
  chat: "M4 5h16v11H9l-5 4zM8 10h8M8 13h5",
  person: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  people: "M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4a3 3 0 0 1 0 6M18 14c2.2.6 3.5 2.6 3.5 6",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  calendar: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  check: "M4 12.5l5 5L20 6.5",
  star: "M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z",
  layout: "M3 4h18v16H3zM3 9h18M9 9v11",
  manual: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  megaphone: "M3 10v4h4l7 5V5L7 10zM18 9a4 4 0 0 1 0 6",
  photo: "M3 6h4l2-2h6l2 2h4v14H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  handshake: "M3 11l4-4 4 2 3-2 7 5-4 4-3-2-2 2-3-2-2 1zM11 9l3 3",
  chart: "M4 20h16M7 16v-4M12 16V8M17 16v-7",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4",
};
