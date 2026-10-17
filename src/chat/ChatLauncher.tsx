import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Nav } from "../shared";
import type { ChatPanelProps } from "./ChatPanel";

// ボタンの文言はここに直接書く（content/chat.json を読み込むと、チャットの全データが最初の読み込みに含まれてしまうため）
const BOT_NAME = "鳩博士";
const LAUNCHER_LABEL = "鳩博士に質問する";

/* ───────────────────────── 鳩博士チャット：画面右下の丸いボタン ─────────────────────────
 * ページの読み込みを遅くしないよう、ここ（ボタンだけ）を最初に読み込み、チャット本体（ChatPanel・知識データ）は開いたときに読み込む。
 * 勝手に話しかけたり動き回ったりはしない。openChat()（shared.tsx）で、診断から始めた状態で開くこともできる。
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
    document.documentElement.classList.toggle("chat-open", open);
  }, [open]);
  const close = () => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={open ? "chat-launcher is-open" : "chat-launcher"}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "鳩博士のチャットを閉じる" : LAUNCHER_LABEL + "（チャットを開く）"}
        onClick={() => (open ? close() : show("menu"))}
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
      >
        <img src="/images/chatbot/hato-hakase-avatar-128.webp" alt="" width={64} height={64} decoding="async" />
        <span className="chat-launcher-label" aria-hidden="true">{BOT_NAME}</span>
      </button>
      {open && Panel && <Panel navigate={navigate} mode={mode} request={request} onClose={close} />}
    </>
  );
}
