/* ───────────────────────── スクロールに合わせた表示（サイト共通） ─────────────────────────
 * 決まりごとは docs/motion-rules.md。ここでは次の4つだけを受け持つ。
 *
 * 1. [data-reveal] … 画面に入ったら .in を付けて表示する（文字は 0.4 秒で読める状態に）。
 *    画面より上にある要素（一気に下までスクロールした・ページ内リンクや戻るボタンで飛んできた）は、
 *    動きなしで（.motion-instant）すぐ表示済みにする。一度表示したものは、上に戻っても消さない。
 * 2. [data-draw] … 中の SVG の線に pathLength="1" を付け、CSS で「線で描く」表示ができるようにする。
 * 3. [data-live] … 画面に入っている間だけ .is-live を付ける（ゆっくり繰り返す動きは、このときだけ動かす）。
 *    中の SVG アニメーション（光の粒）も、画面外では止める。
 * 4. [data-progress] … ステップをつなぐ線の進み具合（--p：0〜1）をスクロール位置から決める。
 *    線は戻らない（最大値を保つ）。線が届いた [data-step] に .is-reached、最後まで届いたら .is-done を付ける。
 *
 * スクロールは乗っ取らない（速さを変えない・画面を固定しない・スナップしない）。読み取りは IntersectionObserver と
 * 1フレームに1回のスクロール処理だけ。「動きを減らす」設定では何も動かさず、すべて最初から表示する（html に .motion-ready を付けない）。
 */

const REVEAL = "[data-reveal]";
const DRAW = "[data-draw]";
const LIVE = "[data-live]";
const PROGRESS = "[data-progress]";
const SHAPES = "path, circle, rect, line, polyline, polygon, ellipse";

/** 画面より上にある要素は、どこまで上でも「通り過ぎた」として扱う（大きな上方向の余白） */
const ABOVE = 100000;

export function installMotion() {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    finishAll(document);
    new MutationObserver(() => finishAll(document)).observe(document.body, { childList: true, subtree: true });
    return;
  }
  root.classList.add("motion-ready");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) installTilt();

  const instant = (el: Element) => {
    el.classList.add("motion-instant");
    // 表示済みの状態が描画されてから、動きの指定を戻す
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("motion-instant")));
  };

  // 1. 表示：画面の下端より少し手前で始める。画面より上にあるものは、動きなしですぐ表示
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        if (entry.boundingClientRect.bottom <= 0) instant(el);
        el.classList.add("in");
        reveal.unobserve(el);
      }
    },
    { rootMargin: `${ABOVE}px 0px 4% 0px` },
  );

  // 3. 画面内のときだけ動かす
  const live = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      el.classList.toggle("is-live", entry.isIntersecting);
      el.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((svg) => {
        if (entry.isIntersecting) svg.unpauseAnimations();
        else svg.pauseAnimations();
      });
    }
  });

  // 4. 線の進み具合
  const progress = new Map<HTMLElement, number>();
  const visible = new Set<HTMLElement>();
  const near = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(el);
        else visible.delete(el);
      }
      schedule();
    },
    { rootMargin: `${ABOVE}px 0px 0px 0px` },
  );
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    visible.forEach((el) => {
      const rect = (el.querySelector("[data-progress-area]") ?? el).getBoundingClientRect();
      // 線の先端は、画面の下から2割ほどの高さを追いかける。要素が画面より上なら、引き終えた状態
      const span = Math.max(rect.height, vh * 0.4);
      const raw = rect.bottom <= 0 ? 1 : (vh * 0.82 - rect.top) / span;
      const prev = progress.get(el) ?? 0;
      const p = Math.min(1, Math.max(prev, raw));
      if (p === prev && prev !== 0) return;
      if (rect.bottom <= 0 && prev < 1) instant(el);
      progress.set(el, p);
      setProgress(el, p);
      if (p >= 1) {
        visible.delete(el);
        near.unobserve(el);
      }
    });
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  const prepared = new WeakSet<Element>();
  const scan = (scope: ParentNode) => {
    each(scope, REVEAL, (el) => {
      if (prepared.has(el) || el.classList.contains("in")) return;
      prepared.add(el);
      reveal.observe(el);
    });
    each(scope, DRAW, (el) => {
      if (prepared.has(el)) return;
      prepared.add(el);
      el.querySelectorAll(SHAPES).forEach((shape) => shape.setAttribute("pathLength", "1"));
    });
    each(scope, LIVE, (el) => {
      if (prepared.has(el)) return;
      prepared.add(el);
      el.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((svg) => svg.pauseAnimations());
      live.observe(el);
    });
    each(scope, PROGRESS, (el) => {
      if (prepared.has(el)) return;
      prepared.add(el);
      progress.set(el as HTMLElement, 0);
      near.observe(el);
    });
  };
  scan(document);
  // ページの切り替えや絞り込みで後から加わった要素も対象にする
  let pending: Node[] = [];
  new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach((node) => node instanceof Element && pending.push(node));
    if (pending.length === 1) queueMicrotask(() => {
      const nodes = pending;
      pending = [];
      nodes.forEach((node) => node.isConnected && scan(node as Element));
    });
  }).observe(document.body, { childList: true, subtree: true });
}

