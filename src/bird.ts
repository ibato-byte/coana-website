/* ───────────────────────── 矢印 ⇄ 鳥（鳩）の形 ─────────────────────────
 * お問い合わせ系の主ボタンの矢印は、ホバーで線がつながったまま形を変え、前へ飛ぶ鳥になる（BirdArrow ＋ buttonFx.ts）。
 * どちらも 24×24 の中の線2本でできている：
 *   body … 矢印の軸 ⇄ 鳥の胴（翼の付け根の下を通る短い線。前へ向かって少し上がる）。3つの3次ベジェ曲線
 *   wing … 矢じり ⇄ 左右の翼（後ろの翼の先 → 胴 → 前の翼の先。カモメのような「M」の形）。2つの3次ベジェ曲線
 * 点の数と並びを揃えてあるので、点ごとに補間するだけで形が変わる。翼は羽ばたきの3つの姿勢（上・中・下）を持つ。
 * 数字は [始点x, 始点y, 制御点1x, 制御点1y, 制御点2x, 制御点2y, 終点x, 終点y, …]。
 */
type Points = number[];

const ARROW = {
  body: [3, 12, 5.67, 12, 8.33, 12, 11, 12, 13, 12, 15, 12, 17, 12, 17.67, 12, 18.33, 12, 19, 12],
  wing: [14, 7, 15.67, 8.67, 17.33, 10.33, 19, 12, 17.33, 13.67, 15.67, 15.33, 14, 17],
};
const BIRD_BODY: Points = [9.2, 14.2, 10.6, 14.6, 12, 14.4, 13.2, 14, 14.4, 13.6, 15.4, 13.2, 16.4, 12.8, 16.9, 12.6, 17.3, 12.3, 17.6, 11.9];
const WING_UP: Points = [2.8, 4.2, 6.4, 2.8, 10.4, 5.4, 12.2, 13.4, 13.6, 7.2, 16.8, 3.4, 21.2, 3.6];
const WING_MID: Points = [1.8, 9.6, 5, 6.6, 9.6, 7, 12.2, 13.4, 14, 8.6, 17.8, 6.6, 22, 8.4];
const WING_DOWN: Points = [3.4, 18.6, 5.2, 15, 9, 13, 12.2, 13.4, 14.6, 13.6, 18, 15.4, 20.2, 18.8];

/** 翼は、矢じりを支点のまわりに回しながら形を変える（矢じりが下向きの「V」になってから翼に開く。
 *  ただの直線補間だと、途中で線が交差して乱れる） */
const PIVOT_X = 12;
const PIVOT_Y = 12;
const SWING = (90 * Math.PI) / 180;

const lerp = (a: Points, b: Points, t: number) => a.map((v, i) => v + (b[i] - v) * t);
function rotate(points: Points, angle: number): Points {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out: Points = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] - PIVOT_X;
    const y = points[i + 1] - PIVOT_Y;
    out.push(PIVOT_X + x * c - y * s, PIVOT_Y + x * s + y * c);
  }
  return out;
}
const toPath = (p: Points) => {
  let d = "M" + p[0].toFixed(2) + " " + p[1].toFixed(2);
  for (let i = 2; i < p.length; i += 6) d += "C" + p.slice(i, i + 6).map((v) => v.toFixed(2)).join(" ");
  return d;
};

/** 翼の姿勢：0 = 上げた翼、.5 = 水平に広げた翼、1 = 打ち下ろした翼。止まっているときは BIRD_REST */
function wingAt(flap: number): Points {
  return flap <= 0.5 ? lerp(WING_UP, WING_MID, flap * 2) : lerp(WING_MID, WING_DOWN, (flap - 0.5) * 2);
}

/** m = 0（矢印）〜 1（鳥）、flap = 翼の姿勢 のときの2本の線 */
export function birdPaths(m: number, flap: number) {
  // 先に矢じりが回って下向きの「V」になり（turn）、そのあと翼として開く（open）。軸は全体の進みに合わせて胴になる
  const turn = Math.min(1, Math.max(0, m * 1.6));
  const open = m <= 0 ? 0 : m >= 1 ? m : Math.pow(m, 1.6);
  const wingLocal = lerp(ARROW.wing, rotate(wingAt(flap), -SWING), open);
  return { body: toPath(lerp(ARROW.body, BIRD_BODY, m)), wing: toPath(rotate(wingLocal, SWING * turn)) };
}

/** 鳥になって止まっているときの翼の姿勢（少し上げた「M」の形） */
export const BIRD_REST = 0.4;

export const ARROW_PATHS = birdPaths(0, BIRD_REST);
