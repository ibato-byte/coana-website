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

function Certifications() {
  return (
    <div className="lp-cert" aria-label="保有資格・認定">
      <img src="/images/accounting-certifications.png" alt="freee認定アドバイザー・マネーフォワード クラウド公認メンバー" loading="lazy" />
      <p>freee認定アドバイザー／<br />マネーフォワード クラウド公認メンバー</p>
    </div>
  );
}

function Hero({ sol, navigate }: { sol: Solution; navigate: Nav }) {
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
              無料で相談する<Icon name="arrow" size={19} />
            </GoLink>
            <LineButton place="solution_hero" label="LINEで気軽に相談" />
          </div>
          <p className="lp-hero-note">相談・お見積もりは無料。全国オンライン対応。</p>
        </div>
        {sol.show_certifications && (
          <div className="lp-hero-side">
            <Certifications />
          </div>
        )}
      </div>
      <a className="lp-hero-scroll" href="#lp-target" aria-label="下へスクロール"><LpIcon name="arrow-down" size={18} /></a>
    </section>
  );
}

function Target({ sol }: { sol: Solution }) {
  const items = sol.target ?? [];
  if (!items.length) return null;
  return (
    <section id="lp-target" className="section lp-target">
      <div className="container">
        <SectionTitle en="For you" center>{sol.target_title || "こんな方におすすめです"}</SectionTitle>
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

function Problems({ sol }: { sol: Solution }) {
  return (
    <section className="section lp-problems">
      <div className="container lp-problems-inner">
        <div className="lp-problems-copy">
          <SectionTitle en="Problems">{sol.problems_title || "こんなお悩みはありませんか"}</SectionTitle>
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
        <p>そのお悩み、<strong>COANA TOKYO</strong>が仕組みから解決します。</p>
      </div>
    </section>
  );
}

function Outcomes({ sol }: { sol: Solution }) {
  const items = sol.outcomes ?? [];
  if (!items.length) return null;
  return (
    <section className="section lp-outcomes">
      <div className="container">
        <SectionTitle en="Before / After" center lead={sol.outcome_lead}>{sol.outcome_title || "支援後に、こう変わります"}</SectionTitle>
        <div className="lp-outcome-list">
          {items.map((o, i) => (
            <div key={o.label} className="lp-outcome" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
              <p className="lp-outcome-label">{o.label}</p>
              <div className="lp-outcome-cols">
                <div className="lp-outcome-before"><span>Before</span><p>{o.before}</p></div>
                <span className="lp-outcome-arrow" aria-hidden="true"><Icon name="arrow" size={22} /></span>
                <div className="lp-outcome-after"><span>After</span><p>{o.after}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features({ sol }: { sol: Solution }) {
  const tools = sol.tools ?? [];
  return (
    <section className="section lp-features">
      <div className="container">
        <div className="lp-features-head">
          <SectionTitle en="Support" lead={sol.features_lead}>{sol.features_title || "支援内容"}</SectionTitle>
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
            <p className="lp-tools-title">{sol.tools_title || "対応ツールの例"}</p>
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
            {home.tools_note && <small>{home.tools_note}</small>}
          </div>
        )}
      </div>
    </section>
  );
}

function Reasons({ sol }: { sol: Solution }) {
  const items = sol.reasons ?? [];
  if (!items.length) return null;
  return (
    <section className="section lp-reasons">
      <div className="container">
        <SectionTitle en="Why COANA TOKYO" center>{sol.reasons_title || "COANA TOKYOが選ばれる理由"}</SectionTitle>
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

function Flow({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  const steps: { name: string; text?: string }[] = (sol.flow ?? []).length
    ? (sol.flow ?? [])
    : sol.steps.map((s) => ({ name: s }));
  return (
    <section className="section lp-flow">
      <div className="container">
        <SectionTitle en="Flow" center>{sol.steps_title || "支援の進め方"}</SectionTitle>
        <ol className="lp-flow-list">
          {steps.map((s, i) => (
            <li key={s.name} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="lp-flow-num"><small>STEP</small>{i + 1}</span>
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
            まずは無料で相談する<Icon name="arrow" size={19} />
          </GoLink>
          <LineButton place="solution_flow" />
        </div>
      </div>
    </section>
  );
}

function Message({ sol }: { sol: Solution }) {
  if (!sol.message) return null;
  return (
    <section className="section lp-message">
      <div className="container lp-message-inner">
        <figure className="lp-message-photo" data-reveal>
          <img src="/images/representative-shota-ibato.jpg" alt="COANA TOKYO 代表 衣鳩 翔太" loading="lazy" />
        </figure>
        <div className="lp-message-copy" data-reveal>
          <span className="eyebrow">Message</span>
          <h2>{sol.message_title || "代表からのメッセージ"}</h2>
          <div className="lp-message-text"><Lines text={sol.message} /></div>
          <p className="lp-message-name"><small>{settings.company_name} 代表</small>衣鳩 翔太</p>
          {sol.show_certifications && <Certifications />}
        </div>
      </div>
    </section>
  );
}

function CtaBand({ sol, navigate }: { sol: Solution; navigate: Nav }) {
  return (
    <section className="lp-cta-band">
      <div className="lp-cta-orbit" aria-hidden="true" />
      <div className="container lp-cta-inner" data-reveal>
        <span className="eyebrow">Contact</span>
        <h2>{sol.cta_title || "まずは、現状をお聞かせください。"}</h2>
        <p><Lines text={sol.cta_text || "ご相談・お見積もりは無料です。\n「何から相談すればいいか分からない」という段階でも、一緒に整理するところから始めます。"} /></p>
        <div className="lp-cta-actions">
          <GoLink className="button button-large" go={navigate} args={["contact"]}>
            無料相談・お問い合わせ<Icon name="arrow" size={19} />
          </GoLink>
          <LineButton place="solution_cta" />
        </div>
        <a className="lp-cta-mail" href={`mailto:${settings.email}`}><Icon name="mail" size={16} />{settings.email}</a>
      </div>
    </section>
  );
}

function StickyCta({ navigate }: { navigate: Nav }) {
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
        無料で相談する<Icon name="arrow" size={17} />
      </GoLink>
      <LineButton place="solution_sticky" label="LINE" />
    </div>
  );
}

export function SolutionPage({ navigate }: { navigate: Nav }) {
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/services\//, "").replace(/\/+$/, ""));
  const sol = solutions.find((s) => s.slug === slug);
  useEffect(() => {
    if (sol) document.title = `${sol.seo_title || sol.title} | COANA TOKYO合同会社`;
  }, [sol]);
  if (!sol) return <NotFound navigate={navigate} />;
  const related = (sol.related ?? [])
    .map((r) => articles.find((a) => a.slug === r))
    .filter((a): a is Article => Boolean(a));
  const others = solutions.filter((s) => s.slug !== sol.slug);
  return (
    <main className="solution-page lp">
      <Hero sol={sol} navigate={navigate} />
      <Target sol={sol} />
      <Problems sol={sol} />
      <Outcomes sol={sol} />
      <Features sol={sol} />
      <Reasons sol={sol} />
      <Flow sol={sol} navigate={navigate} />
      <Message sol={sol} />
      {(sol.faqs ?? []).length > 0 && <FaqSection items={sol.faqs} title={sol.faq_title || "よくあるご質問"} />}
      {related.length > 0 && (
        <section className="section solution-related">
          <div className="container narrow">
            <SectionTitle en="Column">関連するコラム</SectionTitle>
            <div className="article-list">
              {related.map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
            </div>
          </div>
        </section>
      )}
      <CtaBand sol={sol} navigate={navigate} />
      <section className="section solution-others">
        <div className="container">
          <SectionTitle en="Services">そのほかのサービス</SectionTitle>
          <div className="solution-other-list">
            {others.map((o) => (
              <GoLink key={o.slug} className="solution-other" go={navigate} args={["solution", undefined, o.slug]}>
                <span>{o.nav_label}</span>
                <Icon name="arrow" size={18} />
              </GoLink>
            ))}
            <GoLink className="solution-other" go={navigate} args={["services"]}>
              <span>サービス一覧を見る</span>
              <Icon name="arrow" size={18} />
            </GoLink>
          </div>
        </div>
      </section>
      <StickyCta navigate={navigate} />
    </main>
  );
}
