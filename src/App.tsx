import React, { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { about, articles, CATEGORIES, home, privacy, renderMarkdown, services, settings, type Article } from "./content";

type Nav = (page: Page, hash?: string, slug?: string) => void;

type Page =
  | "home"
  | "about"
  | "services"
  | "topics"
  | "article"
  | "contact"
  | "privacy";

const paths: Record<Exclude<Page, "article">, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  topics: "/topics",
  contact: "/contact",
  privacy: "/privacy",
};

function pageFromPath(): Page {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/topics/")) return "article";
  if (path === "/about") return "about";
  if (path === "/services") return "services";
  if (path === "/topics") return "topics";
  if (path === "/contact") return "contact";
  if (path === "/privacy") return "privacy";
  return "home";
}

function slugFromPath() {
  return decodeURIComponent(window.location.pathname.replace(/^\/topics\//, "").replace(/\/+$/, ""));
}

function Lines({ text }: { text: string }) {
  const parts = (text || "").split("\n");
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <br />}</span>)}</>;
}

function Icon({
  name,
  size = 24,
}: {
  name: "arrow" | "menu" | "close" | "chat" | "layers" | "spark" | "check";
  size?: number;
}) {
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
  if (name === "menu")
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  if (name === "close")
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common}>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    );
  if (name === "chat")
    return (
      <svg {...common}>
        <path d="M20 14a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  if (name === "layers")
    return (
      <svg {...common}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </svg>
    );
  if (name === "spark")
    return (
      <svg {...common}>
        <path d="M12 2c.6 5.1 2.9 7.4 8 8-5.1.6-7.4 2.9-8 8-.6-5.1-2.9-7.4-8-8 5.1-.6 7.4-2.9 8-8Z" />
        <path d="M19 17c.2 1.9 1.1 2.8 3 3-1.9.2-2.8 1.1-3 3-.2-1.9-1.1-2.8-3-3 1.9-.2 2.8-1.1 3-3Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function Logo({ navigate }: { navigate: Nav }) {
  return (
    <button className="wordmark" onClick={() => navigate("home")} aria-label="ホームへ">
      <span className="logo-mark">
        <span />
        <span />
      </span>
      <span>COANA TOKYO</span>
    </button>
  );
}

function Header({
  page,
  navigate,
}: {
  page: Page;
  navigate: Nav;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links: [Page, string][] = [
    ["home", "ホーム"],
    ["about", "会社概要"],
    ["services", "サービス"],
    ["topics", "トピックス"],
  ];
  const go = (target: Page) => {
    setOpen(false);
    navigate(target);
  };
  return (
    <header className={scrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="scroll-progress" ref={progressRef} aria-hidden="true" />
      <div className="header-inner">
        <Logo navigate={navigate} />
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          {links.map(([target, label]) => (
            <button
              key={target}
              className={page === target ? "nav-link active" : "nav-link"}
              onClick={() => go(target)}
            >
              {label}
            </button>
          ))}
          <button className="button button-small" onClick={() => go("contact")}>
            お問い合わせ
            <Icon name="arrow" size={18} />
          </button>
        </nav>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="モバイルナビゲーション">
          {links.map(([target, label]) => (
            <button key={target} onClick={() => go(target)}>
              {label}<Icon name="arrow" size={18} />
            </button>
          ))}
          <button onClick={() => go("contact")}>
            お問い合わせ<Icon name="arrow" size={18} />
          </button>
        </nav>
      )}
    </header>
  );
}

function Footer({ navigate }: { navigate: Nav }) {
  return (
    <footer className="site-footer">
      <div className="footer-shape" />
      <div className="container footer-grid">
        <div className="footer-company">
          <Logo navigate={navigate} />
          <p>{settings.company_name}</p>
          <p>{settings.postal_code}<br />{settings.address}</p>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </div>
        <div className="footer-links">
          <div>
            <button onClick={() => navigate("home")}>ホーム</button>
            <button onClick={() => navigate("about")}>会社概要</button>
            <button onClick={() => navigate("services")}>サービス</button>
          </div>
          <div>
            <button onClick={() => navigate("topics")}>トピックス</button>
            <button onClick={() => navigate("contact")}>お問い合わせ</button>
            <button onClick={() => navigate("privacy")}>プライバシーポリシー</button>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>{settings.footer_tagline}</p>
        <small>{settings.copyright}</small>
      </div>
    </footer>
  );
}

function SectionTitle({
  en,
  children,
  center = false,
}: {
  en: string;
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={center ? "section-title center" : "section-title"}>
      <span>{en}</span>
      <h2>{children}</h2>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="hero-art" aria-label="人と仕事の仕組みがつながり、成長していく様子を表したイラスト">
      <div className="art-sun" />
      <svg viewBox="0 0 600 500" role="img">
        <path className="art-path" d="M78 350C160 350 137 220 225 220s63 135 150 135 77-137 153-137" />
        <circle className="art-node blue" cx="79" cy="350" r="13" />
        <circle className="art-node yellow" cx="225" cy="220" r="13" />
        <circle className="art-node blue" cx="375" cy="355" r="13" />
        <rect className="art-card back" x="174" y="107" width="245" height="245" rx="38" />
        <rect className="art-card front" x="196" y="84" width="245" height="245" rx="38" />
        <circle className="art-person-head" cx="319" cy="151" r="34" />
        <path className="art-person" d="M247 273c8-53 34-79 72-79s64 26 72 79" />
        <path className="art-check" d="m288 246 22 22 45-51" />
        <path className="art-leaf" d="M435 107c43-41 83-24 83-24s8 41-38 68c-20 12-43 8-43 8s-11-31-2-52Z" />
        <path className="art-leaf-line" d="m442 153 53-50" />
        <path className="art-spark" d="M164 124c3 23 13 33 36 36-23 3-33 13-36 36-3-23-13-33-36-36 23-3 33-13 36-36Z" />
      </svg>
      <div className="art-label label-one"><Icon name="check" size={17} />業務を整える</div>
      <div className="art-label label-two"><Icon name="spark" size={17} />成長につなげる</div>
    </div>
  );
}

function LinkButton({
  children,
  onClick,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button className={secondary ? "button button-outline" : "button"} onClick={onClick}>
      {children}<Icon name="arrow" size={19} />
    </button>
  );
}

function ContactBand({ navigate }: { navigate: Nav }) {
  return (
    <section className="contact-band">
      <div className="contact-orbit orbit-one" />
      <div className="contact-orbit orbit-two" />
      <div className="container contact-band-inner">
        <div>
          <span className="eyebrow">Contact</span>
          <h2>{settings.contact_band.heading.includes("、") ? <>{settings.contact_band.heading.split("、")[0]}、<br className="mobile-break" />{settings.contact_band.heading.split("、").slice(1).join("、")}</> : settings.contact_band.heading}</h2>
          <p><Lines text={settings.contact_band.text} /></p>
        </div>
        <LinkButton onClick={() => navigate("contact")}>お問い合わせ</LinkButton>
      </div>
    </section>
  );
}

type StrengthTab = {
  title: string;
  heading: string;
  description: string;
  challenges: string[];
  services: string[];
  illustration: string;
};

const strengthTabs: (StrengthTab & { id: string; number: string })[] = (home.strengths as StrengthTab[]).map((item, i) => ({
  ...item,
  id: `s${i + 1}`,
  number: String(i + 1).padStart(2, "0"),
}));

function StrengthIllustration({ type }: { type: string }) {
  return (
    <div className="strength-illustration" aria-hidden="true">
      <svg viewBox="0 0 320 300">
        {type === "expertise" && (
          <>
            <rect x="45" y="79" width="165" height="112" rx="9" />
            <path d="M28 211h199l-17-20H45l-17 20Z" />
            <rect className="soft-fill" x="72" y="101" width="111" height="67" rx="4" />
            <path d="M90 143h21l10-22 17 32 12-20h17" />
            <path className="yellow-fill" d="M212 53h62v82h-62z" />
            <path d="M226 75h34M226 91h34M226 107h23" />
            <circle cx="242" cy="190" r="36" />
            <circle className="soft-fill" cx="242" cy="190" r="16" />
            <path d="M242 142v13M242 225v13M194 190h13M277 190h13M208 156l9 9M267 215l9 9M276 156l-9 9M217 215l-9 9" />
          </>
        )}
        {type === "team" && (
          <>
            <circle className="yellow-fill" cx="95" cy="81" r="25" />
            <circle className="soft-fill" cx="160" cy="62" r="28" />
            <circle className="yellow-fill" cx="225" cy="81" r="25" />
            <path d="M48 174c4-42 20-65 47-65s43 23 47 65M178 174c4-42 20-65 47-65s43 23 47 65M106 166c5-50 23-77 54-77s49 27 54 77" />
            <path className="soft-fill" d="M114 191h43v-16c0-8 6-14 14-14s14 6 14 14v16h39v39h-16c-8 0-14 6-14 14s6 14 14 14h16v18H114v-34h16c8 0 14-6 14-14s-6-14-14-14h-16v-23Z" />
          </>
        )}
        {type === "one-stop" && (
          <>
            <circle className="soft-fill" cx="160" cy="154" r="48" />
            <circle cx="160" cy="154" r="20" />
            <path d="M160 106V65M112 154H72M208 154h40M126 188l-31 31M194 188l31 31" />
            <rect className="yellow-fill" x="125" y="28" width="70" height="43" rx="5" />
            <path d="M140 42h40M140 55h25" />
            <rect className="soft-fill" x="20" y="128" width="57" height="52" rx="6" />
            <path d="m34 164 14-13 10 8 8-18" />
            <path className="yellow-fill" d="M246 127h49v49h-49z" />
            <path d="M257 163v-22h11v22M275 163v-32h11v32" />
            <rect className="soft-fill" x="55" y="215" width="68" height="48" rx="6" />
            <path d="M69 229h40M69 241h28" />
            <path className="yellow-fill" d="M213 220h66v39h-66z" />
            <path d="m229 252 7-19 9 10 9-16 9 25" />
          </>
        )}
        {type === "flexible" && (
          <>
            <path d="M37 238h246" />
            <rect className="soft-fill" x="48" y="163" width="67" height="73" rx="7" />
            <rect className="yellow-fill" x="126" y="111" width="67" height="125" rx="7" />
            <rect className="soft-fill" x="204" y="64" width="67" height="172" rx="7" />
            <path d="M67 185h29M67 201h20M145 135h29M145 151h20M223 89h29M223 105h20" />
            <path d="m68 142 26-28 20 14 41-48 31 18 45-52" />
            <circle className="yellow-fill" cx="68" cy="142" r="7" />
            <circle className="soft-fill" cx="155" cy="80" r="7" />
            <circle className="yellow-fill" cx="231" cy="46" r="7" />
          </>
        )}
      </svg>
    </div>
  );
}

function StrengthsTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = strengthTabs[activeIndex];

  const selectTab = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % strengthTabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + strengthTabs.length) % strengthTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = strengthTabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(nextIndex);
  };

  return (
    <div className="strengths-tabs">
      <div className="strength-tab-list" role="tablist" aria-label="COANA TOKYOが選ばれる理由">
        {strengthTabs.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { tabRefs.current[index] = element; }}
            id={`strength-tab-${item.id}`}
            className={activeIndex === index ? "strength-tab active" : "strength-tab"}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`strength-panel-${item.id}`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="strength-tab-number">{item.number}</span>
            <span className="strength-tab-label">{item.title}</span>
          </button>
        ))}
      </div>

      <div
        key={active.id}
        id={`strength-panel-${active.id}`}
        className="strength-tab-panel"
        role="tabpanel"
        aria-labelledby={`strength-tab-${active.id}`}
        tabIndex={0}
      >
        <div className="strength-panel-copy">
          <h3>{active.heading}</h3>
          <p className="strength-description">{active.description}</p>
          <div className="strength-divider" />
          <h4>企業を取り巻く課題</h4>
          <ul className="challenge-list">
            {active.challenges.map((challenge) => (
              <li key={challenge}>
                <span className="person-icon" aria-hidden="true"><i /><i /></span>
                <span>{challenge}</span>
              </li>
            ))}
          </ul>
          <h4>対応サービスの例</h4>
          <ul className="strength-service-list">
            {active.services.map((service) => (
              <li key={service}><span aria-hidden="true"><Icon name="check" size={16} /></span>{service}</li>
            ))}
          </ul>
        </div>
        <StrengthIllustration type={active.illustration} />
      </div>
    </div>
  );
}