/** PC（マウス）だけ：[data-tilt] のカードを、カーソルに合わせてわずかに傾け（最大 3°）、光を追従させる */
function installTilt() {
  const MAX = 3;
  let card: HTMLElement | null = null;
  let point = { x: 0, y: 0 };
  let frame = 0;
  const release = () => {
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    card = null;
  };
  const apply = () => {
    frame = 0;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (point.x - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (point.y - r.top) / r.height));
    card.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX).toFixed(2)}deg`);
    card.style.setProperty("--lx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--ly", `${(y * 100).toFixed(1)}%`);
  };
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const target = (e.target as Element | null)?.closest?.<HTMLElement>("[data-tilt]") ?? null;
    if (target !== card) {
      release();
      card = target;
      card?.classList.add("is-tilting");
    }
    if (!card) return;
    point = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener("pointerleave", release);
  window.addEventListener("blur", release);
}

/** 線の進み具合を反映する。ステップの位置（先頭 0 〜 最後 1）まで線が届いたら .is-reached */
function setProgress(el: HTMLElement, p: number) {
  el.style.setProperty("--p", p.toFixed(4));
  const steps = el.querySelectorAll<HTMLElement>("[data-step]");
  const last = Math.max(1, steps.length - 1);
  // 線（[data-track]）と点（[data-node]）があれば、実際の位置で届いたかを判断する（スマホの縦並びは行の高さが揃わないため）
  const track = el.querySelector<HTMLElement>("[data-track]")?.getBoundingClientRect();
  const vertical = !!track && track.height > track.width;
  steps.forEach((step, i) => {
    let at = i / last;
    const node = step.querySelector("[data-node]")?.getBoundingClientRect();
    if (track && node && (vertical ? track.height : track.width) > 0) {
      at = vertical
        ? (node.top + node.height / 2 - track.top) / track.height
        : (node.left + node.width / 2 - track.left) / track.width;
    }
    step.classList.toggle("is-reached", p >= Math.min(1, at) - 0.001);
  });
  el.classList.toggle("is-done", p >= 1);
}

/** 「動きを減らす」設定：すべて表示済み・線は引き終えた状態にする */
function finishAll(scope: ParentNode) {
  each(scope, REVEAL, (el) => el.classList.add("in"));
  each(scope, PROGRESS, (el) => {
    if (!el.classList.contains("is-done")) setProgress(el as HTMLElement, 1);
  });
  each(scope, LIVE, (el) => el.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((svg) => svg.pauseAnimations()));
}

function each(scope: ParentNode, selector: string, fn: (el: Element) => void) {
  if (scope instanceof Element && scope.matches(selector)) fn(scope);
  scope.querySelectorAll(selector).forEach(fn);
}
