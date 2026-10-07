import React, { FormEvent, KeyboardEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { about, articles, CATEGORIES, home, privacy, renderMarkdown, services, settings, solutions, type Article } from "./content";

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
  | "solution"
  | "contact"
  | "privacy"
  | "notfound";

const paths: Record<Exclude<Page, "article" | "solution" | "notfound">, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  topics: "/topics",
  contact: "/contact",
  privacy: "/privacy",
};

type NavArgs = [Page, string?, string?];

// サイト内リンク。検索エンジンが辿れるよう実際の <a href> を出力しつつ、
// 通常のクリックはページ遷移せずに画面を切り替える（新しいタブで開く操作はそのまま有効）。
function hrefFor(target: Page, hash?: string, slug?: string) {
  const base = target === "article" ? `/topics/${slug ?? ""}` : target === "solution" ? `/services/${slug ?? ""}` : target === "notfound" ? "/" : paths[target];
  return `${base}${hash ? `#${hash}` : ""}`;
}

function GoLink({
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

function pageFromPath(): Page {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/topics/")) return "article";
  if (path.startsWith("/services/")) return "solution";
  if (path === "/about") return "about";
  if (path === "/services") return "services";
  if (path === "/topics") return "topics";
  if (path === "/contact") return "contact";
  if (path === "/privacy") return "privacy";
  if (path === "/" || path === "/index.html") return "home";
  return "notfound";
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
    <GoLink className="wordmark" go={navigate} args={["home"]} aria-label="ホームへ">
      <span className="logo-mark"><span /><span /></span>
      <span>COANA TOKYO</span>
    </GoLink>
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
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
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
            <GoLink
              key={target}
              className={page === target || (page === "article" && target === "topics") || (page === "solution" && target === "services") ? "nav-link active" : "nav-link"}
              go={go} args={[target]}
            >
              {label}
            </GoLink>
          ))}
          <GoLink className="button button-small" go={go} args={["contact"]}>
            お問い合わせ
            <Icon name="arrow" size={17} />
          </GoLink>
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
            <GoLink key={target} style={{ animationDelay: `${i * 0.05}s` }} go={go} args={[target]}>
              <span><small>{en}</small>{label}</span><Icon name="arrow" size={18} />
            </GoLink>
          ))}
          <GoLink style={{ animationDelay: "0.2s" }} go={go} args={["contact"]}>
            <span><small>Contact</small>お問い合わせ</span><Icon name="arrow" size={18} />
          </GoLink>
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
            <GoLink go={navigate} args={["home"]}>ホーム</GoLink>
            <GoLink go={navigate} args={["about"]}>会社概要</GoLink>
            <GoLink go={navigate} args={["services"]}>サービス</GoLink>
            <GoLink go={navigate} args={["topics"]}>トピックス</GoLink>
            <GoLink go={navigate} args={["contact"]}>お問い合わせ</GoLink>
          </div>
          <div>
            <p className="footer-links-title">Services</p>
            <GoLink go={navigate} args={["services", "backoffice"]}>バックオフィス支援</GoLink>
            <GoLink go={navigate} args={["services", "marketing"]}>マーケティング支援</GoLink>
            {solutions.map((sol) => (
              <GoLink key={sol.slug} go={navigate} args={["solution", undefined, sol.slug]}>{sol.nav_label}</GoLink>
            ))}
          </div>
        </nav>
      </div>
      <div className="container footer-bottom">
        <small>{settings.copyright}</small>
        <GoLink className="footer-privacy" go={navigate} args={["privacy"]}>プライバシーポリシー</GoLink>
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
  const cls = ["button", secondary ? "button-outline" : "", large ? "button-large" : ""].filter(Boolean).join(" ");
  if (go && args) {
    return (
      <GoLink className={cls} go={go} args={args}>
        {children}<Icon name="arrow" size={19} />
      </GoLink>
    );
  }
  return (
    <button className={cls} onClick={onClick}>
      {children}<Icon name="arrow" size={19} />
    </button>
  );
}

