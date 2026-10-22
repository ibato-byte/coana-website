/* 空に浮かぶ白い羽（ロゴの羽のモチーフ。飾り）。
 * 画面に入っている間だけ、ゆっくり上へ流れる（[data-live] → .is-live。motion.ts）。動かすのは transform と opacity だけ。
 * スマホと「動きを減らす」設定では止まった状態で表示する（index.css / signal.css）。
 */
const FEATHERS = [
  [6, 18, 0, 22], [14, 64, -6, 16], [23, 30, -11, 26], [33, 82, -3, 14], [44, 12, -14, 20], [52, 58, -8, 18],
  [61, 88, -1, 24], [70, 36, -12, 15], [79, 70, -5, 21], [88, 22, -9, 17], [95, 52, -15, 23],
] as const;
export function Feathers({ count = FEATHERS.length }: { count?: number }) {
  return (
    <div className="sky-feathers" data-live aria-hidden="true">
      {FEATHERS.slice(0, count).map(([x, y, d, s], i) => (
        <svg key={i} className="sky-feather" viewBox="-12 -14 24 30" style={{ ["--x" as string]: `${x}%`, ["--y" as string]: `${y}%`, ["--d" as string]: `${d}s`, ["--s" as string]: `${s}px`, ["--dur" as string]: `${16 + (i % 4) * 3}s` }}>
          <path d="M0 13C7 3 6-8 0-13-6-8-7 3 0 13Z" />
          <path className="sky-feather-vein" d="M0 15V-10" />
        </svg>
      ))}
    </div>
  );
}

