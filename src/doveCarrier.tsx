import { useEffect, useRef, useState, type RefObject } from "react";
import { watchReading } from "./readingPause";

/* ───────────────────────── 鳩がデータを運ぶ（HOW IT WORKS・FLOW 共通） ─────────────────────────
 * 小さな鳩が、そのサービスのデータ（領収書・会計データ・レポート・手紙など）をくちばしにくわえて、工程から工程へ届けていく。
 * 動き・タイミングはすべての図で共通。サービスごとに変えるのは、運ぶものと順路だけ（schemeStory.tsx・flowJourney.ts）。
 * 鳩は「案内役」。主役は説明の文字。動きは少なく、意味が一目で分かることを優先する。
 *
 * 流れ：起点で荷物を持って待つ（起点の工程だけ点灯）→ 約1.4秒静止 → しゃがんで（予備動作）飛び立つ →
 *       次の工程へ短く自然な弧で約1秒 → 着地でわずかにつぶれて戻り、荷物をそっと置く → 約1.2秒止まる → … →
 *       終点：通った工程がそろって「完了」（チェック）→ 鳩は上へ羽ばたいて去る → 少し間 → 点灯が静かに消える →
 *       起点に新しい荷物を持って舞い降りる → また静止から。
 * 決まり：
 *   - 飛ぶ道（軌道）は描かない。進み具合はカードで示す（着いた工程が点灯、済んだ工程に小さなチェック）。
 *   - 終点から起点へ飛んで戻らない（逆流に見える）。くり返しは「去る → 舞い降りる」で表す。
 *   - カードの後ろをくぐる・大きく回り道する動きはしない。止まる位置（data-perch）を、まっすぐ短く飛べる所に置く。
 *   - 文字には重ねない（止まる位置も、飛んでいる間も）。弧の高さ・向きだけで文字を避ける。
 * 軽さ：動かすのは transform と opacity だけ（Web Animations API と CSS animation。毎フレーム DOM を書き換える処理はない）。
 *       位置と文字の計測は飛ぶ前に1回だけ。鳩・翼・荷物は別々の要素で、それぞれ合成レイヤーで動く。
 * 止める：画面外・タブが非表示・カードを読んでいる間（readingPause.ts）・工程の説明を開いている間。
 *         「動きを減らす」設定では鳩を出さず、全工程を終えた状態で見せる。
 */

export type Cargo = "receipt" | "doc" | "data" | "report" | "mail" | "chat" | "person" | "people" | "card" | "calendar" | "heart" | "check" | "star" | "layout" | "manual" | "target" | "megaphone" | "photo" | "handshake" | "chart" | "refresh" | "payslip" | "contract" | "estimate" | "flowchart";

export type DoveStop = {
  /** 止まる工程のキー（data-story） */
  at: string;
  /** この工程へ運ぶもの（省略すると前と同じ） */
  cargo?: Cargo;
  /** 成果（レポート・受注・お客さまなど）は黄色のカードで */
  gold?: boolean;
  /** 着いたときの小さな出来事：吹き出しが交わる／チェック／印／続いていく輪／カードにページが1枚加わる */
  event?: "chat" | "check" | "stamp" | "ring" | "page";
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
};

/* 時間（ミリ秒） */
// 止まっている時間 ＝ 着地 0.32 ＋ 荷物を置く 0.38 ＋ 間 0.5（この間に次の荷物に持ち替える）＝ 約1.2秒
const T = { startHold: 1400, crouch: 220, fly: 1000, land: 320, setDown: 380, dwell: 500, together: 1500, away: 900, rest: 700, gap: 700, descend: 1000 };
const EASE_FLY = "cubic-bezier(.45, 0, .25, 1)"; // 飛ぶ：ゆっくり出て、ゆっくり降りる
const EASE_OUT = "cubic-bezier(.22, 1, .36, 1)";

