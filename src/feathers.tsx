import { useEffect, useRef } from "react";

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
      x: Math.random() * W, y: Math.random() * H, s: 10 + Math.random() * 16, a: Math.random() * 6.28,
      vy: -0.15 - Math.random() * 0.3, ph: Math.random() * 6.28, o: 0.3 + Math.random() * 0.4,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const f of fs) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.a + Math.sin(f.ph) * 0.4);
        ctx.globalAlpha = f.o;
        const s = f.s;
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 0.55, s * 0.2, s * 0.45, -s * 0.6, 0, -s);
        ctx.bezierCurveTo(-s * 0.45, -s * 0.6, -s * 0.55, s * 0.2, 0, s);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "rgba(6,112,203,.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, s * 1.2);
        ctx.lineTo(0, -s * 0.8);
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
