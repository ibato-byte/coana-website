import { useEffect, useRef } from "react";
import { FEATHER_PATH } from "./logo";

const FEATHER = typeof Path2D !== "undefined" ? new Path2D(FEATHER_PATH) : null;

/* 空に浮かぶ白い羽（ロゴの羽のモチーフ。飾り）。デザイン案と同じ動き：
 * 羽はゆらゆら左右に揺れながら、ゆっくり舞い上がり、上に抜けたら下からまた現れる（canvas に描く）。
 * - 画面に入っている間・タブが表示されている間だけ動かす（画面外では描画ループ自体を止める）。
 * - 「動きを減らす」設定では、止まった羽を1回だけ描く。
 * - 数はPC 16枚（お問い合わせの帯は14枚）、幅700px未満は8枚。
 */
type Feather = { x: number; y: number; s: number; a: number; vy: number; ph: number; o: number };

export function Feathers({ count, mobileCount = 8 }: { count?: number; mobileCount?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = window.innerWidth < 700 ? mobileCount : (count ?? 16);
    let W = 0, H = 0;
    const size = () => {
      const D = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * D; canvas.height = H * D;
      ctx.setTransform(D, 0, 0, D, 0, 0);
    };
    size();
    const fs: Feather[] = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: 12 + Math.random() * 14, a: Math.random() * 6.28,
      vy: -0.15 - Math.random() * 0.3, ph: Math.random() * 6.28, o: 0.35 + Math.random() * 0.4,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const f of fs) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.a + Math.sin(f.ph) * 0.4);
        ctx.globalAlpha = f.o;
        const s = f.s;
        // 羽は、ロゴの羽と同じ形（白）。中心をそろえて、高さが約 2s になるよう縮める
        const k = (s * 2) / 103;
        ctx.scale(k, k);
        ctx.translate(-85.7, -51.5);
        ctx.fillStyle = "#fff";
        if (FEATHER) ctx.fill(FEATHER, "evenodd");
        // 羽軸（根元から先へ通る細い芯）。これで葉ではなく羽に見える
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(46, 114);
        ctx.quadraticCurveTo(64, 84, 100, 40);
        ctx.stroke();
        ctx.restore();
      }
    };
    let raf = 0;
    let visible = false;
    const step = () => {
      for (const f of fs) {
        f.ph += 0.02;
        f.y += f.vy;
        f.x += Math.sin(f.ph) * 0.4;
        if (f.y < -40) { f.y = H + 40; f.x = Math.random() * W; }
      }
      draw();
      raf = visible && !document.hidden ? requestAnimationFrame(step) : 0;
    };
    const start = () => { if (!reduce && visible && !document.hidden && !raf) raf = requestAnimationFrame(step); };
    const onResize = () => { size(); draw(); };
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(canvas);
    document.addEventListener("visibilitychange", start);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", start);
    };
  }, [count, mobileCount]);
  return <canvas className="sky-feathers" ref={ref} aria-hidden="true" />;
}