type Pt = { x: number; y: number };
type Sample = { x: number; y: number; tilt: number };
type Box = { l: number; r: number; t: number; b: number };

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
    const startDot = q<HTMLSpanElement>(".dove-start");
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
    const anim = async (target: HTMLElement | SVGElement, frames: Keyframe[], o: KeyframeAnimationOptions) => {
      const a = target.animate(frames, { fill: "forwards", ...o });
      await a.finished.catch(() => undefined);
      if (cancelled) return;
      try { a.commitStyles(); } catch { /* 表示されていないとき */ }
      a.cancel();
    };
    /** 同じ class をもう一度付け直して、CSS の動きを最初から再生する */
    const replay = (t: Element, cls: string) => { t.classList.remove(cls); void (t as HTMLElement).offsetWidth; t.classList.add(cls); };

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
      const rel = (x: DOMRect) => ({ left: x.left - b.left, right: x.right - b.left, top: x.top - b.top, width: x.width });
      const r = rel(f.r);
      // in-tr：カードの中の右上（右側は文字を置かない「鳩の通り道」）／out-r：カードの外の右／above-tr・above-c：上の縁に立つ
      if (mode === "in-tr") return { x: r.right - s * 0.78 - 10, y: r.top + 10 + s * 0.82 };
      if (mode === "out-r") return { x: r.right + s * 0.5 + 8, y: r.top + 10 + s * 0.82 };
      if ((mode === "group-tr" || mode === "parent-tr") && f.t.parentElement) {
        // group-tr：小さなタグの並びの右上の縁（どのタグかは点灯で示す）／parent-tr：行（親）の中の右上
        const g = rel(f.t.parentElement.getBoundingClientRect());
        return mode === "group-tr" ? { x: g.right - s * 0.78 - 10, y: g.top + 4 } : { x: g.right - s * 0.78 - 10, y: g.top + 10 + s * 0.82 };
      }
      if (mode === "above-c") return { x: r.left + r.width / 2 - s * 0.18, y: r.top - 3 };
      return { x: r.right - s * 0.78 - 10, y: r.top + 4 }; // above-tr
    };
    const center = (key: string): Pt | null => {
      const f = find(key);
      if (!f) return null;
      const b = root.getBoundingClientRect();
      return { x: f.r.left - b.left + f.r.width / 2, y: f.r.top - b.top + f.r.height / 2 };
    };

    // ── 文字の位置（飛ぶ前に1回だけ測る）。見えていない文字（閉じている説明・ホバーで出る説明）は避けなくてよい ──
    let textCache: Box[] | null = null;
    const texts = () => (textCache ??= measureTexts());
    const measureTexts = () => {
      const b = root.getBoundingClientRect();
      const out: Box[] = [];
      const walk = document.createTreeWalker(root.closest("section") ?? root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
        const el = n.parentElement;
        const shown = el && !el.closest(".dove-layer") && (el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
        return n.textContent?.trim() && shown ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      } });
      const range = document.createRange();
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        range.selectNodeContents(n);
        // SVG の文字は textLength で詰めて描いているので、描かれた <text> の箱で測る
        const svgText = n.parentElement?.closest("text");
        for (const r of svgText ? [svgText.getBoundingClientRect()] : range.getClientRects()) if (r.width > 0 && r.height > 0) out.push({ l: r.left - b.left - 2, r: r.right - b.left + 2, t: r.top - b.top - 2, b: r.bottom - b.top + 2 });
      }
      return out;
    };
    /** 鳩と荷物の横の広がり（足もとから左・右）。荷物は向いている側に下がる */
    const reach = (dir: number) => { const s = size(); return dir > 0 ? [s * 0.5 + 6, s * 0.95 + 6] : [s * 0.95 + 6, s * 0.5 + 6]; };
    /** その点（足もと）に鳩がいると重なる文字の数 */
    const overlaps = (p: Pt, dir: number) => {
      const s = size();
      const [bl, br] = reach(dir);
      return texts().filter((R) => p.x + br > R.l && p.x - bl < R.r && p.y > R.t && p.y - s * 0.85 < R.b).length;
    };

    // ── 飛ぶ道：1本の短く自然な弧。文字にかからないよう、弧の高さと向きだけを選ぶ（回り道はしない） ──
    const N = 10;
    const arc = (a: Pt, b: Pt, dir: number): Sample[] => {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const horiz = Math.abs(dx) >= Math.abs(dy) * 0.6; // 横向き・斜めは上へふくらむ／縦はわきへふくらむ
      const build = (h: number, side: number) => {
        const out: Sample[] = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N, bump = 4 * t * (1 - t) * h * side;
          out.push({ x: a.x + dx * t + (horiz ? 0 : bump), y: a.y + dy * t - (horiz ? bump : 0), tilt: horiz ? (1 - 2 * t) * -9 * Math.sign(dx || 1) * dir * side : 0 });
        }
        return out;
      };
      const cost = (pts: Sample[]) => {
        let n = 0;
        for (let i = 1; i < pts.length; i++) for (const t of [0.25, 0.5, 0.75, 1]) n += overlaps({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }, dir);
        return n;
      };
      const base = horiz ? Math.min(26, 8 + len * 0.08) : Math.min(12, 4 + len * 0.04);
      const maxH = Math.max(base, len * 0.38);
      // ふつうの弧 → 少しずつ高く → 反対側へふくらむ、の順に試し、文字にかからない最初のもの
      const tries: [number, number][] = [[base, 1]];
      for (let h = base + 10; h <= maxH; h += 10) tries.push([h, 1]);
      if (!horiz) tries.push([base, -1]);
      for (let h = base + 10; h <= maxH; h += 10) tries.push([h, -1]);
      let best = build(base, 1), bestCost = Infinity;
      for (const [h, side] of tries) {
        const pts = build(h, side);
        const c = cost(pts);
        if (c === 0) return pts;
        if (c < bestCost) { best = pts; bestCost = c; }
      }
      return best;
    };
    const frame = (p: Sample, opacity?: number): Keyframe => {
      const f: Keyframe = { transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.tilt.toFixed(1)}deg)` };
      if (opacity !== undefined) f.opacity = String(opacity);
      return f;
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

    /** 着地：わずかにつぶれて戻る。荷物は少し遅れて揺れが収まる（フォロースルー） */
    const land = () => Promise.all([
      anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.08, .9)", offset: 0.35 }, { transform: "scale(.98, 1.03)", offset: 0.7 }, { transform: "none" }], { duration: T.land, easing: EASE_FLY }),
      anim(cargoEl, [{ transform: "rotate(10deg)" }, { transform: "rotate(-5deg)", offset: 0.45 }, { transform: "rotate(2deg)", offset: 0.8 }, { transform: "rotate(0deg)" }], { duration: T.land + 160, easing: EASE_FLY }),
    ]);

    // ── 飛ぶ：予備動作 → 短い弧で移動（翼は CSS で羽ばたき、荷物は揺れる）→ 着地 → 荷物をそっと置く ──
    const fly = async (to: Pt) => {
      const dir = to.x < pos.x - 4 ? -1 : 1;
      face(dir);
      textCache = null;
      const path = arc(pos, to, dir);
      await anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.07, .88)" }], { duration: T.crouch, easing: "ease-out" });
      dove.classList.add("is-flying");
      void anim(body, [{ transform: "translateY(1.5px) scale(1.07, .88)" }, { transform: "scale(.95, 1.06)", offset: 0.25 }, { transform: "none", offset: 0.6 }, { transform: "none" }], { duration: T.fly * 0.6, easing: "linear" });
      const len = Math.hypot(to.x - pos.x, to.y - pos.y);
      await anim(dove, path.map((p) => frame(p)), { duration: T.fly * (len > 480 ? 1.2 : 1), easing: EASE_FLY });
      if (cancelled) return;
      place(to);
      dove.classList.remove("is-flying");
      await land();
      // 荷物をそっと置く：少しかがんで荷物が下につき、また顔を上げる。左を向いて着いたときは右へ向き直る（荷物が文字の側に下がらないように）
      const turn = facing < 0 ? anim(flip, [{ transform: "scaleX(-1)" }, { transform: "scaleX(1)" }], { duration: 260, easing: EASE_FLY }).then(() => { facing = 1; flip.style.transform = ""; }) : Promise.resolve();
      await Promise.all([
        turn,
        anim(body, [{ transform: "none" }, { transform: "rotate(6deg)", offset: 0.45 }, { transform: "none" }], { duration: T.setDown, easing: EASE_FLY }),
        anim(cargoEl, [{ transform: "none" }, { transform: "translateY(2px)", offset: 0.45 }, { transform: "none" }], { duration: T.setDown, easing: EASE_FLY }),
      ]);
    };
    /** 終点のあと：上へ羽ばたいて去る（消えながら） */
    const flyAway = async () => {
      const s = size();
      const to = { x: pos.x + s * 0.9, y: pos.y - s * 2.6 };
      await anim(body, [{ transform: "none" }, { transform: "translateY(1.5px) scale(1.07, .88)" }], { duration: T.crouch, easing: "ease-out" });
      dove.classList.add("is-flying");
      void anim(body, [{ transform: "translateY(1.5px) scale(1.07, .88)" }, { transform: "none", offset: 0.4 }, { transform: "none" }], { duration: T.away * 0.5, easing: "linear" });
      const path: Sample[] = Array.from({ length: N + 1 }, (_, i) => { const t = i / N; return { x: pos.x + (to.x - pos.x) * t, y: pos.y + (to.y - pos.y) * t * t * 0.4 + (to.y - pos.y) * t * 0.6, tilt: -10 * t }; });
      await anim(dove, path.map((p, i) => frame(p, i / N < 0.35 ? 1 : 1 - (i / N - 0.35) / 0.65)), { duration: T.away, easing: "cubic-bezier(.4, 0, .6, 1)" });
      dove.classList.remove("is-flying");
      dove.style.opacity = "0";
    };
    /** 次の周：起点に新しい荷物を持って、上からふわっと舞い降りる */
    const descend = async (p0: Pt) => {
      const s = size();
      const from = { x: p0.x - s * 0.7, y: p0.y - s * 2.2 };
      face(1);
      place(p0);
      dove.classList.add("is-flying");
      const path: Sample[] = Array.from({ length: N + 1 }, (_, i) => { const t = i / N, e = 1 - (1 - t) * (1 - t); return { x: from.x + (p0.x - from.x) * e, y: from.y + (p0.y - from.y) * t, tilt: 8 * (1 - t) }; });
      await anim(dove, path.map((p, i) => frame(p, Math.min(1, (i / N) / 0.4))), { duration: T.descend, easing: "cubic-bezier(.2, .6, .35, 1)" });
      if (cancelled) return;
      place(p0);
      dove.style.opacity = "1";
      dove.classList.remove("is-flying");
      await land();
    };

    // ── 着いたときの小さな出来事 ──
    const fxAt = (p: Pt) => { fx.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };
    const play = async (cls: string, ms: number) => {
      const list = cls.split(" ");
      fx.classList.remove(...list);
      void fx.offsetWidth; // 同じ出来事をもう一度起こすため
      fx.classList.add(...list);
      await wait(ms);
      fx.classList.remove(...list);
    };
    const events = {
      chat: async () => {
        fxAt(pos);
        // 縦並び（列が狭い）では、鳩がいったん控えて、同じ場所で吹き出しが交わる
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
    const runEvent = async (stop: DoveStop) => {
      if (stop.event === "check" || stop.event === "stamp") await badge(stop.event);
      if (stop.event === "stamp") await events.stamp();
      else if (stop.event === "ring") await events.ring(stop.at);
      else if (stop.event === "chat") await events.chat();
      else if (stop.event === "page") {
        // カードにページが1枚加わる（カード側の CSS で .is-page のときだけ動く）
        const t = find(stop.at)?.t;
        if (t) replay(t, "is-page");
        await wait(900);
      }
    };

    const setStep = (nowKey: string | null, doneKeys: string[]) => { setNow(nowKey); setDone(doneKeys); if (nowKey) curKey = nowKey; };

    // 起点の工程が画面に入っているか（スマホで、起点が画面の外のまま出発しないように）
    let startSeen = false;
    const startIO = new IntersectionObserver((entries) => {
      for (const e of entries) startSeen = e.isIntersecting && (e.intersectionRatio >= 0.85 || e.intersectionRect.height >= window.innerHeight * 0.6);
      wakeRef.current();
    }, { threshold: [0, 0.5, 0.85, 1] });
    let watched: Element | null = null;
    const watchStart = (key: string) => {
      const t = find(key)?.t ?? null;
      if (t === watched) return;
      if (watched) startIO.unobserve(watched);
      watched = t;
      startSeen = false;
      if (t) startIO.observe(t);
    };
    /** 出発してよいか：止める条件がなく、起点が画面に入っている */
    const startGate = () => new Promise<void>((resolve) => {
      const check = () => { if (cancelled || (!paused() && (startSeen || !watched))) { wakeRef.current = () => {}; resolve(); } };
      wakeRef.current = check;
      check();
    });
    // 起点の印：鳩が立つ小さな黄色の点。起点が画面に入ったとき、輪が2回だけそっと広がる
    let startKey = "";
    const markStart = (key: string) => {
      startKey = key;
      const p = perch(key);
      if (p) startDot.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      watchStart(key);
    };

    const run = async () => {
      let loop = 0;
      let list = stops(0);
      // 初期表示：画面に入る前から、起点で鳩が荷物を持って待っている（起点の工程だけ点灯）
      const p0 = perch(list[0].at);
      if (!p0) return;
      place(p0);
      setCargo(list[0].cargo ?? "doc", !!list[0].gold);
      dove.style.opacity = "1";
      markStart(list[0].at);
      setStep(list[0].at, [list[0].at]);
      while (!cancelled) {
        const first = list[0];
        // 起点：起点が画面に入ってから、しばらく静止して出発する。
        // 静止と並行して、図そのものの表示アニメーション（現れる・線を引く）が終わるのを待つ（最大1.2秒）
        await startGate();
        if (cancelled) return;
        replay(startDot, "is-hello");
        const appearing = (root.closest("section") ?? root).getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity && !(a.effect instanceof KeyframeEffect && a.effect.target instanceof Element && a.effect.target.closest(".dove-layer")));
        await Promise.all([wait(T.startHold), Promise.race([Promise.all(appearing.map((a) => a.finished.catch(() => undefined))), wait(1200)])]);
        await startGate();
        if (cancelled) return;
        if (first.event) await runEvent(first);
        const visited = [first.at];
        for (const [i, stop] of list.slice(1).entries()) {
          await gate();
          if (cancelled) return;
          // 運ぶものを持ち替えてから飛び立つ（ふつうは前の工程で止まっている間に済んでいる）
          if (stop.cargo) await swapCargo(stop.cargo, !!stop.gold);
          const to = perch(stop.at);
          if (!to) continue;
          // 同じ工程で荷物が変わるだけ（例：商談 → 受注）のときは飛ばず、その場で荷物をそっと置き直す
          if (stop.at === curKey) await anim(body, [{ transform: "none" }, { transform: "rotate(6deg)", offset: 0.45 }, { transform: "none" }], { duration: T.setDown, easing: EASE_FLY });
          else await fly(to);
          if (cancelled) return;
          if (!visited.includes(stop.at)) visited.push(stop.at);
          setStep(stop.at, [...visited]);
          if (stop.event) await runEvent(stop);
          const next = list[i + 2];
          // 止まっている間（画面外など）は持ち替えない。再開してから飛び立つ前に持ち替える
          await Promise.all([wait(T.dwell), next?.cargo && !paused() && swapCargo(next.cargo, !!next.gold)]);
        }
        // 終点：通った工程がそろって「完了」になる（達成感）→ 鳩は上へ羽ばたいて去る
        setStep(null, [...visited]);
        await wait(T.together);
        await gate();
        if (cancelled) return;
        await flyAway();
        if (cancelled) return;
        // 少し間を置いて、点灯が静かに消える。くり返しを表す表示（[data-cycle]）があれば、そっと反応する
        await wait(T.rest);
        setStep(null, []);
        for (const c of root.querySelectorAll("[data-cycle]")) replay(c, "is-cycle");
        await wait(T.gap);
        // 次の周：起点に新しい荷物を持って舞い降りる（起点へ飛んで戻ることはしない）
        loop++;
        list = stops(loop);
        await gate();
        if (cancelled) return;
        const p = perch(list[0].at);
        if (!p) return;
        setCargo(list[0].cargo ?? "doc", !!list[0].gold);
        cargoCard.classList.remove("show-check", "show-stamp");
        markStart(list[0].at);
        await descend(p);
        if (cancelled) return;
        setStep(list[0].at, [list[0].at]);
      }
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
    // 画面幅が変わったら（文字の読み込みで高さが変わったときも）、今いる工程と起点の印を置き直す（動きなしで）
    const replace = () => {
      if (dove.classList.contains("is-flying")) return;
      const p = curKey ? perch(curKey) : null;
      if (p) place(p);
      if (startKey) markStart(startKey);
    };
    const ro = new ResizeObserver(replace);
    ro.observe(root);
    void document.fonts?.ready.then(() => { if (!cancelled) replace(); });
    setRunning(true);
    void run();
    return () => {
      cancelled = true;
      wakeRef.current();
      io.disconnect();
      startIO.disconnect();
      ro.disconnect();
      watcher.stop();
      document.removeEventListener("visibilitychange", onVis);
      for (const a of el.getAnimations({ subtree: true })) a.cancel();
      setRunning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, stops, still, keyList, opts.verticalQuery]);

  const state = (key: string) => `${done.includes(key) ? " is-done" : ""}${now === key ? " is-now" : ""}`;
  const node = still ? null : <DoveLayer layer={layer} />;
  return { state, layer: node, running, still, now, done };
}

/** 鳩と荷物、着いたときの出来事（読み上げない・クリックできない重ね絵） */
function DoveLayer({ layer }: { layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="dove-layer" ref={layer} aria-hidden="true">
      <span className="dove-start" />
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
  payslip: "M6 3h12v18H6zM9.5 7.5l2.5 3.5 2.5-3.5M12 11v5.5M9.8 12.6h4.4M9.8 14.8h4.4",
  contract: "M6 3h9l3 3v15H6zM9 8h6M9 11h6M9 14h3M13.5 17.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  estimate: "M9 3.5h6v3H9zM9 5H6v16h12V5h-3M9 11h6M9 14h6M9 17h3.5",
  flowchart: "M3.5 4h7v5h-7zM13.5 15h7v5h-7zM7 9v3.5h10V15M13.5 6.5h7",
};
