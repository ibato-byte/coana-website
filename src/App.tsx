import React, { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { about, articles, CATEGORIES, home, privacy, renderMarkdown, services, settings, type Article } from "./content";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

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

type IconName =
  | "arrow" | "menu" | "close" | "chat" | "spark" | "check"
  | "mail" | "plus" | "up" | "quote" | "shield" | "compass" | "handshake" | "pin";

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
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
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
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

function Logo({ navigate }: { navigate: Nav }) {
  return (
    <button className="wordmark" onClick={() => navigate("home")} aria-label="ホームへ">
      <span className="logo-mark"><span /><span /></span>
      <span>COANA TOKYO</span>
    </button>
  );
}

/* ───────────────────────── Header / Footer ───────────────────────── */

function Header({ page, navigate }: { page: Page; navigate: Nav }) {
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
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    return () => document.documentElement.classList.remove("menu-open");
  }, [open]);
  const links: [Page, string, string][] = [
    ["home", "ホーム", "Top"],
    ["about", "会社概要", "About"],
    ["services", "サービス", "Services"],
    ["topics", "トピックス", "Topics"],
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
            <Icon name="arrow" size={17} />
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
          {links.map(([target, label, en], i) => (
            <button key={target} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => go(target)}>
              <span><small>{en}</small>{label}</span><Icon name="arrow" size={18} />
            </button>
          ))}
          <button style={{ animationDelay: "0.2s" }} onClick={() => go("contact")}>
            <span><small>Contact</small>お問い合わせ</span><Icon name="arrow" size={18} />
          </button>
          <p className="mobile-nav-foot">{settings.company_name}</p>
        </nav>
      )}
    </header>
  );
}

function Footer({ navigate }: { navigate: Nav }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-company">
          <Logo navigate={navigate} />
          <p className="footer-tagline">{settings.footer_tagline}</p>
          <p className="footer-address">{settings.company_name}<br />{settings.postal_code} {settings.address}</p>
          <a className="footer-mail" href={`mailto:${settings.email}`}><Icon name="mail" size={16} />{settings.email}</a>
        </div>
        <nav className="footer-links" aria-label="フッターナビゲーション">
          <div>
            <p className="footer-links-title">Menu</p>
            <button onClick={() => navigate("home")}>ホーム</button>
            <button onClick={() => navigate("about")}>会社概要</button>
            <button onClick={() => navigate("services")}>サービス</button>
            <button onClick={() => navigate("topics")}>トピックス</button>
          </div>
          <div>
            <p className="footer-links-title">Services</p>
            <button onClick={() => navigate("services", "backoffice")}>バックオフィス支援</button>
            <button onClick={() => navigate("services", "marketing")}>マーケティング支援</button>
            <button onClick={() => navigate("contact")}>お問い合わせ</button>
            <button onClick={() => navigate("privacy")}>プライバシーポリシー</button>
          </div>
        </nav>
      </div>
      <div className="container footer-bottom">
        <small>{settings.copyright}</small>
        <small className="footer-en">BACK OFFICE × MARKETING</small>
      </div>
    </footer>
  );
}

/* ───────────────────────── Shared parts ───────────────────────── */

function SectionTitle({
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

function LinkButton({
  children,
  onClick,
  secondary = false,
  large = false,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
  large?: boolean;
}) {
  const cls = ["button", secondary ? "button-outline" : "", large ? "button-large" : ""].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick}>
      {children}<Icon name="arrow" size={19} />
    </button>
  );
}

function ContactBand({ navigate }: { navigate: Nav }) {
  return (
    <section className="contact-band">
      <div className="contact-orbit orbit-one" aria-hidden="true" />
      <div className="contact-orbit orbit-two" aria-hidden="true" />
      <div className="container contact-band-inner" data-reveal>
        <div>
          <span className="eyebrow">Contact</span>
          <h2>{settings.contact_band.heading}</h2>
          <p><Lines text={settings.contact_band.text} /></p>
        </div>
        <div className="contact-band-action">
          <LinkButton large onClick={() => navigate("contact")}>お問い合わせ</LinkButton>
          <a className="contact-band-mail" href={`mailto:${settings.email}`}><Icon name="mail" size={16} />{settings.email}</a>
        </div>
      </div>
    </section>
  );
}

