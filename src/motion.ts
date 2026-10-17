/* ───────────────────────── 画面に入ったときの表示（サイト共通） ─────────────────────────
 * 決まりごとは docs/motion-rules.md。スクロールの量に連動する動きは使わない（文字は画面に入ったらすぐ読める）。
 * ここでは次の3つだけを受け持つ。
 *
 * 1. [data-reveal] … 画面に入る少し前に .in を付けて表示する（文字は 0.3 秒ほどで読める状態に）。
 *    画面より上にある要素（一気に下までスクロールした・ページ内リンクや戻るボタンで飛んできた）は、
 *    動きなしで（.motion-instant）すぐ表示済みにする。一度表示したものは、上に戻っても消さない。
 * 2. [data-draw] … 中の SVG の線に pathLength="1" を付け、CSS で「線で描く」表示ができるようにする（[data-redraw] はホバーで描き直すだけ）。
 * 3. [data-live] … 画面に入っている間だけ .is-live を付ける（ゆっくり繰り返す動きは、このときだけ動かす）。
 *    中の SVG アニメーション（光の粒）も、画面外では止める。
 *    挿絵（.art）も、画面外では .art-paused で止める。
 *
 * スクロールは乗っ取らない（速さを変えない・画面を固定しない・スナップしない）。読み取りは IntersectionObserver だけ。
 * 「動きを減らす」設定では何も動かさず、すべて最初から表示する（html に .motion-ready を付けない）。
 */

const REVEAL = "[data-reveal]";
const DRAW = "[data-draw], [data-redraw]";
const LIVE = "[data-live]";
const SHAPES = "path, circle, rect, line, polyline, polygon, ellipse";

/** 画面より上にある要素は、どこまで上でも「通り過ぎた」として扱う（大きな上方向の余白） */
const ABOVE = 100000;

export function installMotion() {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    finishAll(document);
    watchAdded(finishAll);
    return;
  }
  root.classList.add("motion-ready");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) installTilt();

  const instant = (el: Element) => {
    el.classList.add("motion-instant");
    // 表示済みの状態が描画されてから、動きの指定を戻す
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("motion-instant")));
  };

  // 1. 表示：画面の下端より少し手前（12%）で始める。画面より上にあるものは、動きなしですぐ表示
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
    { rootMargin: `${ABOVE}px 0px 12% 0px` }, // 画面に入る少し前に始め、入ったときには読める状態に
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

  // 挿絵（illustrations.tsx の .art）のゆっくりした繰り返しも、画面外では止める（.art-paused）
  const art = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle("art-paused", !entry.isIntersecting);
  });

  // 種類ごとに「準備済み」を記録する（1つの要素が [data-reveal] と [data-live] などを兼ねることがある）
  const done = { reveal: new WeakSet<Element>(), draw: new WeakSet<Element>(), live: new WeakSet<Element>(), art: new WeakSet<Element>() };
  const once = (set: WeakSet<Element>, el: Element) => (set.has(el) ? false : (set.add(el), true));
  const scan = (scope: ParentNode) => {
    each(scope, REVEAL, (el) => {
      if (once(done.reveal, el) && !el.classList.contains("in")) reveal.observe(el);
    });
    each(scope, DRAW, (el) => {
      if (once(done.draw, el)) el.querySelectorAll(SHAPES).forEach((shape) => shape.setAttribute("pathLength", "1"));
    });
    each(scope, LIVE, (el) => {
      if (!once(done.live, el)) return;
      el.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((svg) => svg.pauseAnimations());
      live.observe(el);
    });
    each(scope, ".art", (el) => {
      if (once(done.art, el)) art.observe(el);
    });
  };
  scan(document);
  // ページの切り替えや絞り込みで後から加わった要素も対象にする
  watchAdded(scan);
}

/** 後から加わった要素を、まとめて1回だけ処理する */
function watchAdded(fn: (scope: Element) => void) {
  let pending: Element[] = [];
  new MutationObserver((records) => {
    const first = pending.length === 0;
    for (const record of records) record.addedNodes.forEach((node) => node instanceof Element && pending.push(node));
    if (!first || pending.length === 0) return;
    queueMicrotask(() => {
      const nodes = pending;
      pending = [];
      nodes.forEach((node) => node.isConnected && fn(node));
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

/** 「動きを減らす」設定：すべて表示済みにする */
function finishAll(scope: ParentNode) {
  each(scope, REVEAL, (el) => el.classList.add("in"));
  each(scope, LIVE, (el) => el.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((svg) => svg.pauseAnimations()));
}

function each(scope: ParentNode, selector: string, fn: (el: Element) => void) {
  if (scope instanceof Element && scope.matches(selector)) fn(scope);
  scope.querySelectorAll(selector).forEach(fn);
}