function HeroSection({ navigate }: { navigate: Nav }) {
  const ref = useRef<HTMLElement | null>(null);
  const words: string[] = (home as { hero_words?: string[] }).hero_words ?? ["経理", "業務フロー", "ERP", "営業・集客"];
  const [wordIndex, setWordIndex] = useState(0);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [boxWidth, setBoxWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = wordRefs.current[wordIndex];
    if (el) setBoxWidth(el.offsetWidth);
  }, [wordIndex]);
  useEffect(() => {
    const id = window.setInterval(() => setWordIndex((i) => (i + 1) % words.length), 2600);
    return () => window.clearInterval(id);
  }, [words.length]);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
        el.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
      });
    };
    const onScroll = () => el.style.setProperty("--sy", String(Math.min(window.scrollY, 900)));
    el.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section className="hero" ref={ref}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-glow" aria-hidden="true" />
      <svg className="hero-network" viewBox="0 0 800 600" aria-hidden="true">
        <path className="net-line" d="M80 470 C 220 380, 260 300, 400 300 S 600 160, 740 110" />
        <path className="net-line l2" d="M120 140 C 260 200, 330 420, 470 430 S 660 380, 760 470" />
        <path className="net-line l3" d="M60 300 C 200 260, 300 120, 430 150 S 650 300, 780 260" />
        <circle className="net-node" cx="400" cy="300" r="6" />
        <circle className="net-node n2" cx="470" cy="430" r="5" />
        <circle className="net-node n3" cx="430" cy="150" r="5" />
        <circle className="net-node n4" cx="740" cy="110" r="6" />
        <circle className="net-node n5" cx="760" cy="470" r="5" />
      </svg>
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker hero-anim" style={{ animationDelay: "0.1s" }}><span />BACK OFFICE × MARKETING</p>
          <h1 className="hero-title-marker">
            <span className="hero-line" style={{ animationDelay: "0.25s" }}>{home.hero_line1}</span>
            <span className="hero-line" style={{ animationDelay: "0.45s" }}>{home.hero_line2}</span>
          </h1>
          <p className="hero-rotator hero-anim" style={{ animationDelay: "0.75s" }}>
            <span className="rotator-box" aria-live="polite" style={boxWidth ? { width: boxWidth } : undefined}>
              {words.map((w, i) => (
                <span key={w} ref={(el) => { wordRefs.current[i] = el; }} className={i === wordIndex ? "rotator-word is-active" : i === (wordIndex + words.length - 1) % words.length ? "rotator-word is-leaving" : "rotator-word"}>{w}</span>
              ))}
            </span>
            <span className="rotator-rest">の悩みを、仕組みで解決。</span>
          </p>
          <div className="button-row hero-anim" style={{ animationDelay: "0.95s" }}>
            <LinkButton onClick={() => navigate("contact")}>まずは相談してみる</LinkButton>
            <LinkButton secondary onClick={() => navigate("services")}>サービスを見る</LinkButton>
          </div>
        </div>
        <div className="hero-cards" aria-hidden="true">
          <div className="hero-card c1"><b>01</b><span>経理 × IT</span><small>業務フローから再設計</small></div>
          <div className="hero-card c2"><b>02</b><span>クラウド導入</span><small>会計・ERP・グループウェア</small></div>
          <div className="hero-card c3"><b>03</b><span>集客・営業</span><small>成長につながる仕組みへ</small></div>
        </div>
      </div>
      <div className="hero-tools hero-anim" style={{ animationDelay: "1.2s" }}>
        <span className="hero-tools-label">導入支援ツール</span>
        <ul>
          {home.tools.map((t) => <li key={t.name}><img src={t.logo} alt={t.name} /></li>)}
        </ul>
      </div>
      <div className="hero-scroll" aria-hidden="true"><span>SCROLL</span><i /></div>
    </section>
  );
}