function PageHero({ en, title, intro, image }: { en: string; title: string; intro?: string; image?: string }) {
  return (
    <section
      className={image ? "page-hero has-image" : "page-hero"}
      style={image ? { backgroundImage: `url("${image}")` } : undefined}
    >
      <div className="container">
        <p className="page-hero-en">{en}</p>
        <h1>{title}</h1>
        {intro && <div className="page-intro">{intro}</div>}
      </div>
    </section>
  );
}

/* ───────────────────────── Home: Hero ───────────────────────── */

function HeroSection({ navigate }: { navigate: Nav }) {
  const ref = useRef<HTMLElement | null>(null);
  const words: string[] = (home as { hero_words?: string[] }).hero_words ?? ["経理", "業務フロー", "ERP・ツール導入", "営業・集客"];
  const [wordIndex, setWordIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const firstRun = useRef(true);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [boxWidth, setBoxWidth] = useState<number | undefined>(undefined);
  const goTo = (i: number) => {
    firstRun.current = false;
    setWordIndex(i);
  };
  const next = () => goTo((wordIndex + 1) % words.length);
  useEffect(() => {
    const measure = () => {
      const el = wordRefs.current[wordIndex];
      if (el) setBoxWidth(el.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [wordIndex]);
  useEffect(() => {
    if (!reduceMotion) return;
    const id = window.setInterval(() => setWordIndex((i) => (i + 1) % words.length), 3600);
    return () => window.clearInterval(id);
  }, [reduceMotion, words.length]);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
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
    el.addEventListener("pointermove", onMove);
    return () => { el.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [reduceMotion]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = firstRun.current ? 1.35 : 0;
  return (
    <section className="hero" ref={ref}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-veil" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker hero-anim" style={{ animationDelay: "0.1s" }}><span />BACK OFFICE × MARKETING</p>
          <h1 className="hero-title-marker">
            <span className="hero-line" style={{ animationDelay: "0.3s" }}>{home.hero_line1}</span>
            <span className="hero-line" style={{ animationDelay: "0.5s" }}>{home.hero_line2}</span>
          </h1>
          <div className="hero-actions hero-anim" style={{ animationDelay: "0.85s" }}>
            <div className="button-row">
              <LinkButton onClick={() => navigate("contact")}>まずは相談してみる</LinkButton>
              <LinkButton secondary onClick={() => navigate("services")}>サービスを見る</LinkButton>
            </div>
          </div>
        </div>
      </div>
      <div
        className="hero-solve hero-anim"
        style={{ animationDelay: "1.15s" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="solve-meta" aria-hidden="true">
          <span className="solve-label">We solve</span>
          <span className="solve-count"><b key={wordIndex}>{pad(wordIndex + 1)}</b> / {pad(words.length)}</span>
        </div>
        <p className="solve-text">
          <span className="solve-box" style={boxWidth ? { width: boxWidth } : undefined}>
            {words.map((w, i) => (
              <span
                key={w}
                ref={(el) => { wordRefs.current[i] = el; }}
                className={i === wordIndex ? "solve-word is-active" : i === (wordIndex + words.length - 1) % words.length && !firstRun.current ? "solve-word is-leaving" : "solve-word"}
                style={{ ["--d" as string]: base + "s" } as React.CSSProperties}
                aria-hidden={i !== wordIndex}
              >
                {Array.from(w).map((ch, ci) => (
                  <span key={ci} className="solve-ch" style={{ animationDelay: (base + 0.12 + ci * 0.045).toFixed(3) + "s" }}>{ch}</span>
                ))}
              </span>
            ))}
          </span>
          <span className="solve-rest">の悩みを、仕組みで解決。</span>
        </p>
        <ul className="solve-list" aria-label="解決できるお悩みを切り替える">
          {words.map((w, i) => (
            <li key={w}>
              <button type="button" className={i === wordIndex ? "is-active" : ""} aria-pressed={i === wordIndex} onClick={() => goTo(i)}>{w}</button>
            </li>
          ))}
        </ul>
        <span className="solve-progress" aria-hidden="true">
          <i
            key={wordIndex}
            className={paused ? "is-paused" : undefined}
            style={{ animationDelay: base + "s" }}
            onAnimationEnd={reduceMotion ? undefined : next}
          />
        </span>
      </div>
      <div className="hero-scroll" aria-hidden="true"><span>SCROLL</span><i /></div>
    </section>
  );
}

/* ───────────────────────── Home: About / Services / Strengths ───────────────────────── */

function AboutIntro({ navigate }: { navigate: Nav }) {
  return (
    <section className="section about-intro">
      <div className="container">
        <div className="about-content">
          <div className="about-copy">
            <SectionTitle en="About us">{home.about_title}</SectionTitle>
            <p data-reveal>{home.about_text}</p>
            <div data-reveal>
              <button className="text-link" onClick={() => navigate("about")}>会社概要を見る<Icon name="arrow" size={19} /></button>
            </div>
          </div>
          <figure className="about-image" data-reveal>
            <img src="/images/about-backoffice.jpg" alt="オフィスで打ち合わせをするビジネスパーソン" />
            <figcaption aria-hidden="true">COANA TOKYO</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function ServicesHome({ navigate }: { navigate: Nav }) {
  const panels = [
    { key: "backoffice", n: "01", data: services.backoffice, note: "守りを固める" },
    { key: "marketing", n: "02", data: services.marketing, note: "攻めを支える" },
  ] as const;
  return (
    <section className="section services-home">
      <div className="container">
        <SectionTitle en="Services" lead="守りのバックオフィスと、攻めのマーケティング。2つの軸で、事業の課題にワンストップで応えます。">サービス</SectionTitle>
        <div className="service-home-grid">
          {panels.map(({ key, n, data, note }, pi) => (
            <article className="service-panel" key={key} data-reveal style={{ transitionDelay: `${pi * 120}ms` }}>
              <header className="service-panel-head">
                <span className="service-num">{n}</span>
                <div>
                  <p className="service-en">{data.en}</p>
                  <h3>{data.title}</h3>
                </div>
                <span className="service-note">{note}</span>
              </header>
              <p className="service-tagline">{data.lead}</p>
              <ul>
                {(data.items as { name: string; tags?: string[] }[]).map((i) => (
                  <li key={i.name}>
                    {i.name}
                    {i.tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}
                  </li>
                ))}
              </ul>
              <button className="panel-link" onClick={() => navigate("services", key)} aria-label={`${data.title}を詳しく見る`}>
                <span>詳しく見る</span><Icon name="arrow" size={20} />
              </button>
            </article>
          ))}
        </div>
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
    <div className="strengths-tabs" data-reveal>
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
          <div className="strength-cols">
            <div>
              <h4>よくある課題</h4>
              <ul className="challenge-list">
                {active.challenges.map((challenge) => (
                  <li key={challenge}>{challenge}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>対応サービスの例</h4>
              <ul className="strength-service-list">
                {active.services.map((service) => (
                  <li key={service}><span aria-hidden="true"><Icon name="check" size={14} /></span>{service}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <StrengthIllustration type={active.illustration} />
      </div>
    </div>
  );
}

/* ───────────────────────── Home: Tools / Mission / Topics / Message / FAQ ───────────────────────── */

function ToolsSection() {
  return (
    <section className="section tools-section">
      <div className="container">
        <div className="tools-head">
          <SectionTitle en="Tools">{home.tools_title}</SectionTitle>
          <p data-reveal>{home.tools_text}</p>
        </div>
        <div className="tools-grid">
          {home.tools.map((t, i) => (
            <article className="tool-card" key={t.name} data-reveal style={{ transitionDelay: `${(i % 4) * 90}ms` }}>
              <div className="tool-logo"><img src={t.logo} alt={t.name} loading="lazy" /></div>
              <p className="tool-category">{t.category}</p>
              <h3>{t.name}</h3>
              <p>{t.text}</p>
            </article>
          ))}
        </div>
        <p className="tools-foot" data-reveal>上記以外のツールについても、業務内容に合わせて選定からご相談いただけます。</p>
      </div>
    </section>
  );
}

function MissionBand({ navigate }: { navigate: Nav }) {
  return (
    <section className="mission-band">
      <span className="mission-watermark" aria-hidden="true">MISSION</span>
      <div className="container" data-reveal>
        <span className="eyebrow">Our mission</span>
        <p className="mission-statement"><Lines text={about.message_heading} /></p>
        <button className="text-link text-link-light" onClick={() => navigate("about", "message")}>代表メッセージを読む<Icon name="arrow" size={19} /></button>
      </div>
    </section>
  );
}

function TopicsHome({ navigate }: { navigate: Nav }) {
  const latest = articles.slice(0, 3);
  return (
    <section className="section topics-home">
      <div className="container">
        <div className="title-with-link">
          <SectionTitle en="Topics" lead="セミナー登壇やメディア掲載など、最近の活動をお知らせしています。">トピックス</SectionTitle>
          <button className="text-link" data-reveal onClick={() => navigate("topics")}>一覧を見る<Icon name="arrow" size={19} /></button>
        </div>
        {latest.length ? (
          <div className="topics-card-grid">
            {latest.map((a, i) => (
              <button key={a.slug} className="topic-card" data-reveal style={{ transitionDelay: `${i * 100}ms` }} onClick={() => navigate("article", undefined, a.slug)}>
                <span className="topic-card-thumb">
                  {a.thumbnail
                    ? <img src={a.thumbnail} alt="" loading="lazy" />
                    : <span className="topic-card-fallback"><Icon name="spark" size={30} /></span>}
                </span>
                <span className="topic-card-body">
                  <span className="article-meta"><time>{a.date}</time><i>{a.category}</i></span>
                  <strong>{a.title}</strong>
                  <span className="topic-card-more">読む<Icon name="arrow" size={15} /></span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-topics" data-reveal>
            <span className="empty-icon"><Icon name="spark" /></span>
            <div><h3>お知らせは準備中です</h3><p>最新のお知らせはこちらでご案内します。</p></div>
          </div>
        )}
      </div>
    </section>
  );
}

function MessageTeaser({ navigate }: { navigate: Nav }) {
  return (
    <section className="section message-teaser">
      <div className="container message-teaser-inner">
        <figure className="teaser-photo" data-reveal>
          <img src={about.profile_photo} alt={`${settings.company_name} ${about.profile_role} ${about.profile_name}`} loading="lazy" />
        </figure>
        <div className="teaser-copy">
          <SectionTitle en="Message">現場を知るパートナーとして、実行まで伴走します</SectionTitle>
          <p data-reveal>
            大手クラウド会計ソフト企業や税理士事務所などでの実務経験をもとに、「経理×IT」の両面から業務を見直します。
            改善案の提示にとどまらず、仕組みづくりから日々の実務まで。現場で使い続けられるかたちに落とし込むことを大切にしています。
          </p>
          <p className="teaser-name" data-reveal>{about.profile_role}　<b>{about.profile_name}</b><span>{about.profile_name_en}</span></p>
          <div data-reveal>
            <button className="text-link" onClick={() => navigate("about", "profile")}>代表のプロフィールを見る<Icon name="arrow" size={19} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqItems: { q: string; a: ReactNode }[] = [
  {
    q: "相談から契約までは、どのような流れですか？",
    a: <>お問い合わせフォームからご連絡ください。内容を確認のうえ担当者からご連絡し、ヒアリングで現状の業務や課題を伺います。そのうえで支援内容とお見積もりをご提案し、ご納得いただけてからのご契約となります。</>,
  },
  {
    q: "料金はどのように決まりますか？",
    a: <>支援内容や業務範囲に応じて、個別にお見積もりいたします。ヒアリングで課題と優先順位を整理したうえで、必要な範囲に絞ったご提案も可能です。</>,
  },
  {
    q: "一部の業務だけ、ツールの導入だけでもお願いできますか？",
    a: <>可能です。「経理業務の設計だけ」「クラウドツールの導入だけ」など、必要な業務や不足している部分だけのご依頼も承っています。状況に合わせて、支援の組み合わせをご提案します。</>,
  },
  {
    q: "日々の実務の代行もお願いできますか？",
    a: <>可能です。経理業務やバックオフィス業務は、仕組みの設計だけでなく、日々の実務をお任せいただくこともできます。</>,
  },
  {
    q: "どのようなツールに対応していますか？",
    a: <>freee、マネーフォワード クラウド、ERPの「Odoo」、Google Workspaceなどの導入・活用を支援しています。特定のツールありきではなく、業務フローに合わせた選定からご相談いただけます。</>,
  },
];

function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="section faq-section">
      <div className="container narrow">
        <SectionTitle en="FAQ" center>よくあるご質問</SectionTitle>
        <div className="faq-list">
          {faqItems.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} data-reveal style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                <div className={open ? "faq-item open" : "faq-item"}>
                  <button
                    className="faq-q"
                    aria-expanded={open}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpenIndex(i)}
                  >
                    <span className="faq-mark">Q</span>
                    <span className="faq-q-text">{item.q}</span>
                    <span className="faq-toggle" aria-hidden="true"><Icon name="plus" size={18} /></span>
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
    </section>
  );
}

function Home({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <HeroSection navigate={navigate} />
      <AboutIntro navigate={navigate} />
      <ServicesHome navigate={navigate} />
      <section className="section strengths-section">
        <div className="container">
          <SectionTitle en="Our strengths" center>COANA TOKYOが選ばれる理由</SectionTitle>
          <StrengthsTabs />
        </div>
      </section>
      <ToolsSection />
      <MissionBand navigate={navigate} />
      <TopicsHome navigate={navigate} />
      <MessageTeaser navigate={navigate} />
      <FaqSection />
      <ContactBand navigate={navigate} />
    </main>
  );
}

/* ───────────────────────── About ───────────────────────── */

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="About us" title="会社概要" image="/images/about-hero.png" />
      <section id="message" className="section message-section">
        <div className="container narrow">
          <span className="section-index" data-reveal>01<i>Message</i></span>
          <h2 data-reveal><Lines text={about.message_heading} /></h2>
          <div className="message-body" data-reveal>
            {about.message.map((p, i) => <p key={i}><Lines text={p} /></p>)}
          </div>
          <p className="signature" data-reveal><small>代表</small>{about.signature.replace(/^代表\s*/, "")}</p>
        </div>
      </section>
      <section id="profile" className="section profile-section">
        <div className="container">
          <span className="section-index" data-reveal>02<i>Profile</i></span>
          <div className="profile-grid">
            <figure className="profile-photo" data-reveal>
              <span className="profile-photo-deco" aria-hidden="true" />
              <span className="profile-photo-dots" aria-hidden="true" />
              <div className="profile-photo-frame">
                <img src={about.profile_photo} alt={`COANA TOKYO代表 ${about.profile_name}`} />
              </div>
              <figcaption><span>{about.profile_role}</span>{about.profile_name_en}</figcaption>
            </figure>
            <div data-reveal>
              <p className="profile-role">{about.profile_role}</p>
              <h2 className="profile-name">{about.profile_name} <span>{about.profile_name_en}</span></h2>
              <div className="profile-copy">
                {about.profile.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section company-section">
        <div className="container company-inner">
          <div data-reveal>
            <span className="section-index">03<i>Company</i></span>
            <h2>会社情報</h2>
          </div>
          <dl className="company-table" data-reveal>
            {about.company.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value.includes("@") && !row.value.includes(" ") ? <a href={`mailto:${row.value}`}>{row.value}</a> : <Lines text={row.value} />}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <ContactBand navigate={navigate} />
    </main>
  );
}

/* ───────────────────────── Services ───────────────────────── */

function ServiceBlock({ id, number, en, title, lead, items, note }: {
  id: string;
  number: string;
  en: string;
  title: string;
  lead: string;
  items: { name: string; text: string; tags?: string[] }[];
  note: string;
}) {
  return (
    <section id={id} className="section service-detail">
      <div className="container">
        <div className="service-detail-head" data-reveal>
          <span className="service-detail-num">{number}</span>
          <div>
            <p className="service-detail-en">{en}<em>{note}</em></p>
            <h2>{title}</h2>
            <h3>{lead}</h3>
          </div>
        </div>
        <div className="service-list">
          {items.map(({ name, text, tags }, index) => (
            <article key={name} data-reveal style={{ transitionDelay: `${(index % 2) * 80}ms` }}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{name}{tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}</h3>
                <p>{text}</p>
              </div>
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
      <PageHero en="Services" title="サービス" image="/images/services-hero.png" />
      <section className="services-intro">
        <div className="container" data-reveal>
          <p>{services.intro}</p>
        </div>
      </section>
      <ServiceBlock id="backoffice" number="01" note="守りを固める" {...services.backoffice} />
      <ServiceBlock id="marketing" number="02" note="攻めを支える" {...services.marketing} />
      <section className="section pricing-section">
        <div className="container pricing-box" data-reveal>
          <div>
            <span className="eyebrow">Price</span>
            <h2>料金について</h2>
          </div>
          <p>{services.pricing}</p>
        </div>
      </section>
      <section className="section flow-section">
        <div className="container">
          <SectionTitle en="Flow" center>ご利用までの流れ</SectionTitle>
          <ol className="flow-list">
            {services.flow.map((item, index) => (
              <li key={item} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <span>STEP {index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
          <div className="center-button" data-reveal>
            <LinkButton large onClick={() => navigate("contact")}>お問い合わせ</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── Topics / Article ───────────────────────── */

function ArticleRow({ article, navigate }: { article: Article; navigate: Nav }) {
  return (
    <button className={article.thumbnail ? "article-row has-thumb" : "article-row"} onClick={() => navigate("article", undefined, article.slug)}>
      {article.thumbnail && <span className="article-row-thumb"><img src={article.thumbnail} alt="" loading="lazy" /></span>}
      <span className="article-row-main">
        <span className="article-meta"><time>{article.date}</time><i>{article.category}</i></span>
        <strong>{article.title}</strong>
      </span>
      <Icon name="arrow" />
    </button>
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
      <PageHero en="Topics" title="トピックス" image="/images/topics-hero.jpg" />
      <section className="section topics-page">
        <div className="container">
          <div className="filter-row" aria-label="カテゴリーで絞り込む" data-reveal>
            {["すべて", ...CATEGORIES].map((category) => (
              <button key={category} className={filter === category ? "active" : ""} onClick={() => { setFilter(category); setPageNo(1); }}>{category}</button>
            ))}
          </div>
          {shown.length ? (
            <div className="article-list" data-reveal>
              {shown.map((a) => <ArticleRow key={a.slug} article={a} navigate={navigate} />)}
              {pages > 1 && (
                <nav className="pagination" aria-label="ページネーション">
                  <button disabled={pageNo === 1} onClick={() => setPageNo(pageNo - 1)}>前へ</button>
                  {Array.from({ length: pages }, (_, i) => (
                    <button key={i} className={pageNo === i + 1 ? "current" : ""} onClick={() => setPageNo(i + 1)}>{i + 1}</button>
                  ))}
                  <button disabled={pageNo === pages} onClick={() => setPageNo(pageNo + 1)}>次へ</button>
                </nav>
              )}
            </div>
          ) : (
            <div className="empty-topics large" data-reveal>
              <span className="empty-icon"><Icon name="spark" /></span>
              <div>
                <h2>{articles.length ? "このカテゴリーの記事はまだありません" : "お知らせは準備中です"}</h2>
                <p>公開された記事は、こちらに表示されます。</p>
              </div>
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
  const index = articles.findIndex((a) => a.slug === slug);
  const article = index >= 0 ? articles[index] : undefined;
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
  const prev = articles[index + 1];
  const next = articles[index - 1];
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
          <nav className="article-nav" aria-label="前後の記事">
            {prev ? (
              <button onClick={() => navigate("article", undefined, prev.slug)}>
                <small>← 前の記事</small><span>{prev.title}</span>
              </button>
            ) : <span className="article-nav-empty" />}
            {next ? (
              <button className="next" onClick={() => navigate("article", undefined, next.slug)}>
                <small>次の記事 →</small><span>{next.title}</span>
              </button>
            ) : <span className="article-nav-empty" />}
          </nav>
          <button className="back-link bottom" onClick={() => navigate("topics")}>← トピックス一覧に戻る</button>
        </div>
      </article>
      <ContactBand navigate={navigate} />
    </main>
  );
}

/* ───────────────────────── Contact ───────────────────────── */

// お問い合わせフォームの送信先（Google Apps Script ウェブアプリ。受信内容は info@ に通知され、スプレッドシート「HP問い合わせ受信ログ_COANA TOKYO」に記録）
const CONTACT_ENDPOINT = "https://script.google.com/macros/s/AKfycbyg8vAr_zinCs47Z4W0oxCK0YUoA-gLL-453lv1rvcTlpXerIGSdZRIg7zdLLRS3d9u/exec";

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
      const res = await fetch(CONTACT_ENDPOINT, { method: "POST", body });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result || !result.ok) throw new Error(String(res.status));
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
          <Field label="会社名" optional error={errors.company}>
            <input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="例）COANA TOKYO合同会社" />
          </Field>
          <Field label="お名前" error={errors.name}>
            <input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="例）山田 太郎" aria-invalid={!!errors.name} />
          </Field>
          <Field label="メールアドレス" error={errors.email}>
            <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="例）name@example.com" aria-invalid={!!errors.email} />
          </Field>
          <Field label="ご相談内容の種別" error={errors.type}>
            <select value={data.type} onChange={(e) => update("type", e.target.value)} aria-invalid={!!errors.type}>
              <option value="">選択してください</option>
              <option>バックオフィス支援</option>
              <option>マーケティング支援</option>
              <option>その他</option>
            </select>
          </Field>
          <Field label="お問い合わせ内容" error={errors.message}>
            <textarea value={data.message} onChange={(e) => update("message", e.target.value)} rows={7} placeholder="ご相談内容をご入力ください" aria-invalid={!!errors.message} />
          </Field>
          <label className="consent">
            <input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} />
            <span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する <b>必須</b></span>
          </label>
          {errors.consent && <p className="field-error consent-error">{errors.consent}</p>}
          <div className="center-button"><button className="button button-large" type="submit">入力内容を確認する <Icon name="arrow" size={19} /></button></div>
        </form>
        <div className="direct-contact">
          <p>メールでのお問い合わせ</p>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </div>
      </section>
    </main>
  );
}

function Field({ label, optional = false, error, children }: { label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label} <i className={optional ? "optional" : ""}>{optional ? "任意" : "必須"}</i></span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function Privacy() {
  return (
    <main>
      <PageHero en="Privacy policy" title="プライバシーポリシー" />
      <section className="section privacy-section">
        <div className="container narrow" data-reveal>
          {privacy.body.trim()
            ? <div className="article-body rich-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(privacy.body) }} />
            : (
              <div className="privacy-placeholder">
                <Icon name="spark" size={34} />
                <h2>プライバシーポリシーは<br />公開前に掲載予定です</h2>
                <p>正式な内容が確定次第、本ページに掲載いたします。</p>
              </div>
            )}
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── App shell ───────────────────────── */

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      className={show ? "back-to-top show" : "back-to-top"}
      aria-label="ページの先頭へ戻る"
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <Icon name="up" size={20} />
    </button>
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
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 120);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const handler = () => { setPage(pageFromPath()); setRouteKey((k) => k + 1); window.scrollTo(0, 0); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => target.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
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
    window.gtag?.("event", "page_view", { page_path: url });
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
      <div key={`${page}-${routeKey}`} className="page-fade">{content}</div>
      <Footer navigate={navigate} />
      <BackToTop />
    </div>
  );
}
