import React, { ReactNode, useEffect, useRef, useState } from "react";
import { home, settings, type Article } from "./content";
import { ARROW_PATHS } from "./bird";
import { useFlowJourney } from "./flowJourney";
import { Feathers } from "./feathers";

/* ───────────────────────── 共通パーツ（App.tsx と SolutionPage.tsx から利用） ───────────────────────── */

export type Nav = (page: Page, hash?: string, slug?: string) => void;

export type Page =
  | "home"
  | "about"
  | "services"
  | "topics"
  | "article"
  | "solution"
  | "contact"
  | "privacy"
  | "notfound";

// サービス別ページの「無料で相談する」→ お問い合わせフォームへ、相談種別を引き継ぐ
const INQUIRY_PRESET_KEY = "coana_inquiry_type";
export function setInquiryPreset(type: string) {
  try { sessionStorage.setItem(INQUIRY_PRESET_KEY, type); } catch { /* storage unavailable */ }
}
export function takeInquiryPreset() {
  try {
    const value = sessionStorage.getItem(INQUIRY_PRESET_KEY) || "";
    sessionStorage.removeItem(INQUIRY_PRESET_KEY);
    return value;
  } catch { return ""; }
}

// サポートチャットの「無料で相談する」→ お問い合わせフォームの本文に、診断・質問の要点を引き継ぐ（お客さまが確認・編集してから送信）
const INQUIRY_MESSAGE_KEY = "coana_inquiry_message";
export function setInquiryMessage(message: string) {
  try { sessionStorage.setItem(INQUIRY_MESSAGE_KEY, message); } catch { /* storage unavailable */ }
}
export function takeInquiryMessage() {
  try {
    const value = sessionStorage.getItem(INQUIRY_MESSAGE_KEY) || "";
    sessionStorage.removeItem(INQUIRY_MESSAGE_KEY);
    return value;
  } catch { return ""; }
}

/** 「どれが合うか分からない方は診断できます」の控えめな導線。押すとサポートチャットが診断から開く */
export function DiagnoseLink({ className = "" }: { className?: string }) {
  return (
    <p className={className ? "diagnose-link " + className : "diagnose-link"}>
      <button type="button" onClick={() => openChat("diagnosis")}>
        どれが合うか分からない方は、約1分の診断で合うサービスをご案内します<Icon name="arrow" size={16} />
      </button>
    </p>
  );
}

/** 「迷ったら」の帯（1ページに1か所。サービスを一通り紹介した直後に置く）。
 *  約1分の診断だけを案内する（相談はヘッダーやページ下部のお問い合わせ帯にあり、診断結果からもつながるため、ここには置かない） */
export function DiagnoseBanner({ className = "" }: { className?: string }) {
  return (
    <div className={className ? "diagnose-banner " + className : "diagnose-banner"}>
      <img src="/images/chat/coana-mark.webp" alt="" width={40} height={40} loading="lazy" />
      <p><b>どれが合うか迷ったら</b><span>5つの質問に答えるだけで、合いそうなサービスをご案内します。</span></p>
      <button type="button" onClick={() => openChat("diagnosis")}>約1分で診断する<Icon name="arrow" size={16} /></button>
    </div>
  );
}

/** サポートチャットを開く（mode: "diagnosis" で診断から始める）。ChatLauncher が受け取る */
export function openChat(mode: "menu" | "diagnosis" = "menu", answer?: number) {
  // answer：診断の1問目の答え（トップの「迷ったら」で選んだもの）。チャットはその続きから始まる
  window.dispatchEvent(new CustomEvent("coana:chat", { detail: { mode, answer } }));
}

/** 番号つきのセクション見出し（01〜05。トップ・各ページ共通） */
export function NumHead({ n, title, side, id }: { n: string; title: ReactNode; side?: ReactNode; id?: string }) {
  return (
    <div className="num-head" data-reveal id={id}>
      <span className="num-head-no" aria-hidden="true">{n}</span>
      <h2>{title}</h2>
      {side && <div className="num-head-side">{side}</div>}
    </div>
  );
}