function Home({ navigate }: { navigate: Nav }) {
  return (
    <>
      <main>
        <HeroSection navigate={navigate} />

        <section className="section about-intro">
          <div className="container about-grid">
            <SectionTitle en="About us">{home.about_title}</SectionTitle>
            <div className="about-content">
              <div className="about-copy">
                <p>{home.about_text}</p>
                <ul className="tool-logo-row" aria-label="導入支援に対応しているツール">
                  {home.tools.map((t) => (
                    <li key={t.name}><img src={t.logo} alt={t.name} loading="lazy" /></li>
                  ))}
                </ul>
              </div>
              <figure className="about-image">
                <img src="/images/about-backoffice.jpg" alt="オフィスで打ち合わせをするビジネスパーソン" />
              </figure>
            </div>
          </div>
        </section>

        <section className="section tools-section">
          <div className="container">
            <div className="tools-head">
              <SectionTitle en="Tools">{home.tools_title}</SectionTitle>
              <p>{home.tools_text}</p>
            </div>
            <div className="tools-grid">
              {home.tools.map((t, i) => (
                <article className="tool-card" key={t.name} style={{ ["--i" as string]: i } as React.CSSProperties}>
                  <div className="tool-logo"><img src={t.logo} alt={t.name} loading="lazy" /></div>
                  <p className="tool-category">{t.category}</p>
                  <h3>{t.name}</h3>
                  <p>{t.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((k) => (
              <span key={k}>BACK OFFICE <i /> MARKETING <i /> CLOUD DX <i /> ERP <i /> GROWTH <i /> </span>
            ))}
          </div>
        </div>

        <section className="section strengths-section">
          <div className="container">
            <SectionTitle en="Our strengths" center>COANA TOKYOが選ばれる理由</SectionTitle>
            <StrengthsTabs />
          </div>
        </section>

        <section className="section services-home">
          <div className="container">
            <SectionTitle en="Services">サービス</SectionTitle>
            <div className="service-home-grid">
              <article className="service-panel blue-panel">
                <div className="service-panel-top"><span>01</span></div>
                <p className="service-en">{services.backoffice.en}</p>
                <h3>{services.backoffice.title}</h3>
                <p className="service-tagline"><Tagline text={services.backoffice.lead} /></p>
                <ul>{(services.backoffice.items as { name: string; tags?: string[] }[]).map((i) => <li key={i.name}>{i.name}{i.tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}</li>)}</ul>
                <button className="circle-link" onClick={() => navigate("services", "backoffice")} aria-label="バックオフィス支援を見る"><span>詳しく見る</span><Icon name="arrow" /></button>
              </article>
              <article className="service-panel yellow-panel">
                <div className="service-panel-top"><span>02</span></div>
                <p className="service-en">{services.marketing.en}</p>
                <h3>{services.marketing.title}</h3>
                <p className="service-tagline"><Tagline text={services.marketing.lead} /></p>
                <ul>{services.marketing.items.map((i) => <li key={i.name}>{i.name}</li>)}</ul>
                <button className="circle-link" onClick={() => navigate("services", "marketing")} aria-label="マーケティング支援を見る"><span>詳しく見る</span><Icon name="arrow" /></button>
              </article>
            </div>
          </div>
        </section>

        <section className="section topics-home">
          <div className="container">
            <div className="title-with-link">
              <SectionTitle en="Topics">トピックス</SectionTitle>
              <button className="text-link" onClick={() => navigate("topics")}>すべてのお知らせを見る <Icon name="arrow" size={20} /></button>
            </div>
            {articles.length ? (
              <div className="article-list">
                {articles.slice(0, 3).map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
              </div>
            ) : (
              <div className="empty-topics">
                <span className="empty-icon"><Icon name="spark" /></span>
                <div><h3>お知らせは準備中です</h3><p>最新のお知らせはこちらでご案内します。</p></div>
              </div>
            )}
          </div>
        </section>
        <ContactBand navigate={navigate} />
      </main>
    </>
  );
}

function Tagline({ text }: { text: string }) {
  const i = text.indexOf("、");
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i + 1)}<br />{text.slice(i + 1)}</>;
}

function ArticleRow({ article, navigate }: { article: Article; navigate: Nav }) {
  return (
    <button className={article.thumbnail ? "article-row has-thumb" : "article-row"} onClick={() => navigate("article", undefined, article.slug)}>
      {article.thumbnail && <span className="article-row-thumb"><img src={article.thumbnail} alt="" loading="lazy" /></span>}
      <span className="article-meta"><time>{article.date}</time><i>{article.category}</i></span>
      <strong>{article.title}</strong><Icon name="arrow" />
    </button>
  );
}

function PageHero({ en, title, intro }: { en: string; title: string; intro?: string }) {
  return (
    <section className="page-hero">
      <div className="page-hero-circle" />
      <div className="container">
        <p>{en}</p><h1>{title}</h1>{intro && <div className="page-intro">{intro}</div>}
      </div>
    </section>
  );
}

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <section
        className="page-hero"
        style={{
          backgroundImage: 'url("/images/about-hero.png")',
          backgroundPosition: "center 42%",
          backgroundSize: "cover",
        }}
      >
        <div className="container">
          <p>About us</p>
          <h1>会社概要</h1>
        </div>
      </section>
      <section className="section message-section">
        <div className="container narrow">
          <span className="section-index">01　Message</span>
          <h2><Lines text={about.message_heading} /></h2>
          <div className="message-body">
            {about.message.map((p, i) => <p key={i}><Lines text={p} /></p>)}
          </div>
          <p className="signature">{about.signature}</p>
        </div>
      </section>
      <section className="section profile-section">
        <div className="container">
          <span className="section-index">02　Profile</span>
          <div className="profile-grid">
            <figure className="profile-photo">
              <span className="profile-photo-deco" aria-hidden="true" />
              <span className="profile-photo-dots" aria-hidden="true" />
              <div className="profile-photo-frame">
                <img src={about.profile_photo} alt={`COANA TOKYO代表 ${about.profile_name}`} />
              </div>
              <figcaption><span>{about.profile_role}</span>{about.profile_name_en}</figcaption>
            </figure>
            <div>
              <p className="profile-role">{about.profile_role}</p>
              <h2>{about.profile_name} <span>{about.profile_name_en}</span></h2>
              <div className="profile-copy">
                {about.profile.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section company-section">
        <div className="container company-inner">
          <div><span className="section-index">03　Company</span><h2>会社情報</h2></div>
          <dl className="company-table">
            {about.company.map((row) => (
              <div key={row.label}><dt>{row.label}</dt><dd>{row.value.includes("@") && !row.value.includes(" ") ? <a href={`mailto:${row.value}`}>{row.value}</a> : <Lines text={row.value} />}</dd></div>
            ))}
          </dl>
        </div>
      </section>
      <ContactBand navigate={navigate} />
    </main>
  );
}

function ServiceBlock({ id, number, en, title, lead, items, tone }: { id: string; number: string; en: string; title: string; lead: string; items: { name: string; text: string; tags?: string[] }[]; tone: "blue" | "yellow" }) {
  return (
    <section id={id} className={`section service-detail ${tone}`}>
      <div className="container">
        <div className="service-detail-head">
          <span>{number}</span>
          <div><p>{en}</p><h2>{title}</h2><h3>{lead}</h3></div>
        </div>
        <div className="service-list">
          {items.map(({ name, text, tags }, index) => (
            <article key={name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{name}{tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ navigate }: { navigate: Nav }) {
  return (
    <main className="services-page">
      <PageHero en="Services" title="サービス" />
      <section className="services-intro">
        <div className="container">
          <p>{services.intro}</p>
        </div>
      </section>
      <ServiceBlock id="backoffice" number="01" {...services.backoffice} tone="blue" />
      <ServiceBlock id="marketing" number="02" {...services.marketing} tone="yellow" />
      <section className="section pricing-section">
        <div className="container pricing-box">
          <div><span className="eyebrow">Price</span><h2>料金について</h2></div>
          <p>{services.pricing}</p>
        </div>
      </section>
      <section className="section flow-section">
        <div className="container">
          <SectionTitle en="Flow" center>ご利用までの流れ</SectionTitle>
          <ol className="flow-list">
            {services.flow.map((item, index) => (
              <li key={item}><span>STEP {index + 1}</span><strong>{item}</strong>{index < services.flow.length - 1 && <i>→</i>}</li>
            ))}
          </ol>
          <div className="center-button"><LinkButton onClick={() => navigate("contact")}>お問い合わせ</LinkButton></div>
        </div>
      </section>
    </main>
  );
}

function Topics({ navigate }: { navigate: Nav }) {
  const [filter, setFilter] = useState("すべて");
  const [pageNo, setPageNo] = useState(1);
  const PER = 10;
  const filtered = articles.filter((a) => filter === "すべて" || a.category === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pageNo - 1) * PER, pageNo * PER);
  return (
    <main>
      <section
        className="page-hero"
        style={{
          backgroundImage: 'url("/images/topics-hero.jpg")',
          backgroundPosition: "center 45%",
          backgroundSize: "cover",
        }}
      >
        <div className="container">
          <p>Topics</p>
          <h1>トピックス</h1>
        </div>
      </section>
      <section className="section topics-page">
        <div className="container">
          <div className="filter-row" aria-label="カテゴリーで絞り込む">
            {["すべて", ...CATEGORIES].map((category) => (
              <button key={category} className={filter === category ? "active" : ""} onClick={() => { setFilter(category); setPageNo(1); }}>{category}</button>
            ))}
          </div>
          {shown.length ? (
            <div className="article-list">
              {shown.map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
              {pages > 1 && (
                <nav className="pagination" aria-label="ページネーション">
                  <button disabled={pageNo === 1} onClick={() => setPageNo(pageNo - 1)}>前へ</button>
                  {Array.from({ length: pages }, (_, i) => <button key={i} className={pageNo === i + 1 ? "current" : ""} onClick={() => setPageNo(i + 1)}>{i + 1}</button>)}
                  <button disabled={pageNo === pages} onClick={() => setPageNo(pageNo + 1)}>次へ</button>
                </nav>
              )}
            </div>
          ) : (
            <div className="empty-topics large">
              <span className="empty-icon"><Icon name="spark" /></span>
              <div><h2>{articles.length ? "このカテゴリーの記事はまだありません" : "お知らせは準備中です"}</h2><p>公開された記事は、こちらに表示されます。</p></div>
            </div>
          )}
        </div>
      </section>
      <ContactBand navigate={navigate} />
    </main>
  );
}

function ArticlePage({ navigate }: { navigate: Nav }) {
  const slug = slugFromPath();
  const article = articles.find((a) => a.slug === slug);
  useEffect(() => { if (article) document.title = `${article.title} | COANA TOKYO`; }, [article]);
  if (!article) {
    return (
      <main>
        <article className="article-page">
          <div className="container article-container">
            <button className="back-link" onClick={() => navigate("topics")}>← トピックス一覧に戻る</button>
            <h1>記事が見つかりませんでした</h1>
          </div>
        </article>
      </main>
    );
  }
  return (
    <main>
      <article className="article-page">
        <div className="container article-container">
          <button className="back-link" onClick={() => navigate("topics")}>← トピックス一覧に戻る</button>
          <div className="article-meta"><time>{article.date}</time><i>{article.category}</i></div>
          <h1>{article.title}</h1>
          {article.thumbnail
            ? <img className="article-thumb" src={article.thumbnail} alt="" />
            : <div className="article-visual"><Icon name="spark" size={42} /><span>TOPICS</span></div>}
          <div className="article-body">
            {article.summary && <p className="article-summary">{article.summary}</p>}
            <div dangerouslySetInnerHTML={{ __html: article.html }} />
          </div>
          <button className="back-link bottom" onClick={() => navigate("topics")}>← トピックス一覧に戻る</button>
        </div>
      </article>
    </main>
  );
}

type FormData = { company: string; name: string; email: string; type: string; message: string; consent: boolean };
const emptyForm: FormData = { company: "", name: "", email: "", type: "", message: "", consent: false };

function Contact() {
  const [data, setData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"input" | "confirm" | "complete">("input");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const send = async () => {
    setSending(true);
    setSendError("");
    try {
      const body = new URLSearchParams({
        "form-name": "contact",
        company: data.company,
        name: data.name,
        email: data.email,
        type: data.type,
        message: data.message,
        consent: data.consent ? "同意する" : "",
      });
      const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
      if (!res.ok) throw new Error(String(res.status));
      setStep("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSendError(`送信に失敗しました。時間をおいて再度お試しいただくか、${settings.email} まで直接ご連絡ください。`);
    } finally {
      setSending(false);
    }
  };
  const update = (key: keyof FormData, value: string | boolean) => setData((old) => ({ ...old, [key]: value }));
  const validate = () => {
    const next: Record<string, string> = {};
    if (!data.name.trim()) next.name = "お名前を入力してください。";
    if (!data.email.trim()) next.email = "メールアドレスを入力してください。";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = "正しいメールアドレスを入力してください。";
    if (!data.type) next.type = "ご相談内容の種別を選択してください。";
    if (!data.message.trim()) next.message = "お問い合わせ内容を入力してください。";
    if (!data.consent) next.consent = "プライバシーポリシーへの同意が必要です。";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validate()) { setStep("confirm"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  if (step === "complete") {
    return (
      <main>
        <PageHero en="Contact" title="お問い合わせ" />
        <section className="section status-page">
          <div className="status-icon"><Icon name="check" size={38} /></div>
          <p className="eyebrow">Thank you</p>
          <h2>お問い合わせを受け付けました</h2>
          <p>お問い合わせいただき、ありがとうございます。<br />内容を確認のうえ、担当者よりご連絡いたします。</p>
          <button className="button button-outline" onClick={() => { setData(emptyForm); setStep("input"); }}>入力画面へ戻る</button>
        </section>
      </main>
    );
  }
  if (step === "confirm") {
    return (
      <main>
        <PageHero en="Contact" title="入力内容の確認" intro="以下の内容でよろしければ「送信する」を押してください。" />
        <section className="section form-section">
          <div className="container form-wrap">
            <dl className="confirm-list">
              <div><dt>会社名</dt><dd>{data.company || "未入力"}</dd></div>
              <div><dt>お名前</dt><dd>{data.name}</dd></div>
              <div><dt>メールアドレス</dt><dd>{data.email}</dd></div>
              <div><dt>ご相談内容の種別</dt><dd>{data.type}</dd></div>
              <div><dt>お問い合わせ内容</dt><dd>{data.message}</dd></div>
            </dl>
            <div className="button-row form-actions">
              <LinkButton secondary onClick={() => setStep("input")}>入力内容を修正する</LinkButton>
              <button className="button" onClick={send} disabled={sending}>{sending ? "送信中…" : "送信する"}<Icon name="arrow" size={19} /></button>
            </div>
            {sendError && <p className="field-error" role="alert" style={{ textAlign: "center", marginTop: 20 }}>{sendError}</p>}
          </div>
        </section>
      </main>
    );
  }
  return (
    <main>
      <PageHero en="Contact" title="お問い合わせ" intro="事業や業務についてのお悩みをお聞かせください。内容を確認のうえ、ご連絡いたします。" />
      <section className="section form-section">
        <form className="container form-wrap" name="contact" onSubmit={submit} noValidate>
          <p className="form-note"><span>必須</span>の項目は必ずご入力ください。</p>
          <Field label="会社名" optional error={errors.company}><input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="例）COANA TOKYO合同会社" /></Field>
          <Field label="お名前" error={errors.name}><input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="例）山田 太郎" aria-invalid={!!errors.name} /></Field>
          <Field label="メールアドレス" error={errors.email}><input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="例）name@example.com" aria-invalid={!!errors.email} /></Field>
          <Field label="ご相談内容の種別" error={errors.type}>
            <select value={data.type} onChange={(e) => update("type", e.target.value)} aria-invalid={!!errors.type}>
              <option value="">選択してください</option><option>バックオフィス支援</option><option>マーケティング支援</option><option>その他</option>
            </select>
          </Field>
          <Field label="お問い合わせ内容" error={errors.message}><textarea value={data.message} onChange={(e) => update("message", e.target.value)} rows={7} placeholder="ご相談内容をご入力ください" aria-invalid={!!errors.message} /></Field>
          <label className="consent">
            <input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} />
            <span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する <b>必須</b></span>
          </label>
          {errors.consent && <p className="field-error consent-error">{errors.consent}</p>}
          <div className="center-button"><button className="button" type="submit">入力内容を確認する <Icon name="arrow" size={19} /></button></div>
        </form>
        <div className="direct-contact"><p>メールでのお問い合わせ</p><a href={`mailto:${settings.email}`}>{settings.email}</a></div>
      </section>
    </main>
  );
}

function Field({ label, optional = false, error, children }: { label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label} <i className={optional ? "optional" : ""}>{optional ? "任意" : "必須"}</i></span>
      {children}{error && <span className="field-error">{error}</span>}
    </label>
  );
}

function Privacy() {
  return (
    <main>
      <PageHero en="Privacy policy" title="プライバシーポリシー" />
      <section className="section privacy-section">
        <div className="container narrow">
          {privacy.body.trim()
            ? <div className="article-body rich-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(privacy.body) }} />
            : <div className="privacy-placeholder"><Icon name="spark" size={34} /><h2>プライバシーポリシーは<br />公開前に掲載予定です</h2><p>正式な内容が確定次第、本ページに掲載いたします。</p></div>}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromPath);
  const [routeKey, setRouteKey] = useState(0);
  useEffect(() => {
    const titles: Record<Page, string> = { home: "", about: "会社概要", services: "サービス", topics: "トピックス", article: "トピックス", contact: "お問い合わせ", privacy: "プライバシーポリシー" };
    const base = "COANA TOKYO合同会社 | バックオフィス・マーケティング支援";
    document.title = titles[page] ? `${titles[page]} | COANA TOKYO合同会社` : base;
  }, [page, routeKey]);
  useEffect(() => {
    const handler = () => { setPage(pageFromPath()); setRouteKey((k) => k + 1); window.scrollTo(0, 0); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main > section, main > article, .strength-item, .service-panel, .service-list article, .flow-list li, .company-table > div, .tool-card, .section-title, .profile-photo, .about-image",
      ),
    );

    targets.forEach((target, index) => {
      target.classList.add("reveal-on-scroll");
      target.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [page, routeKey]);
  const navigate: Nav = (target, hash, slug) => {
    const base = target === "article" ? `/topics/${slug ?? ""}` : paths[target];
    const url = `${base}${hash ? `#${hash}` : ""}`;
    window.history.pushState({}, "", url);
    setPage(target);
    setRouteKey((k) => k + 1);
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }));
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  let content: ReactNode;
  if (page === "about") content = <About navigate={navigate} />;
  else if (page === "services") content = <Services navigate={navigate} />;
  else if (page === "topics") content = <Topics navigate={navigate} />;
  else if (page === "article") content = <ArticlePage key={routeKey} navigate={navigate} />;
  else if (page === "contact") content = <Contact />;
  else if (page === "privacy") content = <Privacy />;
  else content = <Home navigate={navigate} />;
  return (
    <div className="app-shell">
      <Header page={page} navigate={navigate} />
      {content}
      <Footer navigate={navigate} />
    </div>
  );
}
