import { useEffect, useState } from "react";
import { articles, home, services, settings, solutions, type Article, type Solution } from "./content";
import { ArticleRow, FaqSection, GoLink, Icon, LineButton, Lines, NotFound, SectionTitle, type Nav } from "./shared";
import "./solution.css";

/* ───────────────────────── サービス別ランディングページ ─────────────────────────
 * content/solutions/*.json（CMS「サービス別ページ」）の内容を、申し込みにつながる構成で描画する。
 * 追加項目（catch / target / outcomes / reasons / flow / message など）は任意。空欄のセクションは表示しない。
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
    heroNote: "相談・お見積もりは無料。全国オンライン対応。",
    forYou: "こんな方におすすめです",
    problems: "こんなお悩みはありませんか",
    bridge: ["そのお悩み、", "COANA TOKYO", "が仕組みから解決します。"],
    scheme: "支援の仕組み",
    outcomes: "支援後に、こう変わります",
    before: "Before",
    after: "After",
    support: "支援内容",
    scope: "ご依頼いただける業務の例",
    tools: "対応ツールの例",
    compare: "一般的なサービスとの違い",
    compareOurs: "COANA TOKYO",
    compareOthers: "一般的なサービス",
    plans: "ご利用プランの例",
    plansNote: "料金は支援内容と業務範囲に応じて個別にお見積もりします。小規模なご依頼や、一部の業務だけのご相談も歓迎です。",
    reasons: "COANA TOKYOが選ばれる理由",
    flow: "ご利用までの流れ",
    step: "STEP",
    flowCta: "まずは無料で相談する",
    scenarios: "ご利用イメージ",
    message: "代表からのメッセージ",
    rep: "代表",
    faq: "よくあるご質問",
    column: "関連するコラム",
    ctaTitle: "まずは、現状をお聞かせください。",
    ctaText: "ご相談・お見積もりは無料です。\n「何から相談すればいいか分からない」という段階でも、一緒に整理するところから始めます。",
    ctaButton: "無料相談・お問い合わせ",
    others: "そのほかのサービス",
    allServices: "サービス一覧を見る",
    sticky: "無料で相談する",
  },
  en: {
    consult: "Book a free consultation",
    consultLine: "Chat on LINE",
    heroNote: "Consultation and quotes are free. Available online nationwide, in English.",
    forYou: "Who this is for",
    problems: "Sound familiar?",
    bridge: ["We help you solve these, ", "step by step", ", with a bilingual partner on your side."],
    scheme: "How it works",
    outcomes: "What changes",
    before: "Before",
    after: "After",
    support: "What we do",
    scope: "Examples of what you can ask us",
    tools: "Tools we work with",
    compare: "How we are different",
    compareOurs: "COANA TOKYO",
    compareOthers: "Typical services",
    plans: "Example plans",
    plansNote: "Pricing is quoted individually based on scope. Small or partial engagements are welcome.",
    reasons: "Why COANA TOKYO",
    flow: "How to get started",
    step: "STEP",
    flowCta: "Book a free consultation",
    scenarios: "Example situations",
    message: "A message from our founder",
    rep: "Founder",
    faq: "FAQ",
    column: "Related articles",
    ctaTitle: "Tell us where you are. We will take it from there.",
    ctaText: "Consultation and quotes are free.\nIf you are not sure where to start, that is exactly where we begin.",
    ctaButton: "Contact us (free consultation)",
    others: "Other services",
    allServices: "See all services",
    sticky: "Free consultation",
  },
};
type Lang = keyof typeof LABELS;
const langOf = (sol: Solution): Lang => (sol.lang === "en" ? "en" : "ja");

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  const image = sol.hero_image || services.hero_image;
  return (
    <section className="lp-hero">
      <div className="lp-hero-bg" aria-hidden="true" style={{ backgroundImage: `url("${image}")` }} />
      <div className="lp-hero-veil" aria-hidden="true" />
      <div className="container lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-hero-kicker">
            <span className="lp-hero-en">{sol.en || "Service"}</span>
            <span className="lp-hero-label">{sol.nav_label}</span>
          </p>
          <h1 className={sol.catch ? "lp-hero-title" : "lp-hero-title is-plain"}>
            {sol.catch
              ? sol.catch.split("\n").map((line, i) => <span key={i} className="lp-hero-line">{line}</span>)
              : sol.title}
          </h1>
          {sol.catch && <p className="lp-hero-sub">{sol.title}</p>}
          <p className="lp-hero-lead"><Lines text={sol.lead} /></p>
          {(sol.hero_points ?? []).length > 0 && (
            <ul className="lp-hero-points">
              {(sol.hero_points ?? []).map((p) => <li key={p}><Icon name="check" size={15} />{p}</li>)}
            </ul>
          )}
          <div className="lp-hero-actions">
            <GoLink className="button button-large lp-button-primary" go={navigate} args={["contact"]}>
              {L.consult}<Icon name="arrow" size={19} />
            </GoLink>
            <LineButton place="solution_hero" label={L.consultLine} />
          </div>
          <p className="lp-hero-note">{sol.hero_note || L.heroNote}</p>
        </div>
        {(sol.hero_facts ?? []).length > 0 && (
          <ul className="lp-hero-facts" aria-label="サービスの特徴">
            {(sol.hero_facts ?? []).map((f) => (
              <li key={f.label}><strong>{f.value}</strong><span>{f.label}</span></li>
            ))}
          </ul>
        )}
      </div>
      <a className="lp-hero-scroll" href="#lp-target" aria-label="scroll"><LpIcon name="arrow-down" size={18} /></a>
    </section>
  );
}

/* ───────────────────────── こんな方に ───────────────────────── */

