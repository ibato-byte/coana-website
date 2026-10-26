import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { articles, home, inquiryTypeOf, solutions, type Article, type Solution } from "./content";
import { ArticleRow, ContactBand, DiagnoseLink, FaqSection, FlowLine, GoLink, Icon, LineButton, Lines, NotFound, SectionTitle, StepCheck, openChat, setInquiryPreset, type Nav } from "./shared";
import { CHAT_MARK } from "./chat/ChatLauncher";
import { HeroVideo, ServiceArt } from "./illustrations";
import { STORIES, useSchemeStory, type Story } from "./schemeStory";
import { Feathers } from "./feathers";
import "./solution.css";

/* ───────────────────────── サービス別ランディングページ ─────────────────────────
 * content/solutions/*.json（CMS「サービス別ページ」）の内容を、1画面1メッセージの8セクションで描画する。
 * ヒーロー → お悩み → 仕組み → 支援内容とプラン → 事例 → 流れ → FAQ → お問い合わせ。
 * 文章よりアイコン・図解を優先し、空欄のセクションは表示しない。
 */

type LpIconName =
  | "chart" | "cloud" | "link" | "rules" | "doc" | "invoice" | "calendar" | "search" | "tools" | "users"
  | "megaphone" | "camera" | "globe" | "rocket" | "shield" | "clock" | "yen" | "handshake" | "mic" | "layout"
  | "building" | "person" | "store" | "check" | "sparkle" | "arrow-down" | "target" | "bank" | "refresh" | "mail";

function LpIcon({ name, size = 26 }: { name?: string; size?: number }) {
  const c = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch ((name || "check") as LpIconName) {
    case "chart": return <svg {...c}><path d="M4 20h16" /><path d="M6 16v-5M11 16V7M16 16v-3M21 16V4" /></svg>;
    case "cloud": return <svg {...c}><path d="M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9a3.5 3.5 0 0 1 0 7H7Z" /><path d="m9.5 14 2-2 2 2M11.5 12v5" /></svg>;
    case "link": return <svg {...c}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>;
    case "rules": return <svg {...c}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
    case "doc": return <svg {...c}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></svg>;
    case "invoice": return <svg {...c}><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
    case "calendar": return <svg {...c}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></svg>;
    case "search": return <svg {...c}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></svg>;
    case "tools": return <svg {...c}><path d="m14.5 6.5 3 3L7 20H4v-3L14.5 6.5Z" /><path d="m12 9 3 3M17 3l4 4-2 2-4-4z" /></svg>;
    case "users": return <svg {...c}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c3 0 5 1.7 5.5 5" /></svg>;
    case "megaphone": return <svg {...c}><path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Z" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" /></svg>;
    case "camera": return <svg {...c}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case "globe": return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>;
    case "rocket": return <svg {...c}><path d="M12 3c3 2 5 6 5 10l-5 4-5-4c0-4 2-8 5-10Z" /><path d="M7 13l-3 3 3 .5M17 13l3 3-3 .5M12 17v4" /><circle cx="12" cy="10" r="1.5" /></svg>;
    case "shield": return <svg {...c}><path d="M12 3 5 6v5c0 4.4 2.8 8 7 10 4.2-2 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4.5" /></svg>;
    case "clock": return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "yen": return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="m8.5 7 3.5 5 3.5-5M12 12v5M9 13h6M9 15.5h6" /></svg>;
    case "handshake": return <svg {...c}><path d="M3 7.5 7.2 6l4.8 1.8L16.8 6 21 7.5V15l-4.5 4-4.5-3.4L7.5 19 3 15V7.5Z" /><path d="m12 7.8-3.3 3.3a1.6 1.6 0 0 0 2.2 2.2l1.4-1.3 3.5 3" /></svg>;
    case "mic": return <svg {...c}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>;
    case "layout": return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18M9 9v11" /></svg>;
    case "building": return <svg {...c}><path d="M4 21V5l8-2v18M12 9l8 2v10" /><path d="M7 8h2M7 12h2M7 16h2M15 14h2M15 18h2" /></svg>;
    case "person": return <svg {...c}><circle cx="12" cy="8" r="4" /><path d="M4 21c.6-4.5 3.6-7 8-7s7.4 2.5 8 7" /></svg>;
    case "store": return <svg {...c}><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 11v10h14V11M10 21v-6h4v6" /></svg>;
    case "sparkle": return <svg {...c}><path d="M12 3c.6 5.1 2.9 7.4 8 8-5.1.6-7.4 2.9-8 8-.6-5.1-2.9-7.4-8-8 5.1-.6 7.4-2.9 8-8Z" /></svg>;
    case "arrow-down": return <svg {...c}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
    case "target": return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case "bank": return <svg {...c}><path d="M3 9 12 4l9 5H3Z" /><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M3 21h18" /></svg>;
    case "refresh": return <svg {...c}><path d="M20 12a8 8 0 0 1-14 5.3L4 15" /><path d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path d="M4 20v-5h5M20 4v5h-5" /></svg>;
    case "mail": return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;
    default: return <svg {...c}><path d="m5 12 4 4L19 6" /></svg>;
  }
}

/** 対応ツール名から、トップページ「対応ツール」に登録されたロゴを探す */
function toolLogo(name: string) {
  const list = (home.tools || []) as { name: string; logo: string }[];
  const key = name.toLowerCase();
  const hit = list.find((t) => key.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(key));
  return hit?.logo;
}

