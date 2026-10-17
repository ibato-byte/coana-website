import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Nav, Page } from "../shared";
import type { ChatPanelProps } from "./ChatPanel";

// ボタンの文言はここに直接書く（content/chat.json を読み込むと、チャットの全データが最初の読み込みに含まれてしまうため）
const LAUNCHER_LABEL = "COANA TOKYO サポートチームに質問・相談する";
export const CHAT_MARK = "/images/chat/coana-mark.webp";
/** スマホではチャットを全画面のシートにする（chat.css と同じ幅） */
export const SHEET_QUERY = "(max-width: 640px)";

/* ───────────────────────── サポートチャット：画面右下のボタン ─────────────────────────
 * 役割は「困ったらここ」の控えめな入口。主役（ヘッダーの「お問い合わせ」、ヒーローや各セクションの相談ボタン、ページ下部のお問い合わせ帯）より
 * 目立たせず、どのページでも同じ場所にある。
 * - PC：紺のピル型（白い丸にロゴマーク＋「チャットで相談・診断」）。スマホ：紺の丸（ロゴマーク）。
 * - ページを開いた直後は出さず、少しスクロールしてから、ふわっと1回だけ現れる（ヒーローの鳩と重ならない）。繰り返し動き続けない。
 * - フッターの最下部（プライバシーポリシーなど）が見えている間は隠れる。お問い合わせページでは、PC は丸だけ・スマホは出さない（入力の邪魔をしない）。
 * - 各サービスLPのスマホでは、下部の固定バーにチャットのボタンを入れ、このボタンは出さない（SolutionPage の StickyCta）。
 * ページの読み込みを遅くしないよう、ここ（ボタンだけ）を最初に読み込み、チャット本体（ChatPanel・知識データ）は開いたときに読み込む。
 * openChat()（shared.tsx）で、診断から始めた状態で開くこともできる。
 * スマホで開いている間は、背景のページをスクロールさせない（iOS Safari でも効くよう body を固定し、閉じたら元の位置へ戻す）。
 */
const SHOW_AFTER_PX = 160;

export function ChatLauncher({ navigate, page }: { navigate: Nav; page: Page }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "diagnosis">("menu");
  const [request, setRequest] = useState(0); // 開いたまま「診断から」を押されたときに、パネルへ伝える
  const [Panel, setPanel] = useState<ComponentType<ChatPanelProps> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [shown, setShown] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  // 少しスクロールしたら出す（一度出したら、上に戻っても消さない）。スクロールできないほど短いページでは最初から出す
  useEffect(() => {
    if (shown) return;
    const check = () => {
      if (window.scrollY > SHOW_AFTER_PX || document.documentElement.scrollHeight <= window.innerHeight + SHOW_AFTER_PX) setShown(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [shown, page]);
  // フッターの最下部（著作権表示・プライバシーポリシー）が見えている間は、重ならないよう隠す
  useEffect(() => {
    const target = document.querySelector(".footer-bottom");
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting));
    io.observe(target);
    return () => io.disconnect();
  }, [page]);

  const load = () => import("./ChatPanel").then((m) => setPanel(() => m.ChatPanel));
  const show = (next: "menu" | "diagnosis") => {
    setMode(next);
    setRequest((n) => n + 1);
    setOpen(true);
    void load();
    window.gtag?.("event", "chat_open", { chat_mode: next });
  };
  useEffect(() => {
    const onOpen = (e: Event) => show(((e as CustomEvent).detail?.mode as "menu" | "diagnosis") || "menu");
    window.addEventListener("coana:chat", onOpen);
    return () => window.removeEventListener("coana:chat", onOpen);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("chat-open", open);
    if (!open || !window.matchMedia(SHEET_QUERY).matches) return;
    // 背景のスクロールを止める。overflow: hidden だけでは iOS Safari で止まらないため、body ごと固定する
    const body = document.body;
    const y = window.scrollY;
    const href = window.location.href;
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right };
    Object.assign(body.style, { position: "fixed", top: `-${y}px`, left: "0", right: "0" });
    root.classList.add("chat-scroll-lock");
    return () => {
      Object.assign(body.style, prev);
      root.classList.remove("chat-scroll-lock");
      // 同じページで閉じたときだけ元の位置へ戻す（リンクで別のページへ移ったときは、そのページの先頭のまま）
      if (window.location.href !== href) return;
      const behavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      root.style.scrollBehavior = behavior;
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus({ preventScroll: true }), 0);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={["chat-launcher", open && "is-open", (shown || open) && !atFooter && "is-shown", page === "contact" && "is-quiet"].filter(Boolean).join(" ")}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "チャットを閉じる" : LAUNCHER_LABEL + "（チャットを開く）"}
        onClick={() => (open ? close() : show("menu"))}
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
      >
        <span className="chat-launcher-mark"><img src={CHAT_MARK} alt="" width={26} height={26} decoding="async" /></span>
        <span className="chat-launcher-text" aria-hidden="true">チャットで相談・診断</span>
      </button>
      {open && Panel && <Panel navigate={navigate} mode={mode} request={request} onClose={close} />}
    </>
  );
}
