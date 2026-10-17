import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import chat from "../../content/chat.json";
import { settings, solutions } from "../content";
import { lineUrl, setInquiryMessage, setInquiryPreset, type Nav, type NavArgs } from "../shared";
import { diagnose, type DiagConfig, type DiagResult } from "./diagnosis";
import { NO_INFO, OFF_TOPIC, isConfident, search, type Knowledge } from "./search";
import { CHAT_MARK, SHEET_QUERY } from "./ChatLauncher";
import "./chat.css";

/* ───────────────────────── サポートチャット（COANA TOKYO サポートチーム）：本体（開いたときに読み込む） ─────────────────────────
 * 1. 選択式のメニュー（content/chat.json の menu）：サービスの要点と関連ページを短く案内
 * 2. 「あなたに合うサービス診断」（diagnosis.ts）：5問の選択式。AI は使わない
 * 3. 自由入力：/api/chat（functions/api/chat.ts）が Workers AI でサイトの内容だけを根拠に回答。
 *    AI が使えない・上限に達したときは、ここでサイト内の知識（/chat-knowledge.json）をキーワード検索して案内する
 * どの流れでも、購買のサイン（料金・始め方・依頼したい など）や診断の完了、数回のやりとりのあとに、
 * 押し付けない形で無料相談（お問い合わせフォーム・LINE）を提案する。会話の内容は保存しない。
 * スマホでは全画面のシート。高さは実際の表示領域（visualViewport）に合わせ、キーボードが出ても入力欄がそのすぐ上に来る。
 */

export type ChatPanelProps = { navigate: Nav; mode: "menu" | "diagnosis"; request: number; onClose: () => void };

type Link = { t: string; u: string };
type Msg = {
  id: number;
  from: "bot" | "user";
  text?: string;
  note?: string;
  links?: Link[];
  menu?: boolean; // メニューのボタンを表示する
  consult?: boolean; // 無料相談の提案
  handoff?: string; // 担当者へ引き継ぐ質問
  diagStep?: number; // 診断の質問（何問目か）
  diagResult?: DiagResult;
  engine?: string; // 回答の出どころ（"ai" / "fallback:理由"）。画面には出さず、要素の data-engine で確認できる
};

const DIAG = chat.diagnosis as unknown as DiagConfig;
const MAX_CHARS = 200;
const BOOKING_URL = String((settings as { booking_url?: string }).booking_url || "");
/** 購買意欲のサイン：料金・期間・始め方・依頼したい など */
const BUYING = /料金|費用|いくら|値段|価格|見積|予算|月額|目安|相場|期間|どのくらい|いつから|始め|開始|導入したい|依頼|任せ|頼み|頼め|お願い|申し込|契約|相談したい|検討/;
/** 「あなたは AI／人間？」という質問 */
const IDENTITY = /(?:あなた|きみ|君|サポートチーム)(?:は|って)\s*(?:ai|ＡＩ|人間|ロボット|自動|bot|ボット|誰|何者)/i;
/** 個人情報らしき入力（メールアドレス・電話番号）は送らない */
const PERSONAL = /[\w.+-]+@[\w-]+\.[\w.]+|0\d{1,4}[-ー−\s]?\d{1,4}[-ー−\s]?\d{3,4}/;

const solutionBySlug = (slug: string) => solutions.find((sol) => sol.slug === slug);
const serviceName = (slug: string) => solutionBySlug(slug)?.nav_label || solutionBySlug(slug)?.title || slug;
const inquiryTypeOf = (slug?: string) => {
  const sol = slug ? solutionBySlug(slug) : undefined;
  if (!sol) return "";
  return sol.lang === "en" ? "Startup support (English)" : sol.nav_label || sol.title;
};

/** サイト内のパス → 画面切り替え（GoLink と同じ） */
function navArgs(u: string): NavArgs {
  const [path, hash] = u.split("#");
  if (path.startsWith("/services/")) return ["solution", hash, path.slice("/services/".length)];
  if (path.startsWith("/topics/")) return ["article", hash, path.slice("/topics/".length)];
  const page = ({ "/": "home", "/about": "about", "/services": "services", "/topics": "topics", "/contact": "contact", "/privacy": "privacy" } as const)[path as "/"] ?? "home";
  return [page, hash];
}