/* ───────────────────────── 文言（日本語／英語ページ共通ラベル） ───────────────────────── */
const LABELS = {
  ja: {
    consult: "無料で相談する",
    consultLine: "LINEで気軽に相談",
    heroNote: "ご相談・お見積もりは無料。全国オンライン対応。",
    problems: "こんなお悩みはありませんか",
    bridge: ["そのお悩み、", "COANA TOKYO", "にご相談ください。"],
    scheme: "支援の仕組み",
    support: "支援内容とプラン",
    scope: "ご依頼いただける業務の一覧",
    scopeOpen: "業務の一覧を見る",
    scopeClose: "閉じる",
    count: (n: number) => `（${n}件）`,
    more: "詳しく見る",
    less: "閉じる",
    tools: "対応ツールの例",
    plans: "ご利用プランの例",
    plansNote: "料金は業務範囲に応じて個別にお見積もりします。一部の業務だけのご相談も歓迎です。",
    pricing: "プランと料金の目安",
    priceNote: "金額はすべて税別の目安です。正式な金額は、業務の量と範囲を伺ってお見積もりします（ご相談・お見積もりは無料）。",
    bestFor: "こんな方に",
    scenarios: "ご利用イメージ",
    baBefore: "Before",
    baAfter: "After",
    baAria: "変わった後の状態を表示する",
    bigCta: "相談する。",
    baMeterBefore: (n: number) => `${n}つの困りごとを抱えた状態`,
    baMeterAfter: (n: number) => `${n}つの困りごとが、すべて改善`,
    baTitle: "導入すると、\nこう変わる。",
    before: "Before",
    after: "After",
    flow: "ご利用までの流れ",
    faq: "よくあるご質問",
    column: "関連するコラム",
    ctaTitle: "まずは、現状をお聞かせください。",
    ctaText: "ご相談・お見積もりは無料です。何から相談すればいいか分からない段階でも大丈夫です。",
    ctaButton: "無料相談・お問い合わせ",
    others: "そのほかのサービス",
    allServices: "サービス一覧を見る",
    sticky: "無料で相談する",
    relayTodo: "やること",
    relayGoal: "受け取るもの",
    scroll: "本文へスクロール",
    facts: "サービスの特徴",
  },
  en: {
    consult: "Book a free consultation",
    consultLine: "Chat on LINE",
    heroNote: "Consultation and quotes are free. Available online nationwide, in English.",
    problems: "Sound familiar?",
    bridge: ["We help you solve these, ", "step by step", ", with a bilingual partner on your side."],
    scheme: "How it works",
    support: "What we do & plans",
    scope: "Examples of what you can ask us",
    scopeOpen: "See the full list",
    scopeClose: "Close",
    count: (n: number) => ` (${n})`,
    more: "Details",
    less: "Close",
    tools: "Tools we work with",
    plans: "Example plans",
    plansNote: "Pricing is quoted individually based on scope. Small or partial engagements are welcome.",
    pricing: "Plans & pricing",
    priceNote: "All prices are estimates, excluding tax. We send a formal quote after a free consultation.",
    bestFor: "Best for",
    scenarios: "Example situations",
    baBefore: "Before",
    baAfter: "After",
    baAria: "Show the after state",
    bigCta: "Let’s talk.",
    baMeterBefore: (n: number) => `${n} pain points`,
    baMeterAfter: (n: number) => `All ${n} areas improved`,
    baTitle: "Here is\nthe difference.",
    before: "Before",
    after: "After",
    flow: "How to get started",
    faq: "FAQ",
    column: "Related articles",
    ctaTitle: "Tell us where you are. We will take it from there.",
    ctaText: "Consultation and quotes are free. If you are not sure where to start, that is exactly where we begin.",
    ctaButton: "Contact us (free consultation)",
    others: "Other services (Japanese pages)",
    allServices: "See all services",
    sticky: "Free consultation",
    relayTodo: "Your part",
    relayGoal: "What you get",
    scroll: "Scroll to content",
    facts: "Key points",
  },
};
type Lang = keyof typeof LABELS;
const langOf = (sol: Solution): Lang => (sol.lang === "en" ? "en" : "ja");
/** お問い合わせへ遷移する前に相談種別を記録する navigate */
const withInquiry = (sol: Solution, navigate: Nav): Nav => (...args) => {
  if (args[0] === "contact") setInquiryPreset(inquiryTypeOf(sol));
  navigate(...args);
};
/** SVG 図解のラベルが枠からはみ出さないよう、長い文字列は幅を指定して詰める */
function fitText(text: string, fontSize: number, max: number) {
  let width = 0;
  for (const ch of text) width += (ch.charCodeAt(0) > 0xff ? 1 : 0.56) * fontSize;
  return width > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" as const } : {};
}

/* ───────────────────────── 1. Hero ───────────────────────── */

/** キャッチコピーの行。「**」で囲んだ部分に下線を引く（囲みがなければ最後の行全体）。
 *  下線のフレーズは途中で改行させず、入りきらない幅ではフレーズごと次の行へ送る（前後に改行位置 <wbr> を置く）。 */
function CatchLines({ text }: { text: string }) {
  const lines = text.split("\n");
  const marked = text.includes("**");
  return (
    <>
      {lines.map((line, i) => {
        const parts = marked ? line.split(/\*\*(.+?)\*\*/) : i === lines.length - 1 ? ["", line] : [line];
        return (
          <span key={i} className="lp-hero-line">
            {parts.map((part, j) => (j % 2
              ? <Fragment key={j}><wbr /><span className="title-underline">{part}</span><wbr /></Fragment>
              : part))}
          </span>
        );
      })}
    </>
  );
}