export const paths: Record<Exclude<Page, "article" | "solution" | "notfound">, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  topics: "/topics",
  contact: "/contact",
  privacy: "/privacy",
};

export type NavArgs = [Page, string?, string?];

// サイト内リンク。検索エンジンが辿れるよう実際の <a href> を出力しつつ、
// 通常のクリックはページ遷移せずに画面を切り替える（新しいタブで開く操作はそのまま有効）。
export function hrefFor(target: Page, hash?: string, slug?: string) {
  const base = target === "article" ? `/topics/${slug ?? ""}` : target === "solution" ? `/services/${slug ?? ""}` : target === "notfound" ? "/" : paths[target];
  return `${base}${hash ? `#${hash}` : ""}`;
}

export function GoLink({
  go,
  args,
  className,
  children,
  ...rest
}: {
  go: (...a: NavArgs) => void;
  args: NavArgs;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick" | "className" | "children">) {
  return (
    <a
      {...rest}
      href={hrefFor(...args)}
      className={className ? `go-link ${className}` : "go-link"}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(...args);
      }}
    >
      {children}
    </a>
  );
}

export function Lines({ text }: { text: string }) {
  const parts = (text || "").split("\n");
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <br />}</span>)}</>;
}

export type IconName =
  | "arrow" | "menu" | "close" | "chat" | "spark" | "check"
  | "mail" | "up" | "quote" | "shield" | "compass" | "handshake" | "pin";

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
    case "chat":
      return (
        <svg {...common}>
          <path d="M20 14a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 2c.6 5.1 2.9 7.4 8 8-5.1.6-7.4 2.9-8 8-.6-5.1-2.9-7.4-8-8 5.1-.6 7.4-2.9 8-8Z" />
          <path d="M19 17c.2 1.9 1.1 2.8 3 3-1.9.2-2.8 1.1-3 3-.2-1.9-1.1-2.8-3-3 1.9-.2 2.8-1.1 3-3Z" />
        </svg>
      );
    case "mail":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;
    case "up":
      return <svg {...common}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
    case "quote":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M10.2 6.2c-3 1.6-4.7 3.9-4.7 7.2 0 2.6 1.5 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.5-3.2 3.2-4.3l-1.7-1Zm8 0c-3 1.6-4.7 3.9-4.7 7.2 0 2.6 1.5 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.5-3.2 3.2-4.3l-1.7-1Z" />
        </svg>
      );
    case "shield":
      return <svg {...common}><path d="M12 3 5 6v5c0 4.4 2.8 8 7 10 4.2-2 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4.5" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
    case "handshake":
      return (
        <svg {...common}>
          <path d="M3 7.5 7.2 6l4.8 1.8L16.8 6 21 7.5V15l-4.5 4-4.5-3.4L7.5 19 3 15V7.5Z" />
          <path d="m12 7.8-3.3 3.3a1.6 1.6 0 0 0 2.2 2.2l1.4-1.3 3.5 3" />
        </svg>
      );
    case "pin":
      return <svg {...common}><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>;
    default:
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
}

export function SectionTitle({
  en,
  children,
  center = false,
  lead,
}: {
  en: string;
  children: ReactNode;
  center?: boolean;
  lead?: string;
}) {
  return (
    <div className={center ? "section-title center" : "section-title"} data-reveal>
      <span className="eyebrow">{en}</span>
      <h2>{children}</h2>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
  );
}

/** お問い合わせ系の主ボタン（.button-fly）の矢印。ホバー（キーボードのフォーカス）で、矢印の線がつながったまま形を変え、
 *  前へ飛ぶ鳥（鳩）になる（「相談を届ける」）。形は bird.ts、動きは buttonFx.ts。翼の先だけロゴの黄色（.bird-tip）。 */
