import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Nav } from "../shared";
import type { ChatPanelProps } from "./ChatPanel";

// ボタンの文言はここに直接書く（content/chat.json を読み込むと、チャットの全データが最初の読み込みに含まれてしまうため）
const LAUNCHER_LABEL = "COANA TOKYO サポートチームに質問・相談する";
export const CHAT_MARK = "/images/chat/coana-mark.webp";
/** スマホではチャットを全画面のシートにする（chat.css と同じ幅） */
export const SHEET_QUERY = "(max-width: 640px)";

/* ───────────────────────── サポートチャット：画面右下の丸いボタン ─────────────────────────
 * ページの読み込みを遅くしないよう、ここ（ボタンだけ）を最初に読み込み、チャット本体（ChatPanel・知識データ）は開いたときに読み込む。
 * 勝手に話しかけたり動き回ったりはしない。openChat()（shared.tsx）で、診断から始めた状態で開くこともできる。
 * スマホで開いている間は、背景のページをスクロールさせない（iOS Safari でも効くよう body を固定し、閉じたら元の位置へ戻す）。
 */
export function ChatLauncher({ navigate }: { navigate: Nav }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "diagnosis">("menu");
  const [request, setRequest] = useState(0); // 開いたまま「診断から」を押されたときに、パネルへ伝える
  const [Panel, setPanel] = useState<ComponentType<ChatPanelProps> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

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
        className={open ? "chat-launcher is-open" : "chat-launcher"}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "チャットを閉じる" : LAUNCHER_LABEL + "（チャットを開く）"}
        onClick={() => (open ? close() : show("menu"))}
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
      >
        <img src={CHAT_MARK} alt="" width={34} height={34} decoding="async" />
        {/* チャットだと分かるよう、小さな吹き出しを添える */}
        <span className="chat-launcher-badge" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.7a.6.6 0 0 1-1-.47V16A2.5 2.5 0 0 1 4 13.5Z" /></svg>
        </span>
        <span className="chat-launcher-label" aria-hidden="true">ご相談</span>
      </button>
      {open && Panel && <Panel navigate={navigate} mode={mode} request={request} onClose={close} />}
    </>
  );
}