let knowledgePromise: Promise<Knowledge | null> | null = null;
const loadKnowledge = () =>
  (knowledgePromise ??= fetch("/chat-knowledge.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

export function ChatPanel({ navigate, mode, request, onClose }: ChatPanelProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<number[] | null>(null); // 診断中の回答（null = 診断していない）
  const [topic, setTopic] = useState<string>(""); // いま話題のサービス（相談種別に引き継ぐ）
  const [diagDone, setDiagDone] = useState<DiagResult | null>(null);
  const [warn, setWarn] = useState("");
  const idRef = useRef(0);
  const turnsRef = useRef(0); // お客さまの発言の数
  const consultAtRef = useRef(-99); // 最後に相談を提案した発言番号
  const questionsRef = useRef<string[]>([]); // 自由入力の質問（相談フォームへ引き継ぐ。保存はしない）
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const push = (...items: Omit<Msg, "id">[]) => setMsgs((old) => [...old, ...items.map((m) => ({ ...m, id: ++idRef.current }))]);

  // 開いたとき・「診断から」を押されたとき
  useEffect(() => {
    if (mode === "diagnosis") startDiagnosis(msgs.length === 0);
    else if (msgs.length === 0) push({ from: "bot", text: chat.greeting, note: chat.note, menu: true });
    void loadKnowledge();
    // スマホ（タッチ操作）では入力欄に自動でフォーカスしない（いきなりキーボードが開かないように）。パネル自体にフォーカスを移す
    const touch = window.matchMedia("(pointer: coarse)").matches;
    window.setTimeout(() => {
      if (mode === "diagnosis") panelRef.current?.querySelector<HTMLButtonElement>(".chat-option")?.focus({ preventScroll: true });
      else if (touch) panelRef.current?.focus({ preventScroll: true });
      else inputRef.current?.focus();
    }, 60);
  }, [request]);
  const scrollToEnd = (smooth = true) => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  useEffect(() => scrollToEnd(), [msgs, busy]);
  // スマホ：パネルを実際の表示領域（キーボードを除いた部分）にぴったり合わせる。iOS Safari ではキーボードが出ると
  // 表示領域がずれる（offsetTop）ので、その位置と高さを CSS 変数で渡す。表示領域が変わったら最新のメッセージへ
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const vv = window.visualViewport;
    if (!panel) return;
    const sheet = window.matchMedia(SHEET_QUERY);
    const update = () => {
      if (!sheet.matches || !vv) {
        panel.style.removeProperty("--chat-vh");
        panel.style.removeProperty("--chat-vtop");
        return;
      }
      panel.style.setProperty("--chat-vh", Math.round(vv.height) + "px");
      panel.style.setProperty("--chat-vtop", Math.round(vv.offsetTop) + "px");
      scrollToEnd(false);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    sheet.addEventListener("change", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      sheet.removeEventListener("change", update);
    };
  }, []);
  // 入力欄：内容に合わせて高さを伸ばす（5行ほどで止め、その先はスクロール）
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const log = logRef.current;
    const atEnd = !log || log.scrollHeight - log.clientHeight - log.scrollTop < 24;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
    // 入力欄が伸びて会話の表示が狭くなっても、最新のメッセージが見えたままにする
    if (atEnd) scrollToEnd(false);
  }, [input]);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 相談の提案を出すか：購買のサイン・診断の完了・3回以上のやりとり。前回の提案から3回はあけて、しつこくしない */
  const shouldConsult = (signal: boolean) => {
    const turn = turnsRef.current;
    if (turn - consultAtRef.current < 3) return false;
    if (signal || turn >= 3) { consultAtRef.current = turn; return true; }
    return false;
  };

  /* ── メニュー ── */
  const pickMenu = (item: (typeof chat.menu)[number]) => {
    turnsRef.current++;
    const slugs = item.page ? [item.page, ...(item.also ?? [])] : [];
    const links: Link[] = [...slugs.map((slug) => ({ t: serviceName(slug), u: "/services/" + slug })), ...((item as { links?: string[] }).links ?? []).map((u) => ({ t: u === "/services" ? "サービス一覧" : u, u }))];
    if (item.page) setTopic(item.page);
    push({ from: "user", text: item.label }, { from: "bot", text: item.text, links, consult: shouldConsult(BUYING.test(item.label)) });
  };

  /* ── 診断 ── */
  function startDiagnosis(fresh = false) {
    setAnswers([]);
    setDiagDone(null);
    const intro: Omit<Msg, "id">[] = fresh ? [{ from: "bot", text: chat.greeting, note: chat.note }] : [];
    push(...intro, { from: "bot", text: DIAG.intro }, { from: "bot", diagStep: 0 });
  }
  const answer = (step: number, option: number) => {
    if (!answers || step !== answers.length) return;
    const next = [...answers, option];
    setAnswers(next);
    const label = DIAG.questions[step].options[option].label;
    if (next.length < DIAG.questions.length) {
      push({ from: "user", text: label }, { from: "bot", diagStep: next.length });
      return;
    }
    turnsRef.current++;
    const result = diagnose(DIAG, next);
    setDiagDone(result);
    setAnswers(null);
    setTopic(result.picks[0].slug);
    consultAtRef.current = turnsRef.current;
    push({ from: "user", text: label }, { from: "bot", diagResult: result });
    window.gtag?.("event", "chat_diagnosis_complete", { recommended: result.picks.map((p) => p.slug).join(",") });
  };
  /** ひとつ戻る：直前の回答と、そのあとの質問を取り消す */
  const back = () => {
    if (!answers || !answers.length) return;
    setAnswers(answers.slice(0, -1));
    setMsgs((old) => {
      const lastQ = old.map((m) => m.diagStep).lastIndexOf(answers.length);
      return lastQ >= 2 ? old.slice(0, lastQ - 1) : old;
    });
  };
  const restart = () => {
    setMsgs([]);
    setAnswers(null);
    setDiagDone(null);
    setTopic("");
    turnsRef.current = 0;
    consultAtRef.current = -99;
    questionsRef.current = [];
    push({ from: "bot", text: chat.greeting, note: chat.note, menu: true });
  };

  /* ── 自由入力 ── */
  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    if (PERSONAL.test(message)) {
      setWarn("メールアドレスや電話番号などの個人情報は入力しないでください（送信していません）。");
      return;
    }
    setWarn("");
    setInput("");
    setAnswers(null);
    turnsRef.current++;
    // 「あなたはAI？」には、自動応答であることを正直に答える
    if (IDENTITY.test(message)) {
      push({ from: "user", text: message }, { from: "bot", text: "こちらは、COANA TOKYOのWebサイトの内容をもとに自動でご案内しているチャットです（AIを利用しています）。詳しいご相談やご依頼は、担当者がお受けします。", menu: true });
      return;
    }
    questionsRef.current = [...questionsRef.current, message].slice(-3);
    push({ from: "user", text: message });
    setBusy(true);
    // 会話の流れを踏まえて答えられるよう、直前の3往復ほどを一緒に送る（あいさつ・メニュー・診断の画面は除く）
    const history = msgs.filter((m) => m.text && !m.menu && m.diagStep === undefined && !m.diagResult).slice(-6).map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text! }));
    const signal = BUYING.test(message);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timer));
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (data?.mode === "ai" && data.answer) {
        const sources = (data.sources ?? []) as Link[];
        const slug = sources.map((s) => s.u.match(/^\/services\/([^/#]+)/)?.[1]).find(Boolean);
        if (slug) setTopic(slug);
        const engine = "ai:" + (data.engine || "workers-ai");
        if (data.offtopic) push({ from: "bot", text: data.answer, menu: true, engine });
        else if (data.handoff) push({ from: "bot", text: data.answer, links: sources.slice(0, 2), handoff: message, engine });
        else push({ from: "bot", text: data.answer, links: sources, consult: shouldConsult(signal), engine });
        return;
      }
      await answerLocally(message, signal, "fallback:" + (data?.reason || "http_" + res.status));
    } catch {
      await answerLocally(message, signal, "fallback:network");
    } finally {
      setBusy(false);
    }
  };
  /** AI が使えないとき：サイト内の知識をキーワード検索して案内する */
  const answerLocally = async (message: string, signal: boolean, engine: string) => {
    const knowledge = await loadKnowledge();
    const hits = knowledge && !OFF_TOPIC.test(message) ? search(knowledge, message, 3) : [];
    if (!hits.length || hits[0].score < 2) {
      push({ from: "bot", text: chat.offtopic_text + "下のメニューからもお選びいただけます。", menu: true, engine });
      return;
    }
    if (NO_INFO.test(message) || !isConfident(hits, message)) {
      push({ from: "bot", text: chat.handoff_text, handoff: message, engine });
      return;
    }
    const top = hits[0].chunk;
    const body = top.x.replace(/^Q\. [\s\S]*?A\. /, "").replace(/^- /gm, "").replace(/\n/g, " ");
    const text = body.length > 130 ? body.slice(0, 130).replace(/[^。、]*$/, "") + "…" : body;
    const links = dedupeLinks(hits.slice(0, 2).map((h) => ({ t: h.chunk.t.replace(/[：:].*$/, "").replace(/（\d+）$/, "").replace(/^Q\. .*/, "よくあるご質問"), u: h.chunk.u })));
    const slug = top.u.match(/^\/services\/([^/#]+)/)?.[1];
    if (slug) setTopic(slug);
    push({ from: "bot", text, links, consult: shouldConsult(signal), engine });
  };

  /* ── お問い合わせへ ── */
  const toContact = (message: string, slug?: string) => {
    const type = inquiryTypeOf(slug || topic) || "その他";
    setInquiryPreset(type);
    if (message) setInquiryMessage(message);
    window.gtag?.("event", "chat_contact_click", { inquiry_type: type });
    onClose();
    navigate("contact");
  };
  const consultMessage = () => {
    const lines: string[] = [];
    if (diagDone) lines.push("【チャットでのサービス診断】", "おすすめ：" + diagDone.picks.map((p) => serviceName(p.slug)).join("、"), ...diagDone.summary.map((s) => "・" + s));
    if (questionsRef.current.length) lines.push("【チャットでのご質問】", ...questionsRef.current.map((q) => "・" + q));
    return lines.length ? lines.join("\n") + "\n\n" : "";
  };
  const goLink = (u: string) => {
    if (window.matchMedia(SHEET_QUERY).matches) onClose();
    navigate(...navArgs(u));
  };

  // Enter で送信（Shift+Enter は改行）。日本語の変換を確定する Enter では送らない（isComposing・Safari の keyCode 229）。
  // スマホ（タッチ操作）では Enter は改行のままにし、送信ボタンで送る（変換の確定と取り違えないように）
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    void send();
  };

  const ConsultActions = ({ label = "無料で相談する", message, slug }: { label?: string; message: string; slug?: string }) => (
    <div className="chat-cta">
      <button type="button" className="chat-cta-main" onClick={() => toContact(message, slug)}>{label}<span aria-hidden="true">→</span></button>
      {lineUrl && <a className="chat-cta-line" href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => window.gtag?.("event", "line_click", { link_location: "chat" })}>LINEで相談</a>}
      {BOOKING_URL && <a className="chat-cta-book" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">日程を予約する</a>}
    </div>
  );

  const renderMsg = (m: Msg): ReactNode => {
    if (m.diagStep !== undefined) {
      const q = DIAG.questions[m.diagStep];
      const current = answers !== null && answers.length === m.diagStep;
      return (
        <div className="chat-bubble chat-diag">
          <p className="chat-diag-progress">{DIAG.title}　{m.diagStep + 1} / {DIAG.questions.length}</p>
          <p className="chat-diag-q">{q.text}</p>
          {current && (
            <>
              <div className="chat-options" role="group" aria-label={q.text}>
                {q.options.map((o, i) => <button key={o.label} type="button" className="chat-option" onClick={() => answer(m.diagStep!, i)}>{o.label}</button>)}
              </div>
              <div className="chat-diag-nav">
                {m.diagStep > 0 && <button type="button" onClick={back}>← ひとつ戻る</button>}
                <button type="button" onClick={restart}>最初からやり直す</button>
              </div>
            </>
          )}
        </div>
      );
    }
    if (m.diagResult) {
      const r = m.diagResult;
      return (
        <div className="chat-result">
          <div className="chat-result-head">
            <span className="chat-result-mark"><img src={CHAT_MARK} alt="" width={30} height={30} /></span>
            <div><p className="chat-result-en">Your result</p><p className="chat-result-title">診断結果：こちらが合いそうです</p></div>
          </div>
          <ol className="chat-picks">
            {r.picks.map((p) => (
              <li key={p.slug}>
                <a className="chat-pick-name" href={"/services/" + p.slug} onClick={(e) => { e.preventDefault(); goLink("/services/" + p.slug); }}>{serviceName(p.slug)}</a>
                <p>{p.reason}</p>
              </li>
            ))}
          </ol>
          {r.combo && <p className="chat-combo">{r.combo}</p>}
          {r.notes.map((n) => <p key={n} className="chat-small">{n}</p>)}
          <p className="chat-consult-text">{chat.consult_text}</p>
          <ConsultActions label="この内容で無料相談する" message={consultMessage()} slug={r.picks[0].slug} />
          <div className="chat-diag-nav"><button type="button" onClick={() => startDiagnosis()}>もう一度診断する</button><button type="button" onClick={restart}>最初からやり直す</button></div>
        </div>
      );
    }
    return (
      <div className={m.from === "user" ? "chat-bubble chat-user" : "chat-bubble"}>
        {m.text && <p className="chat-text">{m.text}</p>}
        {m.links && m.links.length > 0 && (
          <ul className="chat-links">
            {m.links.map((l) => <li key={l.u}><a href={l.u} onClick={(e) => { e.preventDefault(); goLink(l.u); }}>{l.t}<span aria-hidden="true"> →</span></a></li>)}
          </ul>
        )}
        {m.note && <p className="chat-small">{m.note}</p>}
        {m.handoff && <ConsultActions label="この質問を担当者に送る" message={"【チャットでのご質問】\n" + m.handoff + "\n\n"} />}
        {m.consult && (
          <div className="chat-consult">
            <p className="chat-consult-text">{chat.consult_text}</p>
            <ConsultActions message={consultMessage()} />
          </div>
        )}
        {m.menu && (
          <div className="chat-menu" role="group" aria-label="ご案内メニュー">
            <button type="button" className="chat-menu-diag" onClick={() => { turnsRef.current++; push({ from: "user", text: "あなたに合うサービスを診断" }); startDiagnosis(); }}>
              <b>あなたに合うサービスを診断</b><small>約1分・5問</small>
            </button>
            {chat.menu.map((item) => <button key={item.label} type="button" className="chat-chip" onClick={() => pickMenu(item)}>{item.label}</button>)}
            <button type="button" className="chat-chip" onClick={() => inputRef.current?.focus()}>その他（自由に質問）</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" ref={panelRef} tabIndex={-1}>
      <div className="chat-head">
        <span className="chat-head-mark"><img src={CHAT_MARK} alt="" width={26} height={26} /></span>
        <div className="chat-head-text">
          <p id="chat-title" className="chat-title">{chat.name}</p>
          <p className="chat-sub">{chat.subtitle}</p>
        </div>
        <button type="button" className="chat-restart" onClick={restart} aria-label="最初からやり直す" title="最初からやり直す">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>
        </button>
        <button type="button" className="chat-close" onClick={onClose} aria-label="チャットを閉じる">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
        {msgs.map((m) => (
          <div key={m.id} className={m.from === "user" ? "chat-row chat-row-user" : "chat-row"} data-engine={m.engine}>
            {m.from === "bot" && <span className="chat-avatar"><img src={CHAT_MARK} alt="" width={18} height={18} /></span>}
            {m.from === "bot" && <span className="visually-hidden">{chat.name}：</span>}
            {m.from === "user" && <span className="visually-hidden">あなた：</span>}
            {renderMsg(m)}
          </div>
        ))}
        {busy && (
          <div className="chat-row">
            <span className="chat-avatar"><img src={CHAT_MARK} alt="" width={18} height={18} /></span>
            <div className="chat-bubble chat-typing" aria-label="回答を準備しています"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={send}>
        {warn && <p className="chat-warn" role="alert">{warn}</p>}
        <label className="visually-hidden" htmlFor="chat-input">ご質問（{MAX_CHARS}文字まで）</label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={MAX_CHARS}
          placeholder="ご質問をどうぞ（個人情報は入力しないでください）"
          enterKeyHint="enter"
          onChange={(e) => { setInput(e.target.value); if (warn) setWarn(""); }}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="chat-send" disabled={!input.trim() || busy} aria-label="送信">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
        </button>
        <p className="chat-foot">会話は保存しません・<a href="/privacy" onClick={(e) => { e.preventDefault(); goLink("/privacy"); }}>プライバシーポリシー</a>{input.length > MAX_CHARS * 0.8 && <span className="chat-count">{input.length}/{MAX_CHARS}</span>}</p>
      </form>
    </div>
  );
}

function dedupeLinks(links: Link[]) {
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.u) ? false : (seen.add(l.u), true)));
}