function Hero({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  const facts = sol.hero_facts ?? [];
  const signal = sol.design === "signal";
  return (
    <section className={signal ? "lp-hero lp-sig-hero" : "lp-hero"}>
      {signal && <Feathers count={12} />}
      <div className="container lp-hero-inner">
        <div className="lp-hero-head">
          <nav className="sky-crumbs" aria-label="パンくずリスト"><GoLink go={navigate} args={["home"]}>{langOf(sol) === "en" ? "Home" : "ホーム"}</GoLink><span aria-hidden="true">/</span><GoLink go={navigate} args={["services"]}>{langOf(sol) === "en" ? "Services" : "サービス"}</GoLink><span aria-hidden="true">/</span><span>{sol.nav_label}</span></nav>
          <p className="lp-hero-kicker">
            <span className="lp-hero-en">{sol.en || "Service"}</span>
            <span className="lp-hero-label">{sol.nav_label}</span>
          </p>
          <h1 className={sol.catch ? "lp-hero-title" : "lp-hero-title is-plain"}>
            {sol.catch ? <CatchLines text={sol.catch} /> : sol.title}
          </h1>
          {sol.catch && <p className="lp-hero-sub">{sol.title}</p>}
        </div>
        <div className="lp-hero-art"><HeroVideo src={sol.hero_video} fallback={<ServiceArt slug={sol.slug} />} /></div>
        <div className="lp-hero-body">
          <p className="lp-hero-lead"><Lines text={sol.lead} /></p>
          {facts.length > 0 && (
            <ul className="lp-hero-facts" aria-label={L.facts}>
              {facts.map((f) => (
                <li key={f.value}><span className="lp-hero-fact-icon"><Icon name="check" size={15} /></span><strong>{f.value}</strong><small>{f.label}</small></li>
              ))}
            </ul>
          )}
          <div className="lp-hero-actions">
            <GoLink className="button button-large lp-button-primary" go={navigate} args={["contact"]}>
              {L.consult}<Icon name="arrow" size={19} />
            </GoLink>
            <LineButton place="solution_hero" label={L.consultLine} />
          </div>
          <p className="lp-hero-note">{sol.hero_note || L.heroNote}</p>
          {sol.english?.slug && (
            <GoLink className="lp-hero-english" go={navigate} args={["solution", undefined, sol.english.slug]}>
              <LpIcon name="globe" size={17} />{sol.english.button || "English page"}<Icon name="arrow" size={15} />
            </GoLink>
          )}
        </div>
      </div>
      <a className="lp-hero-scroll" href={signal ? "#lp-ba" : "#lp-problems"} aria-label={L.scroll}><LpIcon name="arrow-down" size={18} /></a>
      <span className="page-hero-big lp-hero-big" aria-hidden="true" lang="en">{(sol.en || "Service").toUpperCase()}</span>
    </section>
  );
}

/* ───────────────────────── 2. お悩み ───────────────────────── */

const PROBLEM_FACES = ["clock", "users", "search", "chart"] as const;

function Problems({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  if (!sol.problems.length) return null;
  return (
    <section id="lp-problems" className="section lp-problems">
      <div className="container">
        <SectionTitle en="Problems" center>{sol.problems_title || L.problems}</SectionTitle>
        <ul className="lp-problem-grid">
          {sol.problems.map((p, i) => (
            <li key={p} data-reveal style={{ ["--d" as string]: `${(i * 0.06).toFixed(2)}s` }}>
              <span className="lp-problem-icon" data-draw><LpIcon name={PROBLEM_FACES[i % PROBLEM_FACES.length]} size={22} /></span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <div className="lp-problems-bridge" data-reveal>
          {/* カードから下の一文へ線が集まる（既存の余白の中に描く。スマホは1本） */}
          <svg className="lp-funnel" viewBox="0 0 920 40" preserveAspectRatio="none" aria-hidden="true" data-draw>
            <path className="lp-funnel-side" d="M230 0C230 26 400 34 460 40" vectorEffect="non-scaling-stroke" />
            <path className="lp-funnel-side" d="M690 0C690 26 520 34 460 40" vectorEffect="non-scaling-stroke" />
            <path className="lp-funnel-mid" d="M460 0V40" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="lp-bridge-arrow" aria-hidden="true"><LpIcon name="arrow-down" size={20} /></span>
          <p>{L.bridge[0]}<strong>{L.bridge[1]}</strong>{L.bridge[2]}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 新デザイン（Signal Sky）のLP専用パーツ ───────────────────────── */

const BA_WAIT_MS = 4500;

/** 導入前／導入後の切り替え。画面に入って導入前を読む時間をとってから（約4.5秒）自動で「導入後」へ切り替わる（ページに入るたびに同じ）。
 *  スイッチでいつでも見比べられる。導入後は、左の取引（銀行・カードなど）からクラウド会計へ線がつながり、右の税理士とも共有される。
 *  動かすのは opacity・transform と線の描画だけ。「動きを減らす」設定では最初から導入後を表示（スイッチは使える） */
function BeforeAfter({ sol }: { sol: Solution }) {
  const ba = sol.before_after;
  const L = LABELS[langOf(sol)];
  const ref = useRef<HTMLDivElement | null>(null);
  const [after, setAfter] = useState(false);
  const [counting, setCounting] = useState(false);
  const touched = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setAfter(true); return; }
    let timer = 0;
    // 6割が見えたら（スマホで図が画面より高いときは、画面の高さの6割を占めたら）待ち始める
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || (e.intersectionRatio < 0.6 && e.intersectionRect.height < window.innerHeight * 0.6)) return;
      io.disconnect();
      // 導入前をしっかり読めるよう、画面に入ってから約4.5秒待って切り替える（待っている間はスイッチの下に細い進み具合の線）
      setCounting(true);
      timer = window.setTimeout(() => { setCounting(false); if (!touched.current) setAfter(true); }, BA_WAIT_MS);
    }, { threshold: [0, 0.2, 0.3, 0.4, 0.5, 0.6] });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, []);
  if (!ba || !(ba.items ?? []).length) return null;
  const sources = (ba.sources ?? []).slice(0, 4);
  const ys = sources.map((_, i) => ((i + 0.5) / Math.max(1, sources.length)) * 100);
  const toggle = () => { touched.current = true; setCounting(false); setAfter((a) => !a); };
  return (
    <section className="section lp-ba-section" id="lp-ba">
      <div className="container">
        <div data-reveal>
        <div className={after ? "lp-ba is-after" : "lp-ba"} ref={ref}>
          <div className="lp-ba-copy">
            <span className="eyebrow" lang="en">Before / After</span>
            <h2><Lines text={ba.title || L.baTitle} /></h2>
            {ba.lead && <p>{ba.lead}</p>}
            <div className={counting ? "lp-ba-switch is-counting" : "lp-ba-switch"} style={{ ["--wait" as string]: `${BA_WAIT_MS}ms` }}>
              <span className={after ? undefined : "on"} aria-hidden="true">{L.baBefore}</span>
              <button type="button" className="lp-ba-toggle" role="switch" aria-checked={after} aria-label={L.baAria} onClick={toggle} />
              <span className={after ? "on" : undefined} aria-hidden="true">{L.baAfter}</span>
            </div>
          </div>
          <div className="lp-ba-board" aria-live="polite">
            {/* 背景の大きな文字（BEFORE → AFTER）と、導入後に差し込む空の光 */}
            <span className="lp-ba-light" aria-hidden="true" />
            <span className="lp-ba-word" aria-hidden="true"><span className="b">BEFORE</span><span className="a">AFTER</span></span>
            {sources.length > 0 && (
              <div className="lp-ba-map" data-live>
                <svg className="lp-ba-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {ys.map((y, i) => (
                    <path key={i} className="lp-ba-line" style={{ ["--i" as string]: i }} d={`M34 ${y}C38 ${y} 37 50 41 50`} pathLength={1} vectorEffect="non-scaling-stroke" />
                  ))}
                  {ba.partner && <path className="lp-ba-line is-share" style={{ ["--i" as string]: sources.length }} d="M63 50H71" pathLength={1} vectorEffect="non-scaling-stroke" />}
                  {/* 導入後：線の上をデータの粒が流れ続ける（画面内のときだけ） */}
                  {ys.map((y, i) => (
                    <path key={"p" + i} className="lp-ba-packet" style={{ ["--i" as string]: i }} d={`M34 ${y}C38 ${y} 37 50 41 50`} pathLength={1} vectorEffect="non-scaling-stroke" />
                  ))}
                  {ba.partner && <path className="lp-ba-packet is-share" style={{ ["--i" as string]: sources.length }} d="M63 50H71" pathLength={1} vectorEffect="non-scaling-stroke" />}
                </svg>
                <ul className="lp-ba-sources">
                  {sources.map((s, i) => <li key={s} style={{ ["--i" as string]: i }}>{s}</li>)}
                </ul>
                <div className="lp-ba-center">
                  <span className="lp-ba-center-before">{ba.center_before || "手作業"}</span>
                  <span className="lp-ba-center-after"><Icon name="check" size={14} />{ba.center_after || "自動化"}</span>
                </div>
                {ba.partner && <div className="lp-ba-partner">{ba.partner}</div>}
              </div>
            )}
            <ul className="lp-ba-grid">
              {(ba.items ?? []).map((it, i) => (
                <li key={it.label} style={{ ["--i" as string]: i }}>
                  <span className="lp-ba-check" aria-hidden="true"><Icon name="check" size={14} /></span>
                  <p className="lp-ba-head"><span>{it.label}</span><b className="lp-ba-status"><span className="b">{it.before_status || "—"}</span><span className="a">{it.after_status || "✓"}</span></b></p>
                  <p className="lp-ba-val"><span className="b">{it.before}</span><span className="a">{it.after}</span></p>
                </li>
              ))}
            </ul>
            <div className="lp-ba-meter" aria-hidden="true">
              <span className="lp-ba-meter-bar">{(ba.items ?? []).map((_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>
              <span className="lp-ba-meter-label"><span className="b">{L.baMeterBefore((ba.items ?? []).length)}</span><span className="a">{L.baMeterAfter((ba.items ?? []).length)}</span></span>
            </div>
            {ba.note && <p className="lp-ba-note">{ba.note}</p>}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 3. 仕組みの図解 ───────────────────────── */

/** 中心円型：線が中心から周りへ広がり（一度だけ）、その後は線の上を光の粒がゆっくり流れる（PC・画面内のときだけ）。
 *  PC でカーソルを当てた要素に関係する線だけを強調する。スマホは図の代わりに一覧で表示する。 */
function SchemeDiagram({ scheme, story }: { scheme: NonNullable<Solution["scheme"]>; story?: Story }) {
  const nodes = scheme.nodes ?? [];
  const [active, setActive] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const keys = ["c", ...nodes.map((_, i) => "n" + i)];
  // 仕組みのアニメーション（schemeStory.tsx）。スマホ（640px 以下）は一覧の形で、カードの右上を進む
  const { state, layer } = useSchemeStory(boxRef, story, keys, "(max-width: 640px)");
  const W = 1000, H = 600, cx = W / 2, cy = H / 2;
  const n = nodes.length;
  const rx = 370, ry = 215;
  const R = 110; // 中心の円（外側の輪）の半径
  const pos = nodes.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
    // 線は中心の輪の外から、各要素の枠の手前まで（枠 244×92 との交点）
    const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy);
    const t = Math.min(122 / Math.abs(dx || 1e-6), 46 / Math.abs(dy || 1e-6));
    return { x, y, sx: cx + (dx / len) * R, sy: cy + (dy / len) * R, ex: x - dx * t, ey: y - dy * t };
  });
  const hover = (i: number | null) => () => setActive(i);
  return (
    <div className="lp-scheme-diagram" ref={boxRef} data-reveal data-active={active === null ? undefined : active}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="lp-sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#087fe5" />
            <stop offset="1" stopColor="#0d2338" />
          </linearGradient>
        </defs>
        <g className="lp-scheme-lines" data-draw>
          {pos.map((p, i) => (
            <path
              key={"l" + i}
              d={`M${p.sx.toFixed(1)} ${p.sy.toFixed(1)}L${p.ex.toFixed(1)} ${p.ey.toFixed(1)}`}
              className={active === i || active === -1 ? "lp-scheme-line is-active" : "lp-scheme-line"}
              style={{ ["--draw-d" as string]: `${(0.15 + i * 0.09).toFixed(2)}s` }}
            />
          ))}
        </g>
        <g className="lp-scheme-ends">
          {pos.map((p, i) => (
            <circle key={"e" + i} cx={p.ex} cy={p.ey} r="5" className={active === i || active === -1 ? "is-active" : undefined} style={{ ["--i" as string]: i }} />
          ))}
        </g>
        <g className={`lp-scheme-center${state("c")}`} data-story="c" data-perch="above-c" onPointerEnter={hover(-1)} onPointerLeave={hover(null)}>
          <circle cx={cx} cy={cy} r={R} className="lp-scheme-ring" />
          <circle cx={cx} cy={cy} r="96" fill="url(#lp-sg)" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="lp-scheme-center-label" {...fitText(scheme.center?.label || "COANA TOKYO", 23, 160)}>{scheme.center?.label || "COANA TOKYO"}</text>
          {scheme.center?.sub && <text x={cx} y={cy + 20} textAnchor="middle" className="lp-scheme-center-sub" {...fitText(scheme.center.sub, 15, 170)}>{scheme.center.sub}</text>}
        </g>
        {nodes.map((node, i) => {
          const p = pos[i];
          return (
            <g key={node.label} className={`lp-scheme-node${active === i || active === -1 ? " is-active" : ""}${state("n" + i)}${story?.checks?.includes("n" + i) ? " has-check" : ""}`} data-story={"n" + i} data-perch="above-tr" onPointerEnter={hover(i)} onPointerLeave={hover(null)}>
              <rect x={p.x - 122} y={p.y - 46} width="244" height="92" rx="18" />
              {/* 整った工程の印（創業支援など） */}
              <g className="lp-scheme-check" transform={`translate(${p.x + 104} ${p.y - 46})`}>
                <circle r="13" />
                <path d="M-5.5 0.5l3.8 3.8L5.8-3.6" />
              </g>
              <text x={p.x} y={p.y - 6} textAnchor="middle" className="lp-scheme-node-label" {...fitText(node.label, 21, 220)}>{node.label}</text>
              {node.sub && <text x={p.x} y={p.y + 22} textAnchor="middle" className="lp-scheme-node-sub" {...fitText(node.sub, 14, 220)}>{node.sub}</text>}
            </g>
          );
        })}
      </svg>
      <ul className="lp-scheme-list" aria-label={scheme.title || ""}>
        <li className={`is-center${state("c")}`} data-story="c" data-perch="in-tr"><strong>{scheme.center?.label || "COANA TOKYO"}</strong>{scheme.center?.sub && <span>{scheme.center.sub}</span>}</li>
        {nodes.map((node, i) => (
          <li key={node.label} className={(state("n" + i) + (story?.checks?.includes("n" + i) ? " has-check" : "")).trim() || undefined} data-story={"n" + i} data-perch="in-tr"><strong>{node.label}</strong>{node.sub && <span>{node.sub}</span>}</li>
        ))}
      </ul>
      {layer}
    </div>
  );
}

/** リレー型：御社 →（1）COANA TOKYO →（2）対応する領域 →（3）完了をご報告 →（4）手順をマニュアル化 → 御社へ戻る。
 *  PC は左から右へ一方向（戻りは下の段を右から左へ）、900px 以下は上から下の1列（スマホ専用の並び）。
 *  線は意味のある線だけ（矢印で順序が分かる）。鳩が通った線から色がつく。点線の道筋は出さない */
function SchemeRelay({ scheme, story, labels }: { scheme: NonNullable<Solution["scheme"]>; story?: Story; labels: { todo: string; goal: string } }) {
  const areas = scheme.nodes ?? [];
  const returns = scheme.returns ?? [];
  const steps = scheme.steps ?? [];
  const boxRef = useRef<HTMLDivElement | null>(null);
  const keys = ["client", "c", ...areas.map((_, i) => "n" + i), ...returns.map((_, i) => "r" + i)];
  const { state, layer, now, done, still } = useSchemeStory(boxRef, story, keys, "(max-width: 900px)");
  const lit = (k: string) => still || done.includes(k);
  const anyArea = areas.some((_, i) => lit("n" + i));
  void now;
  // 役割は「エリア」で示す：COANA TOKYO が担当する範囲（中心・領域・最後の手前までの戻り）を薄いパネルで囲み、見出しを付ける。
  // 最後の戻り（例：開業の土台が整う）は、御社が「受け取るもの」としてパネルの外・御社の側（暖色）に置く。鳩が最後に届ける先
  const inner = returns.slice(0, -1);
  const goal = returns.length ? returns[returns.length - 1] : null;
  // PC の線：カードの位置から引く（幅が変わったら・文字が読み込まれたら引き直す）
  const [geom, setGeom] = useState<{ k: string; d: string; arrow: boolean }[]>([]);
  useLayoutEffect(() => {
    const root = boxRef.current;
    if (!root) return;
    const measure = () => {
      const pc = !window.matchMedia("(max-width: 900px)").matches;
      if (!pc) { setGeom([]); return; }
      const b = root.getBoundingClientRect();
      const r = (sel: string) => { const e = root.querySelector(sel); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left - b.left, r: x.right - b.left, t: x.top - b.top, bt: x.bottom - b.top, cx: x.left - b.left + x.width / 2, cy: x.top - b.top + x.height / 2 }; };
      const client = r(".relay-client"), center = r(".relay-center"), list = r(".relay-areas");
      const items = [...root.querySelectorAll(".relay-area")].map((e) => { const x = e.getBoundingClientRect(); return { l: x.left - b.left, cy: x.top - b.top + x.height / 2 }; });
      const rets = [...root.querySelectorAll(".relay-return, .relay-goal")].map((e) => { const x = e.getBoundingClientRect(); return { l: x.left - b.left, r: x.right - b.left, t: x.top - b.top, bt: x.bottom - b.top, cx: x.left - b.left + x.width / 2, cy: x.top - b.top + x.height / 2 }; });
      if (!client || !center || !list || !items.length) return;
      const f = (n: number) => n.toFixed(1);
      const g: { k: string; d: string; arrow: boolean }[] = [];
      const y = center.cy;
      g.push({ k: "c", d: `M${f(client.r + 8)} ${f(y)}H${f(center.l - 10)}`, arrow: true });
      const spine = list.l - 24;
      g.push({ k: "trunk", d: `M${f(center.r + 8)} ${f(y)}H${f(spine)}M${f(spine)} ${f(items[0].cy)}V${f(items[items.length - 1].cy)}`, arrow: false });
      items.forEach((it, i) => g.push({ k: "n" + i, d: `M${f(spine)} ${f(it.cy)}H${f(it.l - 9)}`, arrow: true }));
      // 戻り：領域の下 → 3 → 4 → 御社（下の段を右から左へ、最後は上向き）
      if (rets.length) {
        const r0 = rets[0];
        g.push({ k: "r0", d: `M${f(r0.cx)} ${f(list.bt + 8)}V${f(r0.t - 10)}`, arrow: true });
        rets.slice(1).forEach((rt, i) => g.push({ k: "r" + (i + 1), d: `M${f(rets[i].l - 8)} ${f(rt.cy)}H${f(rt.r + 10)}`, arrow: true }));
      }
      setGeom(g);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [areas.length, returns.length]);
  const on = (k: string) => (k === "trunk" ? anyArea : lit(k));
  const num = (i: number) => <b className="relay-num">{i}</b>;
  return (
    <div className="relay" ref={boxRef} data-reveal>
      <svg className="relay-lines" aria-hidden="true" focusable="false">
        <defs>
          <marker id="relay-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path className="relay-head" d="M1 1.5 8 5l-7 3.5" /></marker>
          <marker id="relay-arrow-lit" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path className="relay-head is-lit" d="M1 1.5 8 5l-7 3.5" /></marker>
        </defs>
        {geom.map((l) => (
          <g key={l.k} className={on(l.k) ? "is-on" : undefined}>
            <path className="relay-line" d={l.d} markerEnd={l.arrow ? "url(#relay-arrow)" : undefined} />
            <path className="relay-line-lit" d={l.d} markerEnd={l.arrow ? "url(#relay-arrow-lit)" : undefined} />
          </g>
        ))}
      </svg>
      <div className="relay-panel" aria-hidden="true" />
      <div className={`relay-card relay-client${state("client")}`} data-story="client" data-perch="above-tr" data-perch-v="in-tr">
        <span className="relay-icon"><LpIcon name={scheme.client?.icon || "person"} size={24} /><StepCheck /></span>
        <strong>{scheme.client?.label}</strong>
        {scheme.client?.todo ? (
          <span className="relay-todo"><em>{labels.todo}</em>{scheme.client.todo}</span>
        ) : scheme.client?.sub && <span className="relay-sub">{scheme.client.sub}</span>}
      </div>
      <p className={`relay-step is-1${lit("c") ? " is-on" : ""}`}>{num(1)}<span>{steps[0]}</span></p>
      {/* COANA TOKYO が担当する範囲（PC は display: contents でグリッドに並べ、背景は .relay-panel。スマホはこの箱が背景のパネル） */}
      <div className="relay-team">
        <p className="relay-team-head">{scheme.team_label || "COANA TOKYOが担当"}</p>
        <div className={`relay-card relay-center${state("c")}`} data-story="c" data-perch="above-tr" data-perch-v="in-tr">
          <span className="relay-icon"><LpIcon name={scheme.center?.icon || "users"} size={24} /><StepCheck /></span>
          <strong>{scheme.center?.label || "COANA TOKYO"}</strong>
          {scheme.center?.sub && <span className="relay-sub">{scheme.center.sub}</span>}
        </div>
        <p className={`relay-step is-2${anyArea ? " is-on" : ""}`}>{num(2)}<span>{steps[1]}</span></p>
        <ul className={`relay-areas${anyArea ? " is-on" : ""}`}>
          {areas.map((a, i) => (
            // partner：提携先の専門家や御社など、COANA TOKYO 自身ではない相手（破線の枠）
            <li key={a.label} className={`relay-area${a.partner ? " is-partner" : ""}${state("n" + i)}`} data-story={"n" + i} data-perch="group-tr">
              <span className="relay-icon"><LpIcon name={a.icon || "check"} size={20} /><StepCheck /></span>
              <strong>{a.label}</strong>
              {a.sub && <span className="relay-sub">{a.sub}</span>}
            </li>
          ))}
        </ul>
        {inner.map((rt, i) => (
          <div key={rt.label} className={`relay-card relay-return is-r${i}${state("r" + i)}${lit("r" + i) ? " is-on" : ""}`} data-story={"r" + i} data-perch="above-tr" data-perch-v="in-tr">
            <i className="relay-arrow" aria-hidden="true" />
            <span className="relay-icon"><LpIcon name={rt.icon || "check"} size={22} /><StepCheck /></span>
            <strong>{num(i + 3)}{rt.label}</strong>
            {rt.sub && <span className="relay-sub">{rt.sub}</span>}
          </div>
        ))}
      </div>
      {goal && (() => {
        const k = "r" + inner.length;
        return (
          <div className={`relay-card relay-goal${state(k)}${lit(k) ? " is-on" : ""}`} data-story={k} data-perch="above-tr" data-perch-v="in-tr">
            <i className="relay-arrow" aria-hidden="true" />
            <span className="relay-goal-tag">{labels.goal}</span>
            <span className="relay-icon"><LpIcon name={goal.icon || "check"} size={22} /><StepCheck /><i className="relay-page" aria-hidden="true" /></span>
            <strong>{num(inner.length + 3)}{goal.label}</strong>
            {goal.sub && <span className="relay-sub">{goal.sub}</span>}
          </div>
        );
      })()}
      {layer}
    </div>
  );
}

/** 一本の流れ型：画面に入ると、各ステージが左から順に点灯し、アイコンが線で描かれる（文字は最初から読める） */
function SchemeFlow({ scheme, story }: { scheme: NonNullable<Solution["scheme"]>; story?: Story }) {
  const steps = scheme.nodes ?? [];
  const boxRef = useRef<HTMLDivElement | null>(null);
  const keys = steps.map((_, i) => "n" + i);
  // 仕組みのアニメーション（schemeStory.tsx）。980px 以下は縦に1本で、カードの右上を進む
  const { state, layer, running } = useSchemeStory(boxRef, story, keys, "(max-width: 980px)");
  return (
    <div className="lp-scheme-flow-wrap" ref={boxRef} data-run={running ? "" : undefined}>
      <ol className={`lp-scheme-flow is-${Math.min(steps.length, 5)}`}>
        {steps.map((st, i) => (
          <li key={st.label} className={state("n" + i).trim() || undefined} data-story={"n" + i} data-perch="above-tr" data-perch-v="in-tr">
            <span className="lp-scheme-flow-icon"><LpIcon name={st.icon || "check"} size={26} /><b>{i + 1}</b><StepCheck /></span>
            <strong>{st.label}</strong>
            {st.sub && <span>{st.sub}</span>}
          </li>
        ))}
      </ol>
      {layer}
    </div>
  );
}

/** レーン型（経理代行など）：「御社がやること」と「COANA TOKYO がやること」を2段に分け、仕事の差をひと目で見せる。
 *  - PC：上の段に御社（資料を入れる・報告を受け取る の2つだけ）、下の段に COANA TOKYO の工程。スマホは縦に1本の流れ。
 *  - 領収書がクラウドに入り、COANA TOKYO の工程を順に通って、月次レポートは御社へ、決算用のデータは顧問税理士へ届く様子を、
 *    ゆっくり繰り返し見せる（schemeStory.tsx。スクロールとは連動しない）。
 *  - 文字は最初から全部読める。工程にカーソルを当てる（スマホはタップ）と、その工程でやることが少し詳しく出る。
 *  - 「動きを減らす」設定では動かさず、全工程を完了した状態で見せる。 */
type LaneNode = NonNullable<NonNullable<Solution["scheme"]>["nodes"]>[number];

/** メディアクエリが一致しているか（画面幅や入力方法が変わったら追従） */
function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** 開閉の目印（文字の横の ∨。開いているときは上向き） */
const Chevron = () => <svg className="toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;

function SchemeLanes({ scheme, story }: { scheme: NonNullable<Solution["scheme"]>; story?: Story }) {
  const nodes = (scheme.nodes ?? []) as LaneNode[];
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<{ main: string; side: string[] }>({ main: "", side: [] });
  const [open, setOpen] = useState<number | null>(null);
  // PC（マウス）：カーソルを当てる・キーボードでフォーカスすると説明が出る（クリックでの開閉はしない）。
  // タッチ端末：「詳しく見る ∨／閉じる ∧」のボタンで開閉する
  const hoverPC = useMedia("(hover: hover) and (pointer: fine) and (min-width: 981px)");
  // 仕組みのアニメーション（schemeStory.tsx）。工程の説明を開いている間は止める
  const keys = nodes.map((_, i) => "n" + i);
  const { state, layer } = useSchemeStory(boxRef, story, keys, "(max-width: 980px)", open !== null);
  // 書類が通る順路：最後の「御社」までの工程。その後ろ（税理士への連携など）は、直前の COANA TOKYO の工程から枝分かれ
  const lastClient = nodes.map((n) => n.who).lastIndexOf("client");
  const pathEnd = lastClient > 0 ? lastClient : nodes.length - 1;
  // PC の配置：COANA TOKYO の工程を左から順に並べ、御社の工程はその前後の工程の列に置く
  let col = 0;
  const place = nodes.map((n, i) => {
    if (n.who === "client") {
      const before = nodes.slice(0, i).some((m) => m.who !== "client");
      return { row: 1, col: before ? col : col + 1 };
    }
    col += 1;
    return { row: 2, col };
  });
  const teamCount = col;
  // 受け渡しの地点：御社の最初の工程のすぐ後の、COANA TOKYO の工程。ここに「ここから先は COANA TOKYO が対応します」を添える
  const firstClient = nodes.findIndex((n) => n.who === "client");
  const handoff = firstClient >= 0 ? nodes.findIndex((n, i) => i > firstClient && n.who !== "client") : -1;

  // つなぐ線：各工程のアイコンの中心を、縦横の線でつなぐ（画面幅が変わったら引き直す）
  const centers = useCallback(() => {
    const box = boxRef.current;
    if (!box) return [];
    const b = box.getBoundingClientRect();
    return Array.from(box.querySelectorAll<HTMLElement>("[data-lane-node]")).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
    });
  }, []);
  useLayoutEffect(() => {
    const draw = () => {
      const c = centers();
      if (c.length < 2) return;
      const seg = (a: { x: number; y: number }, z: { x: number; y: number }) =>
        Math.abs(a.x - z.x) < 2 || Math.abs(a.y - z.y) < 2 ? `L${z.x.toFixed(1)} ${z.y.toFixed(1)}` : `L${a.x.toFixed(1)} ${z.y.toFixed(1)}L${z.x.toFixed(1)} ${z.y.toFixed(1)}`;
      let main = `M${c[0].x.toFixed(1)} ${c[0].y.toFixed(1)}`;
      for (let i = 1; i <= pathEnd; i++) main += seg(c[i - 1], c[i]);
      // 順路の後ろの工程は、直前の COANA TOKYO の工程から枝分かれして
      const side: string[] = [];
      for (let i = pathEnd + 1; i < c.length; i++) {
        let from = i - 1;
        while (from > 0 && nodes[from].who === "client") from -= 1;
        side.push(`M${c[from].x.toFixed(1)} ${c[from].y.toFixed(1)}` + seg(c[from], c[i]));
      }
      setLines({ main, side });
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (boxRef.current) ro.observe(boxRef.current);
    document.fonts?.ready.then(draw);
    return () => ro.disconnect();
  }, [centers, pathEnd, nodes]);

  return (
    <div className="lanes" ref={boxRef} style={{ ["--cols" as string]: teamCount }}>
      <svg className="lanes-lines" aria-hidden="true" focusable="false">
        <path className="lanes-line" d={lines.main} />
        {lines.side.map((d, i) => <path key={i} className="lanes-line is-side" d={d} />)}
      </svg>
      <p className="lanes-label is-client"><span>{scheme.client_label || "御社がやること"}</span></p>
      <p className="lanes-label is-team"><span>{scheme.team_label || "COANA TOKYOがやること"}</span></p>
      <ol className="lanes-list">
        {nodes.map((n, i) => {
          const who = n.who === "client" ? "client" : "team";
          return (
            <li key={n.label} className={`lanes-item is-${who}${state("n" + i)}${open === i ? " is-open" : ""}`} style={{ gridRow: place[i].row, gridColumn: place[i].col + 1 }}>
              {i === handoff && scheme.rest && (
                <p className="lanes-handoff">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6" /></svg>
                  {scheme.rest}
                </p>
              )}
              {/* スマホ：担当が切り替わる工程にだけ「御社／COANA TOKYO」の札（受け渡しの地点は注記が兼ねる） */}
              {(i === 0 || nodes[i - 1].who !== n.who) && !(i === handoff && scheme.rest) && (
                <span className="lanes-tag">{who === "client" ? (scheme.client_label || "御社がやること").replace(/がやること$/, "") : "COANA TOKYO"}</span>
              )}
              {(() => {
                const inner = (
                  <>
                    <span className="lanes-icon" data-lane-node>
                      <LpIcon name={n.icon || "check"} size={22} />
                      <StepCheck />
                    </span>
                    <span className="lanes-text"><strong>{n.label}</strong>{n.sub && <span>{n.sub}</span>}</span>
                  </>
                );
                if (!n.detail) return <div className="lanes-card" data-story={"n" + i} data-perch={who === "client" ? "out-r" : "above-tr"} data-perch-v="in-tr">{inner}</div>;
                if (hoverPC) {
                  // Esc で説明を閉じられるように（フォーカスを外す）
                  return (
                    <div className="lanes-card is-hint" data-story={"n" + i} data-perch={who === "client" ? "out-r" : "above-tr"} data-perch-v="in-tr" tabIndex={0} aria-describedby={`lanes-detail-${i}`} onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}>
                      {inner}
                    </div>
                  );
                }
                return (
                  <button type="button" className="lanes-card" data-story={"n" + i} data-perch={who === "client" ? "out-r" : "above-tr"} data-perch-v="in-tr" aria-expanded={open === i} aria-controls={`lanes-detail-${i}`} onClick={() => setOpen((cur) => (cur === i ? null : i))}>
                    {inner}
                    <span className="lanes-more">{open === i ? "閉じる" : "詳しく見る"}<Chevron /></span>
                  </button>
                );
              })()}
              {n.detail && <p id={`lanes-detail-${i}`} className="lanes-detail" role={hoverPC ? "tooltip" : undefined}>{n.detail}</p>}
            </li>
          );
        })}
      </ol>
      {layer}
      {(scheme.cycle ?? []).length > 0 && (
        <div className="lanes-cycle">
          <span className="lanes-cycle-label" data-cycle><LpIcon name="refresh" size={16} />毎月くり返し</span>
          <ol>
            {(scheme.cycle ?? []).map((c) => <li key={c.when}><b>{c.when}</b>{c.text}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

function Scheme({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  const scheme = sol.scheme;
  if (!scheme || !(scheme.nodes ?? []).length) return null;
  const story = STORIES[sol.slug];
  return (
    <section className="section lp-scheme">
      <div className="container">
        <SectionTitle en="How it works" center lead={scheme.lead}>{scheme.title || L.scheme}</SectionTitle>
        {scheme.type === "lanes" ? <SchemeLanes scheme={scheme} story={story} /> : scheme.type === "flow" ? <SchemeFlow scheme={scheme} story={story} /> : scheme.type === "relay" ? <SchemeRelay scheme={scheme} story={story} labels={{ todo: L.relayTodo, goal: L.relayGoal }} /> : <SchemeDiagram scheme={scheme} story={story} />}
        {(scheme.points ?? []).length > 0 && (
          <ul className="lp-scheme-points">
            {(scheme.points ?? []).map((p) => (
              <li key={p.name}>
                <span className="lp-scheme-point-icon"><LpIcon name={p.icon || "check"} size={24} /></span>
                <h3>{p.name}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        )}
        {scheme.note && <p className="lp-note">{scheme.note}</p>}
        {scheme.cta && (
          <p className="lanes-cta">
            <span>{scheme.cta}</span>
            <GoLink className="lanes-cta-link" go={navigate} args={["contact"]}>{L.consult}<Icon name="arrow" size={16} /></GoLink>
          </p>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── 4. 支援内容とプラン ───────────────────────── */

function Support({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const tools = sol.tools ?? [];
  const groups = sol.scope?.groups ?? [];
  const plans = sol.plans?.items ?? [];
  const scopeCount = groups.reduce((sum, g) => sum + (g.items?.length ?? 0), 0);
  const [scopeOpen, setScopeOpen] = useState(false);
  // 新デザインのLPは「プランと料金の目安」を先に見せ、支援内容の6枚のカードは出さない（仕組みの図・業務の一覧と重なるため。2026-10-26 オーナー依頼の LP の簡素化）
  const signal = sol.design === "signal";
  const hasPrice = plans.some((p) => p.price);
  const title = signal && plans.length > 0
    ? (sol.plans?.title || (hasPrice ? L.pricing : L.plans))
    : (sol.features_title && sol.features_title !== "支援内容" ? sol.features_title : L.support);
  const planNote = hasPrice ? (sol.plans?.note || L.priceNote) : (sol.plans?.note || L.plansNote);
  return (
    <section id="lp-support" className="section lp-support">
      <div className="container">
        <SectionTitle en={signal && plans.length > 0 ? "Plans & pricing" : "Services & plans"} center lead={signal ? undefined : sol.features_lead}>{title}</SectionTitle>
        {!signal && (
          <ul className="lp-feature-grid">
            {sol.features.map((f) => (
              <li key={f.name} className="lp-feature">
                <span className="lp-feature-icon"><LpIcon name={f.icon} size={26} /></span>
                <div><h3>{f.name}</h3><p>{f.text}</p></div>
              </li>
            ))}
          </ul>
        )}

        {plans.length > 0 && (
          <>
            {!signal && <h3 className="lp-subhead">{sol.plans?.title || L.plans}</h3>}
            <div className="lp-plan-grid">
              {plans.map((p) => (
                <article key={p.name} className={p.featured ? "lp-plan is-featured" : "lp-plan"}>
                  {p.tag && <span className="lp-plan-tag">{p.tag}</span>}
                  <div className="lp-plan-head">
                    <h4>{p.name}</h4>
                    {p.price && <p className="lp-plan-price">{p.price}</p>}
                  </div>
                  {p.text && <p className="lp-plan-text">{p.text}</p>}
                  {(p.includes ?? []).length > 0 && (
                    <ul>{(p.includes ?? []).map((it) => <li key={it}><Icon name="check" size={15} /><span>{it}</span></li>)}</ul>
                  )}
                  {p.best_for && <p className="lp-plan-for"><span>{L.bestFor}</span>{p.best_for}</p>}
                </article>
              ))}
            </div>
            <p className="lp-note lp-plan-note"><LpIcon name="yen" size={16} /><span>{planNote}</span></p>
          </>
        )}

        {groups.length > 0 && (
          <details className="lp-scope" onToggle={(e) => setScopeOpen(e.currentTarget.open)}>
            <summary>
              <LpIcon name="rules" size={18} />
              <span className="lp-scope-title">{sol.scope?.title || L.scope}</span>
              <span className="lp-scope-open">{scopeOpen ? L.scopeClose : L.scopeOpen + L.count(scopeCount)}<Chevron /></span>
            </summary>
            <div className="lp-scope-grid">
              {groups.map((g) => (
                <div key={g.name} className="lp-scope-card">
                  <h3><LpIcon name={g.icon || "check"} size={18} />{g.name}</h3>
                  <ul>{(g.items ?? []).map((it) => <li key={it}>{it}</li>)}</ul>
                </div>
              ))}
            </div>
          </details>
        )}
        {sol.scope?.note && <p className="lp-note lp-note-legal">{sol.scope.note}</p>}

        {tools.length > 0 && (
          <div className="lp-tools">
            <p className="lp-tools-title">{sol.tools_title || L.tools}</p>
            <ul>
              {tools.map((t) => {
                const logo = toolLogo(t);
                return (
                  <li key={t} className={logo ? "has-logo" : ""}>
                    {logo && <img src={logo} alt="" loading="lazy" />}
                    <span>{t}</span>
                  </li>
                );
              })}
            </ul>
            {sol.tools_note && <small>{sol.tools_note}</small>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── 5. 事例（ご利用イメージ） ───────────────────────── */

function Scenarios({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const sc = sol.scenarios;
  if (!sc || !(sc.items ?? []).length) return null;
  return (
    <section className="section lp-scenarios">
      <div className="container">
        <SectionTitle en="Use cases" center lead={sc.lead}>{sc.title || L.scenarios}</SectionTitle>
        <div className="lp-scenario-grid">
          {(sc.items ?? []).map((it) => (
            <article key={it.name} className="lp-scenario">
              {it.tag && <span className="lp-scenario-tag"><LpIcon name="building" size={15} />{it.tag}</span>}
              <h3>{it.name}</h3>
              {it.before && <p className="lp-scenario-before"><span>{L.before}</span>{it.before}</p>}
              <span className="lp-scenario-arrow" aria-hidden="true"><LpIcon name="arrow-down" size={18} /></span>
              <p className="lp-scenario-after"><span>{L.after}</span>{it.text}</p>
            </article>
          ))}
        </div>
        {sc.note && <p className="lp-note">{sc.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 6. 流れ ───────────────────────── */

function Flow({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const steps = sol.flow ?? [];
  if (!steps.length) return null;
  return (
    <section className="section lp-flow">
      <div className="container">
        <SectionTitle en="Flow" center>{sol.steps_title || L.flow}</SectionTitle>
        <FlowLine
          steps={steps.map((st) => ({ name: st.name, text: st.text }))}
          note={sol.flow_note && <><LpIcon name="clock" size={16} /><span>{sol.flow_note}</span></>}
        />
        {/* 相談のボタンは置かない：よくあるご質問のすぐ後に、ページ下部のお問い合わせの帯がある（PC はヘッダー、スマホは固定バーからもいつでも相談できる） */}
      </div>
    </section>
  );
}

/* ───────────────────────── 8. お問い合わせ ───────────────────────── */

function CtaBand({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  return (
    <section className="lp-cta-band">
      <div className="lp-cta-orbit" aria-hidden="true" />
      <div className="container lp-cta-inner">
        <div className="lp-cta-copy">
          <span className="eyebrow">Contact</span>
          <h2>{sol.cta_title || L.ctaTitle}</h2>
          <p><Lines text={sol.cta_text || L.ctaText} /></p>
          <div className="lp-cta-actions">
            <GoLink className="button button-large" go={navigate} args={["contact"]}>
              {L.ctaButton}<Icon name="arrow" size={19} />
            </GoLink>
            <LineButton place="solution_cta" label={L.consultLine} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyCta({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // 固定CTAが「ページ先頭へ」ボタンやフッターと重ならないよう、表示中は body にクラスを付ける
  useEffect(() => {
    document.body.classList.toggle("has-sticky-cta", show);
    return () => document.body.classList.remove("has-sticky-cta");
  }, [show]);
  return (
    <div className={show ? "lp-sticky show" : "lp-sticky"} aria-hidden={!show}>
      <GoLink className="lp-sticky-main" go={navigate} args={["contact"]} tabIndex={show ? 0 : -1}>
        {L.sticky}<Icon name="arrow" size={17} />
      </GoLink>
      <LineButton place="solution_sticky" label="LINE" tabIndex={show ? 0 : -1} />
      {/* チャットはこのバーにまとめる（固定バーの表示中は、画面右下のチャットのボタンは出さない） */}
      <button type="button" className="lp-sticky-chat" onClick={() => openChat("menu")} tabIndex={show ? 0 : -1} aria-label="COANA TOKYO サポートチームにチャットで相談・診断する">
        <img src={CHAT_MARK} alt="" width={26} height={26} decoding="async" />
      </button>
    </div>
  );
}

/* ───────────────────────── ページ本体 ───────────────────────── */

export function SolutionPage({ navigate }: { navigate: Nav }) {
  const rawSlug = window.location.pathname.replace(/^\/services\//, "").replace(/\/+$/, "");
  let slug = rawSlug;
  try { slug = decodeURIComponent(rawSlug); } catch { /* 不正なURLエンコードはそのまま扱う */ }
  const sol = solutions.find((s) => s.slug === slug);
  useEffect(() => {
    document.title = sol
      ? `${sol.seo_title || sol.title} | ${sol.lang === "en" ? "COANA TOKYO LLC" : "COANA TOKYO合同会社"}`
      : `ページが見つかりません | COANA TOKYO合同会社`;
  }, [sol]);
  useEffect(() => {
    const lang = sol?.lang === "en" ? "en" : "ja";
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => { document.documentElement.lang = prev || "ja"; };
  }, [sol]);
  if (!sol) return <NotFound navigate={navigate} />;
  navigate = withInquiry(sol, navigate);
  const L = LABELS[langOf(sol)];
  const related = (sol.related ?? [])
    .map((r) => articles.find((a) => a.slug === r))
    .filter((a): a is Article => Boolean(a));
  const others = solutions.filter((s) => s.slug !== sol.slug && !s.hidden);
  // 新デザイン（Signal Sky）で組み直したLP（CMS の「ページのデザイン」= signal）
  const signal = sol.design === "signal";
  return (
    <main className={`solution-page lp lp-lang-${langOf(sol)}${signal ? " lp-signal" : ""}`}>
      <Hero sol={sol} navigate={navigate} />
      {signal ? <BeforeAfter sol={sol} /> : <Problems sol={sol} />}
      <Scheme sol={sol} navigate={navigate} />
      <Support sol={sol} />
      {/* 新デザインのLPでは「ご利用イメージ」を出さない（導入前／導入後の切り替えと内容が重なるため。2026-10-26 LP の簡素化） */}
      {!signal && <Scenarios sol={sol} />}
      <Flow sol={sol} />
      {(sol.faqs ?? []).length > 0 && <FaqSection items={sol.faqs} title={sol.faq_title || L.faq} />}
      {signal
        ? <ContactBand navigate={navigate} big title={sol.cta_title || L.ctaTitle} text={sol.cta_text || L.ctaText} bigText={L.bigCta} primary={L.ctaButton} line={L.consultLine} place="solution_cta" chat={langOf(sol) === "ja"} lang={langOf(sol)} />
        : <CtaBand sol={sol} navigate={navigate} />}
      <section className="section solution-more">
        <div className="container solution-more-grid">
          {related.length > 0 && (
            <div>
              <h2 className="solution-more-title">{L.column}</h2>
              <div className="article-list">
                {related.map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
              </div>
            </div>
          )}
          <div>
            <h2 className="solution-more-title">{L.others}</h2>
            <div className="solution-other-list">
              {others.map((o) => (
                <GoLink key={o.slug} className="solution-other" go={navigate} args={["solution", undefined, o.slug]}>
                  <ServiceArt slug={o.slug} className="solution-other-art" />
                  <span>{o.nav_label}</span>
                  <Icon name="arrow" size={18} />
                </GoLink>
              ))}
              <GoLink className="solution-other is-all" go={navigate} args={["services"]}>
                <span>{L.allServices}</span>
                <Icon name="arrow" size={18} />
              </GoLink>
            </div>
            {langOf(sol) === "ja" && <DiagnoseLink className="is-lp" />}
          </div>
        </div>
      </section>
      <StickyCta sol={sol} navigate={navigate} />
    </main>
  );
}