function Target({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const items = sol.target ?? [];
  if (!items.length) return null;
  return (
    <section id="lp-target" className="section lp-target">
      <div className="container">
        <SectionTitle en="For you" center>{sol.target_title || L.forYou}</SectionTitle>
        <div className="lp-target-grid">
          {items.map((t, i) => (
            <article key={t.name} className="lp-target-card" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="lp-target-icon"><LpIcon name={t.icon || "person"} size={28} /></span>
              <h3>{t.name}</h3>
              <p>{t.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── お悩み ───────────────────────── */

function Problems({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  return (
    <section className="section lp-problems">
      <div className="container lp-problems-inner">
        <div className="lp-problems-copy">
          <SectionTitle en="Problems">{sol.problems_title || L.problems}</SectionTitle>
          <ul className="lp-problem-list">
            {sol.problems.map((p, i) => (
              <li key={p} data-reveal style={{ transitionDelay: `${(i % 5) * 70}ms` }}>
                <span className="lp-problem-mark"><Icon name="check" size={16} /></span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        {sol.problems_image && (
          <figure className="lp-problems-photo" data-reveal>
            <img src={sol.problems_image} alt="" loading="lazy" />
          </figure>
        )}
      </div>
      <div className="container lp-problems-bridge" data-reveal>
        <span className="lp-bridge-arrow" aria-hidden="true"><LpIcon name="arrow-down" size={22} /></span>
        <p>{L.bridge[0]}<strong>{L.bridge[1]}</strong>{L.bridge[2]}</p>
      </div>
    </section>
  );
}

/* ───────────────────────── 仕組みの図解（ハブ型ダイアグラム） ───────────────────────── */

function SchemeDiagram({ scheme }: { scheme: NonNullable<Solution["scheme"]> }) {
  const nodes = scheme.nodes ?? [];
  const W = 1000, H = 600, cx = W / 2, cy = H / 2;
  const n = nodes.length;
  const rx = 370, ry = 215;
  const pos = nodes.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  return (
    <div className="lp-scheme-diagram" data-reveal>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={scheme.title || ""}>
        <defs>
          <linearGradient id="lp-sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#087fe5" />
            <stop offset="1" stopColor="#0d2338" />
          </linearGradient>
        </defs>
        {pos.map((p, i) => (
          <g key={"l" + i}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} className="lp-scheme-line" />
            <circle cx={(cx + p.x) / 2} cy={(cy + p.y) / 2} r="4" className="lp-scheme-dot" />
          </g>
        ))}
        <g className="lp-scheme-center">
          <circle cx={cx} cy={cy} r="96" fill="url(#lp-sg)" />
          <circle cx={cx} cy={cy} r="110" className="lp-scheme-ring" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="lp-scheme-center-label">{scheme.center?.label || "COANA TOKYO"}</text>
          {scheme.center?.sub && <text x={cx} y={cy + 18} textAnchor="middle" className="lp-scheme-center-sub">{scheme.center.sub}</text>}
        </g>
        {nodes.map((node, i) => {
          const p = pos[i];
          return (
            <g key={node.label} className="lp-scheme-node">
              <rect x={p.x - 122} y={p.y - 50} width="244" height="100" rx="18" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="lp-scheme-node-label">{node.label}</text>
              {node.sub && <text x={p.x} y={p.y + 16} textAnchor="middle" className="lp-scheme-node-sub">{node.sub}</text>}
              {node.sub2 && <text x={p.x} y={p.y + 34} textAnchor="middle" className="lp-scheme-node-sub">{node.sub2}</text>}
            </g>
          );
        })}
      </svg>
      <ul className="lp-scheme-list">
        {nodes.map((node) => (
          <li key={node.label}><strong>{node.label}</strong>{node.sub && <span>{node.sub}{node.sub2 ? ` ${node.sub2}` : ""}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

function SchemeFlow({ scheme }: { scheme: NonNullable<Solution["scheme"]> }) {
  const steps = scheme.nodes ?? [];
  return (
    <ol className="lp-scheme-flow" data-reveal>
      {steps.map((st, i) => (
        <li key={st.label}>
          <span className="lp-scheme-flow-icon"><LpIcon name={st.icon || "check"} size={26} /></span>
          <strong>{st.label}</strong>
          {st.sub && <span>{st.sub}{st.sub2 ? ` ${st.sub2}` : ""}</span>}
          {i < steps.length - 1 && <i className="lp-scheme-flow-arrow" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Scheme({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const scheme = sol.scheme;
  if (!scheme || !(scheme.nodes ?? []).length) return null;
  return (
    <section className="section lp-scheme">
      <div className="container">
        <SectionTitle en="How it works" center lead={scheme.lead}>{scheme.title || L.scheme}</SectionTitle>
        {scheme.type === "flow" ? <SchemeFlow scheme={scheme} /> : <SchemeDiagram scheme={scheme} />}
        {(scheme.points ?? []).length > 0 && (
          <ul className="lp-scheme-points">
            {(scheme.points ?? []).map((p, i) => (
              <li key={p.name} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="lp-scheme-point-icon"><LpIcon name={p.icon || "check"} size={22} /></span>
                <div><h3>{p.name}</h3><p>{p.text}</p></div>
              </li>
            ))}
          </ul>
        )}
        {scheme.note && <p className="lp-note" data-reveal>{scheme.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── Before / After ───────────────────────── */

function Outcomes({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const items = sol.outcomes ?? [];
  if (!items.length) return null;
  return (
    <section className="section lp-outcomes">
      <div className="container">
        <SectionTitle en="Before / After" center lead={sol.outcome_lead}>{sol.outcome_title || L.outcomes}</SectionTitle>
        <div className="lp-outcome-list">
          {items.map((o, i) => (
            <div key={o.label} className="lp-outcome" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
              <p className="lp-outcome-label">{o.label}</p>
              <div className="lp-outcome-cols">
                <div className="lp-outcome-before"><span>{L.before}</span><p>{o.before}</p></div>
                <span className="lp-outcome-arrow" aria-hidden="true"><Icon name="arrow" size={22} /></span>
                <div className="lp-outcome-after"><span>{L.after}</span><p>{o.after}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 支援内容 ───────────────────────── */

function Features({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const tools = sol.tools ?? [];
  return (
    <section className="section lp-features">
      <div className="container">
        <div className="lp-features-head">
          <SectionTitle en="Support" lead={sol.features_lead}>{sol.features_title || L.support}</SectionTitle>
          {sol.features_image && (
            <figure className="lp-features-photo" data-reveal>
              <img src={sol.features_image} alt="" loading="lazy" />
            </figure>
          )}
        </div>
        <div className="lp-feature-grid">
          {sol.features.map((f, i) => (
            <article key={f.name} className="lp-feature" data-reveal style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
              <div className="lp-feature-top">
                <span className="lp-feature-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lp-feature-icon"><LpIcon name={f.icon} size={26} /></span>
              </div>
              <h3>{f.name}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        {tools.length > 0 && (
          <div className="lp-tools" data-reveal>
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

/* ───────────────────────── 依頼できる業務一覧 ───────────────────────── */

function Scope({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const scope = sol.scope;
  if (!scope || !(scope.groups ?? []).length) return null;
  return (
    <section className="section lp-scope">
      <div className="container">
        <SectionTitle en="Scope of work" center lead={scope.lead}>{scope.title || L.scope}</SectionTitle>
        <div className="lp-scope-grid">
          {(scope.groups ?? []).map((g, i) => (
            <article key={g.name} className="lp-scope-card" data-reveal style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
              <h3><span className="lp-scope-icon"><LpIcon name={g.icon || "check"} size={22} /></span>{g.name}</h3>
              <ul>
                {(g.items ?? []).map((it) => <li key={it}>{it}</li>)}
              </ul>
            </article>
          ))}
        </div>
        {scope.note && <p className="lp-note lp-note-legal" data-reveal>{scope.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 一般的なサービスとの違い ───────────────────────── */

function Compare({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const cmp = sol.compare;
  if (!cmp || !(cmp.rows ?? []).length) return null;
  return (
    <section className="section lp-compare">
      <div className="container">
        <SectionTitle en="Difference" center lead={cmp.lead}>{cmp.title || L.compare}</SectionTitle>
        <div className="lp-compare-table" data-reveal role="table">
          <div className="lp-compare-head" role="row">
            <span role="columnheader" />
            <span role="columnheader" className="is-ours">{cmp.ours_label || L.compareOurs}</span>
            <span role="columnheader">{cmp.others_label || L.compareOthers}</span>
          </div>
          {(cmp.rows ?? []).map((r) => (
            <div key={r.label} className="lp-compare-row" role="row">
              <span className="lp-compare-label" role="rowheader">{r.label}</span>
              <span className="lp-compare-ours" role="cell"><Icon name="check" size={18} />{r.ours}</span>
              <span className="lp-compare-others" role="cell">{r.others}</span>
            </div>
          ))}
        </div>
        {cmp.note && <p className="lp-note" data-reveal>{cmp.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── プラン例 ───────────────────────── */

function Plans({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const plans = sol.plans;
  if (!plans || !(plans.items ?? []).length) return null;
  return (
    <section className="section lp-plans">
      <div className="container">
        <SectionTitle en="Plans" center lead={plans.lead}>{plans.title || L.plans}</SectionTitle>
        <div className="lp-plan-grid">
          {(plans.items ?? []).map((p, i) => (
            <article key={p.name} className={p.featured ? "lp-plan is-featured" : "lp-plan"} data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
              {p.tag && <span className="lp-plan-tag">{p.tag}</span>}
              <h3>{p.name}</h3>
              {p.text && <p className="lp-plan-text">{p.text}</p>}
              {(p.includes ?? []).length > 0 && (
                <ul>
                  {(p.includes ?? []).map((it) => <li key={it}><Icon name="check" size={15} />{it}</li>)}
                </ul>
              )}
              {p.best_for && <p className="lp-plan-for"><span>{langOf(sol) === "en" ? "Best for" : "こんな方に"}</span>{p.best_for}</p>}
            </article>
          ))}
        </div>
        <p className="lp-note lp-plan-note" data-reveal>{plans.note || L.plansNote}</p>
      </div>
    </section>
  );
}

/* ───────────────────────── 選ばれる理由 ───────────────────────── */

function Reasons({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const items = sol.reasons ?? [];
  if (!items.length) return null;
  return (
    <section className="section lp-reasons">
      <div className="container">
        <SectionTitle en="Why COANA TOKYO" center>{sol.reasons_title || L.reasons}</SectionTitle>
        <div className="lp-reason-grid">
          {items.map((r, i) => (
            <article key={r.name} className="lp-reason" data-reveal style={{ transitionDelay: `${i * 110}ms` }}>
              {r.image && <div className="lp-reason-photo"><img src={r.image} alt="" loading="lazy" /></div>}
              <div className="lp-reason-body">
                <span className="lp-reason-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{r.name}</h3>
                <p>{r.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── ご利用イメージ ───────────────────────── */

function Scenarios({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  const sc = sol.scenarios;
  if (!sc || !(sc.items ?? []).length) return null;
  return (
    <section className="section lp-scenarios">
      <div className="container">
        <SectionTitle en="Use cases" center lead={sc.lead}>{sc.title || L.scenarios}</SectionTitle>
        <div className="lp-scenario-grid">
          {(sc.items ?? []).map((it, i) => (
            <article key={it.name} className="lp-scenario" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              {it.image && <div className="lp-scenario-photo"><img src={it.image} alt="" loading="lazy" /></div>}
              <div className="lp-scenario-body">
                {it.tag && <span className="lp-scenario-tag">{it.tag}</span>}
                <h3>{it.name}</h3>
                {it.before && <p className="lp-scenario-before"><span>{L.before}</span>{it.before}</p>}
                <p className="lp-scenario-after"><span>{L.after}</span>{it.text}</p>
              </div>
            </article>
          ))}
        </div>
        {sc.note && <p className="lp-note" data-reveal>{sc.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 進め方 ───────────────────────── */

function Flow({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  const steps: { name: string; text?: string }[] = (sol.flow ?? []).length
    ? (sol.flow ?? [])
    : sol.steps.map((s) => ({ name: s }));
  return (
    <section className="section lp-flow">
      <div className="container">
        <SectionTitle en="Flow" center>{sol.steps_title || L.flow}</SectionTitle>
        <ol className={steps.length >= 5 ? "lp-flow-list is-five" : "lp-flow-list"}>
          {steps.map((s, i) => (
            <li key={s.name} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="lp-flow-num"><small>{L.step}</small>{i + 1}</span>
              <div>
                <h3>{s.name}</h3>
                {s.text && <p>{s.text}</p>}
              </div>
            </li>
          ))}
        </ol>
        {sol.flow_note && <p className="lp-flow-note" data-reveal>{sol.flow_note}</p>}
        <div className="lp-cta-row" data-reveal>
          <GoLink className="button button-large lp-button-primary" go={navigate} args={["contact"]}>
            {L.flowCta}<Icon name="arrow" size={19} />
          </GoLink>
          <LineButton place="solution_flow" label={L.consultLine} />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 代表メッセージ ───────────────────────── */

function Message({ sol }: { sol: Solution }) {
  const L = LABELS[langOf(sol)];
  if (!sol.message) return null;
  return (
    <section className="section lp-message">
      <div className="container lp-message-inner">
        <figure className="lp-message-photo" data-reveal>
          <img src="/images/representative-shota-ibato.jpg" alt="COANA TOKYO 代表 衣鳩 翔太" loading="lazy" />
        </figure>
        <div className="lp-message-copy" data-reveal>
          <span className="eyebrow">Message</span>
          <h2>{sol.message_title || L.message}</h2>
          <div className="lp-message-text"><Lines text={sol.message} /></div>
          <p className="lp-message-name"><small>{settings.company_name} {L.rep}</small>{langOf(sol) === "en" ? "Shota Ibato" : "衣鳩 翔太"}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 英語ページへの案内（創業支援） ───────────────────────── */

function EnglishBand({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const e = sol.english;
  if (!e || !e.slug) return null;
  return (
    <section className="lp-english">
      <div className="container lp-english-inner" data-reveal>
        <div className="lp-english-copy">
          <span className="lp-english-badge"><LpIcon name="globe" size={18} />English support</span>
          <h2>{e.title}</h2>
          <p><Lines text={e.text} /></p>
        </div>
        <GoLink className="button button-large" go={navigate} args={["solution", undefined, e.slug]}>
          {e.button || "English page"}<Icon name="arrow" size={19} />
        </GoLink>
      </div>
    </section>
  );
}

/* ───────────────────────── お問い合わせ帯 ───────────────────────── */

function CtaBand({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const L = LABELS[langOf(sol)];
  return (
    <section className="lp-cta-band">
      <div className="lp-cta-orbit" aria-hidden="true" />
      <div className="container lp-cta-inner" data-reveal>
        <span className="eyebrow">Contact</span>
        <h2>{sol.cta_title || L.ctaTitle}</h2>
        <p><Lines text={sol.cta_text || L.ctaText} /></p>
        <div className="lp-cta-actions">
          <GoLink className="button button-large" go={navigate} args={["contact"]}>
            {L.ctaButton}<Icon name="arrow" size={19} />
          </GoLink>
          <LineButton place="solution_cta" label={L.consultLine} />
        </div>
        <a className="lp-cta-mail" href={`mailto:${settings.email}`}><Icon name="mail" size={16} />{settings.email}</a>
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
  return (
    <div className={show ? "lp-sticky show" : "lp-sticky"} aria-hidden={!show}>
      <GoLink className="lp-sticky-main" go={navigate} args={["contact"]} tabIndex={show ? 0 : -1}>
        {L.sticky}<Icon name="arrow" size={17} />
      </GoLink>
      <LineButton place="solution_sticky" label="LINE" />
    </div>
  );
}

/* ───────────────────────── ページ本体 ───────────────────────── */

export function SolutionPage({ navigate }: { navigate: Nav }) {
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/services\//, "").replace(/\/+$/, ""));
  const sol = solutions.find((s) => s.slug === slug);
  useEffect(() => {
    if (sol) document.title = `${sol.seo_title || sol.title} | COANA TOKYO合同会社`;
  }, [sol]);
  useEffect(() => {
    const lang = sol?.lang === "en" ? "en" : "ja";
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => { document.documentElement.lang = prev || "ja"; };
  }, [sol]);
  if (!sol) return <NotFound navigate={navigate} />;
  const L = LABELS[langOf(sol)];
  const related = (sol.related ?? [])
    .map((r) => articles.find((a) => a.slug === r))
    .filter((a): a is Article => Boolean(a));
  const others = solutions.filter((s) => s.slug !== sol.slug && !s.hidden);
  return (
    <main className={`solution-page lp lp-lang-${langOf(sol)}`}>
      <Hero sol={sol} navigate={navigate} />
      <Target sol={sol} />
      <Problems sol={sol} />
      <Scheme sol={sol} />
      <Outcomes sol={sol} />
      <Features sol={sol} />
      <Scope sol={sol} />
      <Compare sol={sol} />
      <Plans sol={sol} />
      <Reasons sol={sol} />
      <Scenarios sol={sol} />
      <Flow sol={sol} navigate={navigate} />
      <Message sol={sol} />
      <EnglishBand sol={sol} navigate={navigate} />
      {(sol.faqs ?? []).length > 0 && <FaqSection items={sol.faqs} title={sol.faq_title || L.faq} />}
      {related.length > 0 && (
        <section className="section solution-related">
          <div className="container narrow">
            <SectionTitle en="Column">{L.column}</SectionTitle>
            <div className="article-list">
              {related.map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
            </div>
          </div>
        </section>
      )}
      <CtaBand sol={sol} navigate={navigate} />
      <section className="section solution-others">
        <div className="container">
          <SectionTitle en="Services">{L.others}</SectionTitle>
          <div className="solution-other-list">
            {others.map((o) => (
              <GoLink key={o.slug} className="solution-other" go={navigate} args={["solution", undefined, o.slug]}>
                <span>{o.nav_label}</span>
                <Icon name="arrow" size={18} />
              </GoLink>
            ))}
            <GoLink className="solution-other" go={navigate} args={["services"]}>
              <span>{L.allServices}</span>
              <Icon name="arrow" size={18} />
            </GoLink>
          </div>
        </div>
      </section>
      <StickyCta sol={sol} navigate={navigate} />
    </main>
  );
}