const lineUrl = (settings as { line_url?: string }).line_url || "";

/** LINE公式アカウントへの相談ボタン（URLはCMSの「会社情報・共通設定」で変更） */
function LineButton({ place, label = "LINEで気軽に相談する" }: { place: string; label?: string }) {
  if (!lineUrl) return null;
  return (
    <a
      className="line-button"
      href={lineUrl}
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
          <LinkButton large go={navigate} args={["contact"]}>お問い合わせ</LinkButton>
          <LineButton place="contact_band" />
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
  const base = firstRun.current ? 1.35 : 0;
  return (
    <section className="hero" ref={ref}>
      <div className="hero-bg" aria-hidden="true" style={home.hero_image ? { backgroundImage: 'url("' + home.hero_image + '")' } : undefined} />
      <div className="hero-veil" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker hero-anim" style={{ animationDelay: "0.1s" }}><span />{home.hero_kicker}</p>
          <h1 className="hero-title-marker">
            <span className="hero-line" style={{ animationDelay: "0.3s" }}>{home.hero_line1}</span>
            <span className="hero-line" style={{ animationDelay: "0.5s" }}>{home.hero_line2}</span>
          </h1>
          <div className="hero-actions hero-anim" style={{ animationDelay: "0.85s" }}>
            <div className="button-row">
              <LinkButton go={navigate} args={["contact"]}>{home.hero_button_primary}</LinkButton>
              <LinkButton secondary go={navigate} args={["services"]}>{home.hero_button_secondary}</LinkButton>
            </div>
          </div>
        </div>
      </div>
      <div
        className="hero-solve hero-anim"
        style={{ animationDelay: "1.15s" }}
      >
        <p className="solve-text">
          <span className="solve-line">
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
            <span className="solve-rest">{home.hero_solve_text}</span>
          </span>
        </p>
        <span className="solve-progress" aria-hidden="true">
          <i
            key={wordIndex}
            style={{ animationDelay: base + "s" }}
            onAnimationEnd={reduceMotion ? undefined : next}
          />
        </span>
      </div>
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
              <GoLink className="text-link" go={navigate} args={["about"]}>会社概要を見る<Icon name="arrow" size={19} /></GoLink>
            </div>
          </div>
          <figure className="about-image" data-reveal>
            <img src={home.about_image} alt="中小企業のバックオフィス業務を改善する打ち合わせの様子" />
            <figcaption aria-hidden="true">COANA TOKYO</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function ServicesHome({ navigate }: { navigate: Nav }) {
  const panels = [
    { key: "backoffice", n: "01", data: services.backoffice, note: services.backoffice.note },
    { key: "marketing", n: "02", data: services.marketing, note: services.marketing.note },
  ] as const;
  return (
    <section className="section services-home">
      <div className="container">
        <SectionTitle en="Services" lead={home.services_lead}>{home.services_title}</SectionTitle>
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
              <GoLink className="panel-link" go={navigate} args={["services", key]} aria-label={`${data.title}を詳しく見る`}>
                <span>詳しく見る</span><Icon name="arrow" size={20} />
              </GoLink>
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
        {home.tools_note && <p className="tools-foot" data-reveal>{home.tools_note}</p>}
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
        <GoLink className="text-link text-link-light" go={navigate} args={["about", "message"]}>代表メッセージを読む<Icon name="arrow" size={19} /></GoLink>
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
          <SectionTitle en="Topics" lead={home.topics_lead}>{home.topics_title}</SectionTitle>
          <GoLink className="text-link" data-reveal go={navigate} args={["topics"]}>一覧を見る<Icon name="arrow" size={19} /></GoLink>
        </div>
        {latest.length ? (
          <div className="topics-card-grid">
            {latest.map((a, i) => (
              <GoLink key={a.slug} className="topic-card" data-reveal style={{ transitionDelay: `${i * 100}ms` }} go={navigate} args={["article", undefined, a.slug]}>
                <span className="topic-card-thumb">
                  {a.thumbnail
                    ? <img src={a.thumbnail} alt={a.title} loading="lazy" />
                    : <span className="topic-card-fallback"><Icon name="spark" size={30} /></span>}
                </span>
                <span className="topic-card-body">
                  <span className="article-meta"><time dateTime={a.sortKey.slice(0, 10)}>{a.date}</time><i>{a.category}</i></span>
                  <strong>{a.title}</strong>
                  <span className="topic-card-more">読む<Icon name="arrow" size={15} /></span>
                </span>
              </GoLink>
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
          <SectionTitle en="Message">{home.message_title}</SectionTitle>
          <p data-reveal>{home.message_text}</p>
          <p className="teaser-name" data-reveal>{about.profile_role}　<b>{about.profile_name}</b><span>{about.profile_name_en}</span></p>
          <div data-reveal>
            <GoLink className="text-link" go={navigate} args={["about", "profile"]}>代表のプロフィールを見る<Icon name="arrow" size={19} /></GoLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqItems: { q: string; a: string }[] = home.faqs ?? [];

function FaqSection({ items = faqItems, title = home.faq_title }: { items?: { q: string; a: string }[]; title?: string } = {}) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="section faq-section">
      <div className="container narrow">
        <SectionTitle en="FAQ" center>{title}</SectionTitle>
        <div className="faq-list">
          {items.map((item, i) => {
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
          <SectionTitle en="Our strengths" center>{home.strengths_title}</SectionTitle>
          <StrengthsTabs />
        </div>
      </section>
      <ToolsSection />
      <MissionBand navigate={navigate} />
      <TopicsHome navigate={navigate} />
      <FaqSection />
      <ContactBand navigate={navigate} />
    </main>
  );
}

/* ───────────────────────── About ───────────────────────── */

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="About us" title="会社概要" image={about.hero_image} />
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

function ServiceBlock({ id, number, en, title, lead, items, note, navigate }: {
  navigate: Nav;
  id: string;
  number: string;
  en: string;
  title: string;
  lead: string;
  items: { name: string; text: string; tags?: string[]; page?: string }[];
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
          {items.map(({ name, text, tags, page }, index) => (
            <article key={name} data-reveal style={{ transitionDelay: `${(index % 2) * 80}ms` }}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{name}{tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}</h3>
                <p>{text}</p>
                {page && solutions.some((sol) => sol.slug === page) && (
                  <GoLink className="text-link service-more" go={navigate} args={["solution", undefined, page]}>
                    詳しく見る<Icon name="arrow" size={16} />
                  </GoLink>
                )}
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
      <PageHero en="Services" title="サービス" image={services.hero_image} />
      <section className="services-intro">
        <div className="container" data-reveal>
          <p>{services.intro}</p>
        </div>
      </section>
      <ServiceBlock navigate={navigate} id="backoffice" number="01" note="守りを固める" {...services.backoffice} />
      <ServiceBlock navigate={navigate} id="marketing" number="02" note="攻めを支える" {...services.marketing} />
      <section className="section pricing-section">
        <div className="container pricing-box" data-reveal>
          <div>
            <span className="eyebrow">Price</span>
            <h2>{services.pricing_title}</h2>
          </div>
          <p>{services.pricing}</p>
        </div>
      </section>
      <section className="section flow-section">
        <div className="container">
          <SectionTitle en="Flow" center>{services.flow_title}</SectionTitle>
          <ol className="flow-list">
            {services.flow.map((item, index) => (
              <li key={item} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <span>STEP {index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
          <div className="center-button" data-reveal>
            <LinkButton large go={navigate} args={["contact"]}>お問い合わせ</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── Topics / Article ───────────────────────── */

function SolutionPage({ navigate }: { navigate: Nav }) {
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
    <main className="services-page solution-page">
      <PageHero en={sol.en || "Service"} title={sol.title} intro={sol.lead} image={sol.hero_image || services.hero_image} />
      <section className="section">
        <div className="container narrow">
          <SectionTitle en="Problems">{sol.problems_title || "こんなお悩みはありませんか"}</SectionTitle>
          <ul className="solution-problems">
            {sol.problems.map((p, i) => (
              <li key={p} data-reveal style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                <Icon name="check" size={20} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section service-detail">
        <div className="container">
          <SectionTitle en="Support">{sol.features_title || "支援内容"}</SectionTitle>
          <div className="service-list">
            {sol.features.map(({ name, text }, index) => (
              <article key={name} data-reveal style={{ transitionDelay: `${(index % 2) * 80}ms` }}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
          {(sol.tools ?? []).length > 0 && (
            <div className="solution-tools" data-reveal>
              <p>{sol.tools_title || "対応ツールの例"}</p>
              <ul>
                {(sol.tools ?? []).map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>
      <section className="section flow-section">
        <div className="container">
          <SectionTitle en="Flow" center>{sol.steps_title || "支援の進め方"}</SectionTitle>
          <ol className="flow-list">
            {sol.steps.map((item, index) => (
              <li key={item} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <span>STEP {index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
          <div className="center-button solution-cta" data-reveal>
            <LinkButton large go={navigate} args={["contact"]}>まずは相談してみる</LinkButton>
            <LineButton place="solution_page" />
          </div>
        </div>
      </section>
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
    </main>
  );
}

function ArticleRow({ article, navigate }: { article: Article; navigate: Nav }) {
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

function Topics({ navigate }: { navigate: Nav }) {
  const [filter, setFilter] = useState("すべて");
  const [pageNo, setPageNo] = useState(1);
  const PER = 10;
  const filtered = articles.filter((a) => filter === "すべて" || a.category === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pageNo - 1) * PER, pageNo * PER);
  return (
    <main>
      <PageHero en="Topics" title="トピックス" image={settings.topics_hero_image} />
      <section className="section topics-page">
        <div className="container">
          <div className="filter-row" aria-label="カテゴリーで絞り込む" data-reveal>
            {["すべて", ...CATEGORIES].map((category) => (
              <button key={category} className={filter === category ? "active" : ""} onClick={() => { setFilter(category); setPageNo(1); }}>{category}</button>
            ))}
          </div>
          {shown.length ? (
            <div key={"list-" + filter + "-" + pageNo} className="article-list swap-in">
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
            <div key={"empty-" + filter} className="empty-topics large swap-in">
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
  useEffect(() => { if (article) document.title = `${article.title} | COANA TOKYO合同会社`; }, [article]);
  if (!article) {
    return (
      <main>
        <article className="article-page">
          <div className="container article-container">
            <GoLink className="back-link" go={navigate} args={["topics"]}>← トピックス一覧に戻る</GoLink>
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
          <GoLink className="back-link" go={navigate} args={["topics"]}>← トピックス一覧に戻る</GoLink>
          <div className="article-meta"><time dateTime={article.sortKey.slice(0, 10)}>{article.date}</time><i>{article.category}</i></div>
          <h1>{article.title}</h1>
          {article.thumbnail
            ? <img className="article-thumb" src={article.thumbnail} alt={article.title} fetchPriority="high" />
            : <div className="article-visual"><Icon name="spark" size={42} /><span>TOPICS</span></div>}
          <div className="article-body">
            <div dangerouslySetInnerHTML={{ __html: article.html }} />
          </div>
          <nav className="article-nav" aria-label="前後の記事">
            {prev ? (
              <GoLink go={navigate} args={["article", undefined, prev.slug]}>
                <small>← 前の記事</small><span>{prev.title}</span>
              </GoLink>
            ) : <span className="article-nav-empty" />}
            {next ? (
              <GoLink className="next" go={navigate} args={["article", undefined, next.slug]}>
                <small>次の記事 →</small><span>{next.title}</span>
              </GoLink>
            ) : <span className="article-nav-empty" />}
          </nav>
          <GoLink className="back-link bottom" go={navigate} args={["topics"]}>← トピックス一覧に戻る</GoLink>
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
      window.gtag?.("event", "generate_lead", { form_name: "contact", inquiry_type: data.type });
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
      <PageHero en="Contact" title="お問い合わせ" intro={settings.contact_intro} />
      <section className="section form-section">
        <form className="container form-wrap" name="contact" onSubmit={submit} noValidate>
          {lineUrl && (
            <div className="line-notice">
              <p>フォームの入力が面倒な方は、LINEからもお気軽にご相談いただけます。</p>
              <LineButton place="contact_page" />
            </div>
          )}
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

/* ───────────────────────── Not found ───────────────────────── */

function NotFound({ navigate }: { navigate: Nav }) {
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
    // 検索結果に表示されるタイトル（ビルド時に各ページの HTML へ書き出すタイトルと揃える）
    const titles: Record<Page, string> = { home: "", about: "会社概要・代表メッセージ", services: "サービス｜経理・バックオフィス改善、ITツール導入、マーケティング支援", topics: "トピックス｜セミナー登壇・メディア掲載・お知らせ", article: "トピックス", solution: "サービス", contact: "お問い合わせ｜バックオフィス・マーケティングのご相談", privacy: "プライバシーポリシー", notfound: "ページが見つかりません" };
    const base = "中小企業のバックオフィス・マーケティング支援 | COANA TOKYO合同会社（東京・港区）";
    if (page === "article" || page === "solution") return; // 記事・サービス別ページは各ページのタイトルを優先
    document.title = titles[page] ? `${titles[page]} | COANA TOKYO合同会社` : base;
  }, [page, routeKey]);
  // URLに #message などの指定があれば、ページが描画されたあとにその位置までスクロールする（初回表示とサイト内移動の両方）
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 150);
    return () => window.clearTimeout(timer);
  }, [page, routeKey]);
  useEffect(() => {
    const handler = () => { setPage(pageFromPath()); setRouteKey((k) => k + 1); };
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
    // 絞り込みなどで後から表示された要素も、スクロール表示の対象にする
    const mutation = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const added: HTMLElement[] = node.matches("[data-reveal]") ? [node] : [];
        added.concat(Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]")))
          .filter((el) => !el.classList.contains("in"))
          .forEach((el) => observer.observe(el));
      }));
    });
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, [page, routeKey]);
  // ページ切り替え直後（描画前）に、アニメーションなしで先頭へ戻す。
  // なめらかスクロールを描画前に開始すると、スマホでは新しいページの描画で途中停止し、
  // 前のページの位置（フッター付近）に取り残されるため、描画後に即時スクロールする。
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);
  useLayoutEffect(() => {
    if (routeKey === 0 || window.location.hash) return;
    const root = document.documentElement;
    root.classList.remove("menu-open");
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const raf = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [page, routeKey]);
  const navigate: Nav = (target, hash, slug) => {
    const base = target === "article" ? `/topics/${slug ?? ""}` : target === "solution" ? `/services/${slug ?? ""}` : target === "notfound" ? "/" : paths[target];
    const url = `${base}${hash ? `#${hash}` : ""}`;
    window.history.pushState({}, "", url);
    setPage(target);
    setRouteKey((k) => k + 1);
  };
  let content: ReactNode;
  if (page === "about") content = <About navigate={navigate} />;
  else if (page === "services") content = <Services navigate={navigate} />;
  else if (page === "topics") content = <Topics navigate={navigate} />;
  else if (page === "article") content = <ArticlePage key={routeKey} navigate={navigate} />;
  else if (page === "solution") content = <SolutionPage key={routeKey} navigate={navigate} />;
  else if (page === "contact") content = <Contact />;
  else if (page === "privacy") content = <Privacy />;
  else if (page === "notfound") content = <NotFound navigate={navigate} />;
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
