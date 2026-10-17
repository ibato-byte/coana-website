import React, { ReactNode, useState } from "react";
import { home, settings, type Article } from "./content";

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
  | "mail" | "plus" | "up" | "quote" | "shield" | "compass" | "handshake" | "pin";

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

export function ContactBand({ navigate }: { navigate: Nav }) {
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

/** ページ上部の見出し。dark を付けると、写真を見せたまま暗いオーバーレイ＋白文字にする（会社概要） */
export function PageHero({ en, title, intro, image, dark = false }: { en: string; title: string; intro?: string; image?: string; dark?: boolean }) {
  return (
    <section
      className={["page-hero", image ? "has-image" : "", image && dark ? "is-dark" : ""].filter(Boolean).join(" ")}
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

export const faqItems: { q: string; a: string }[] = home.faqs ?? [];

export function FaqSection({ items = faqItems, title = home.faq_title }: { items?: { q: string; a: string }[]; title?: string } = {}) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="section faq-section">
      <div className="container narrow">
        <SectionTitle en="FAQ" center>{title}</SectionTitle>
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