/* ───────────────────────── ご利用までの流れ（サービス一覧・各サービスLP 共通） ─────────────────────────
 * ステップを細い1本の線でつなぐ。スクロールとは連動させず、最初から完成した状態で全部読める（静止画として美しいことを優先）。
 * PC でカーソルを当てたステップだけ、わずかに浮き、丸が黄色になってアイコンが線で描き直され、前後をつなぐ線がそっと濃くなる（index.css）。
 * 線の先は「まずは無料相談から」のボタンへつながる。PC は横並び、スマホは縦並び（左に縦線）。
 */
export type FlowStep = { name: string; text?: string; icon?: ReactNode };

/** 済んだ工程の小さなチェック（鳩のアニメーションで、親に .is-done が付いたら出る。点灯中＝今いる工程には出さない） */
export function StepCheck() {
  return (
    <span className="step-check" aria-hidden="true">
      <svg viewBox="0 0 12 12" width="10" height="10"><path d="M2.6 6.2l2.1 2.1 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export function FlowLine({ steps, stepLabel, note, lead, children }: {
  steps: FlowStep[];
  /** 「STEP」などの小さな見出し（なければ番号だけ） */
  stepLabel?: string;
  /** 目安の期間など（サイトにある情報だけ） */
  note?: ReactNode;
  /** 線の先の一言（「まずは無料相談から」）。すぐ下にお問い合わせの帯がある LP では付けない */
  lead?: string;
  /** 線の先のボタン */
  children?: ReactNode;
}) {
  const icons = steps.some((s) => s.icon);
  const num = (i: number) => String(i + 1).padStart(2, "0");
  // お客さまの「相談」がステップを進んでいくアニメーション（flowJourney.tsx）。「動きを減らす」設定では出さない
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [journey] = useState(() => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const { layer, state } = useFlowJourney(boxRef, steps.map((s) => s.name), journey);
  return (
    <div className={icons ? "flowx has-icons" : "flowx"} ref={boxRef} style={{ ["--n" as string]: steps.length }}>
      {layer}
      <ol className="flowx-list">
        {steps.map((s, i) => (
          <li key={s.name} className={`flowx-step${journey ? state("n" + i) : ""}`}>
            <span className="flowx-node" aria-hidden="true" data-story={"n" + i} data-perch="above-c" data-perch-v="parent-tr">
              {s.icon ? <span className="flowx-icon" data-redraw>{s.icon}</span> : <span className="flowx-num">{num(i)}</span>}
              {journey && <StepCheck />}
            </span>
            <div className="flowx-body">
              {stepLabel && <small><span>{stepLabel}</span>{num(i)}</small>}
              <h3><span className="visually-hidden">{stepLabel ? "" : num(i) + ". "}</span>{s.name}</h3>
              {s.text && <p>{s.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      {(note || lead) && (
        <div className={lead ? "flowx-end" : "flowx-end is-note-only"}>
          <div className="flowx-rail">
            <span className="flowx-drop" aria-hidden="true" />
            {note && <p className="flowx-note">{note}</p>}
            {lead && <p className="flowx-lead">{lead}</p>}
          </div>
          {children && <div className="flowx-cta">{children}</div>}
        </div>
      )}
    </div>
  );
}

export function BirdArrow({ size = 19 }: { size?: number }) {
  return (
    <svg className="bird-arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="bird-body" d={ARROW_PATHS.body} />
      <path className="bird-wing" d={ARROW_PATHS.wing} />
      <path className="bird-tip" d={ARROW_PATHS.wing} pathLength={1} />
    </svg>
  );
}

export function LinkButton({
  children,
  onClick,
  go,
  args,
  secondary = false,
  large = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  go?: Nav;
  args?: NavArgs;
  secondary?: boolean;
  large?: boolean;
}) {
  // ボタンの矢印は鳩にしない（2026-10-23 オーナー指示。デザイン案どおり、ホバーで矢印が少し右へ動くだけ）
  const fly = false;
  const cls = ["button", secondary ? "button-outline" : "", large ? "button-large" : "", fly ? "button-fly" : ""].filter(Boolean).join(" ");
  if (go && args) {
    return (
      <GoLink className={cls} go={go} args={args}>
        {children}{fly ? <BirdArrow /> : <Icon name="arrow" size={19} />}
      </GoLink>
    );
  }
  return (
    <button className={cls} onClick={onClick}>
      {children}<Icon name="arrow" size={19} />
    </button>
  );
}

export const lineUrl = (settings as { line_url?: string }).line_url || "";

/** LINE公式アカウントへの相談ボタン（URLはCMSの「会社情報・共通設定」で変更） */
export function LineButton({ place, label = "LINEで気軽に相談する", tabIndex }: { place: string; label?: string; tabIndex?: number }) {
  if (!lineUrl) return null;
  return (
    <a
      className="line-button"
      href={lineUrl}
      tabIndex={tabIndex}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => window.gtag?.("event", "line_click", { link_location: place })}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 3.9 3.5 7.15 8.24 7.85.32.07.76.21.87.49.1.25.06.64.03.9l-.14.84c-.04.25-.2.98.86.53 1.06-.45 5.7-3.36 7.78-5.75C21.06 14.3 22 12.75 22 11c0-4.42-4.48-8-10-8z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}

/** お問い合わせの帯。LP では見出し・本文・ボタンの文言を差し替えて使う（未指定ならサイト共通の文言） */
export function ContactBand({ navigate, big = false, title, text, bigText = "相談する。", primary = "お問い合わせ", line = "LINEで気軽に相談", place = "contact_band", chat = true, lang }: { navigate: Nav; big?: boolean; title?: string; text?: string; bigText?: string; primary?: string; line?: string; place?: string; chat?: boolean; lang?: string }) {
  // 大きな「相談する。」は、帯が画面を通り過ぎる間にゆっくり右から左へ流れる（デザイン案どおり。2026-10-23 オーナー決定の、スクロール連動の例外）。
  // 帯が画面に入っている間だけ計算し、動かすのは transform だけ。「動きを減らす」設定では動かさない
  const bigRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    const el = bigRef.current;
    const band = el?.closest("section");
    if (!el || !band || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let on = false;
    const update = () => {
      raf = 0;
      const r = band.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      // 右から流れてきて、帯が画面の中ほどまで来たら左端（読みやすい位置）で止まる。それ以上は左へ流さない（2026-10-24 オーナー指示）
      el.style.transform = `translate3d(${(10 * (1 - Math.min(1, p / 0.5))).toFixed(2)}%, 0, 0)`;
    };
    const onScroll = () => { if (on && !raf) raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) update(); }, { rootMargin: "200px 0px" });
    io.observe(band);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [big]);
  return (
    <section className={big ? "contact-band is-big" : "contact-band"} data-live>
      <Feathers count={14} />
      <div className="container contact-band-inner" data-reveal>
        {big && <p className="contact-band-big" aria-hidden="true" ref={bigRef} lang={lang}>{bigText}</p>}
        <div className="contact-band-grid">
          <div>
            <span className="eyebrow" lang="en">Contact</span>
            <h2>{title || settings.contact_band.heading}</h2>
            <p><Lines text={text || settings.contact_band.text} /></p>
          </div>
          <div className="contact-band-action">
            <LinkButton go={navigate} args={["contact"]}>{primary}</LinkButton>
            <LineButton place={place} label={line} />
            {chat && <button type="button" className="button button-outline on-sky" onClick={() => openChat("menu")}>チャットで相談・診断</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
/** ページ上部の見出し。imagePosition で写真の見える位置だけを変えられる（見た目はどのページも共通） */
export function PageHero({ en, title, intro, image, imagePosition }: { en: string; title: string; intro?: string; image?: string; imagePosition?: string }) {
  return (
    <section
      className={image ? "page-hero has-image" : "page-hero"}
      style={image ? { backgroundImage: `url("${image}")`, ...(imagePosition ? { backgroundPosition: imagePosition } : {}) } : undefined}
    >
      <div className="container">
        <nav className="sky-crumbs" aria-label="パンくずリスト"><a href="/">ホーム</a><span aria-hidden="true">/</span><span>{title}</span></nav>
        <p className="page-hero-en" lang="en">{en}</p>
        <h1>{title}</h1>
        {intro && <div className="page-intro">{intro}</div>}
      </div>
      <span className="page-hero-big" aria-hidden="true" lang="en">{en.toUpperCase()}</span>
    </section>
  );
}

export const faqItems: { q: string; a: string }[] = home.faqs ?? [];

export function FaqSection({ items = faqItems, title = home.faq_title, numbered }: { items?: { q: string; a: string }[]; title?: string; numbered?: string } = {}) {
  const [openIndex, setOpenIndex] = useState(numbered ? -1 : 0); // トップ（番号つき）はすべて閉じた状態、ほかは最初の質問だけ開く。どれも閉じられる（-1）
  return (
    <section className={numbered ? "section faq-section is-numbered" : "section faq-section"}>
      <div className={numbered ? "container" : "container narrow"}>
        {numbered
          ? <NumHead n={numbered} title={title} side={<p>ご相談の前によくいただく質問をまとめました。</p>} />
          : <SectionTitle en="FAQ" center>{title}</SectionTitle>}
        <div className={numbered ? "faq-columns" : undefined}>
        {numbered && (
          <div className="faq-ask">
            <p className="faq-ask-title">ここにない質問は、<br />チャットで聞けます。</p>
            <p className="faq-ask-text">サイトの内容をもとに、チャットでお答えします。相談やお見積もりの前の、小さな疑問もどうぞ。</p>
            <button type="button" className="button button-large faq-ask-button" onClick={() => openChat("menu")}><Icon name="chat" size={19} />チャットで質問する</button>
          </div>
        )}
        <div className="faq-list">
          {items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q}>
                <div className={open ? "faq-item open" : "faq-item"}>
                  <button
                    className="faq-q"
                    aria-expanded={open}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                  >
                    <span className="faq-mark">Q</span>
                    <span className="faq-q-text">{item.q}</span>
                    <span className="faq-toggle" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path className="v" d="M12 5v14" /><path d="M5 12h14" /></svg></span>
                  </button>
                  <div id={`faq-a-${i}`} className="faq-a" role="region">
                    <div className="faq-a-inner"><p>{item.a}</p></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

export function ArticleRow({ article, navigate }: { article: Article; navigate: Nav }) {
  return (
    <GoLink className={article.thumbnail ? "article-row has-thumb" : "article-row"} go={navigate} args={["article", undefined, article.slug]}>
      {article.thumbnail && <span className="article-row-thumb"><img src={article.thumbnail} alt={article.title} loading="lazy" /></span>}
      <span className="article-row-main">
        <span className="article-meta"><time dateTime={article.sortKey.slice(0, 10)}>{article.date}</time><i>{article.category}</i></span>
        <strong>{article.title}</strong>
      </span>
      <Icon name="arrow" />
    </GoLink>
  );
}

export function NotFound({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="404 Not found" title="ページが見つかりません" intro="お探しのページは、移動または削除された可能性があります。" />
      <section className="section">
        <div className="container button-row" style={{ justifyContent: "center" }}>
          <LinkButton go={navigate} args={["home"]}>トップページへ</LinkButton>
          <LinkButton secondary go={navigate} args={["contact"]}>お問い合わせ</LinkButton>
        </div>
      </section>
    </main>
  );
}
