import { FormEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { about, articles, CATEGORIES, home, privacy, renderMarkdown, services, settings, solutions } from "./content";
import { ArticleRow, ContactBand, FaqSection, GoLink, Icon, LinkButton, LineButton, Lines, NotFound, PageHero, SectionTitle, lineUrl, paths, takeInquiryPreset, type Nav, type Page } from "./shared";
import { SolutionPage } from "./SolutionPage";
import { HeroScene, HeroVideo, MiniIcon, ServiceArt } from "./illustrations";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}


function safeDecode(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
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
  return safeDecode(window.location.pathname.replace(/^\/topics\//, "").replace(/\/+$/, ""));
}


function Logo({ navigate }: { navigate: Nav }) {
  return (
    <GoLink className="wordmark" go={navigate} args={["home"]} aria-label="ホームへ">
      <span className="logo-img logo-img-color">
        <img src="/images/logo-color-base.png" alt="COANA TOKYO LLC." width={198} height={34} />
        <img className="logo-feather" src="/images/logo-color-feather.png" alt="" aria-hidden="true" width={198} height={34} />
      </span>
      <span className="logo-img logo-img-white">
        <img src="/images/logo-white-base.png" alt="COANA TOKYO LLC." width={198} height={34} />
        <img className="logo-feather" src="/images/logo-white-feather.png" alt="" aria-hidden="true" width={198} height={34} />
      </span>
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
            {solutions.filter((sol) => !sol.hidden).map((sol) => (
              <GoLink key={sol.slug} go={navigate} args={["solution", undefined, sol.slug]}>{sol.nav_label}</GoLink>
            ))}
          </div>
        </nav>
      </div>
      <div className="container footer-bottom">
        <small className="footer-trademark">記載されている会社名・製品名・サービス名は、各社の商標または登録商標です。</small>
        <small>{settings.copyright}</small>
        <GoLink className="footer-privacy" go={navigate} args={["privacy"]}>プライバシーポリシー</GoLink>
      </div>
    </footer>
  );
}


/* ───────────────────────── Home: Hero ───────────────────────── */

function HeroSection({ navigate }: { navigate: Nav }) {
  const words: string[] = home.hero_words ?? ["経理", "業務フロー", "ツール導入", "営業・集客"];
  const [wordIndex, setWordIndex] = useState(0);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => setWordIndex((i) => (i + 1) % words.length), 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion, words.length]);
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker">{home.hero_kicker}</p>
          <h1 className="hero-title">
            <span className="hero-line"><span>{home.hero_line1}</span></span>
            <span className="hero-line"><span>{home.hero_line2}</span></span>
          </h1>
          <p className="hero-lead">
            <span className="hero-solve">
              {/* キーワードは同じ書体・太さのまま色だけ変える。読み上げ用には全キーワードを並べる */}
              <span className="visually-hidden">{words.join("・")}</span>
              <span className="hero-word" key={wordIndex} aria-hidden="true">{words[wordIndex]}</span>
              {home.hero_solve_text}
            </span>
            {home.hero_lead}
          </p>
          <div className="hero-actions">
            <GoLink className="hero-button" go={navigate} args={["contact"]}>{home.hero_button_primary}<Icon name="arrow" size={17} /></GoLink>
            <GoLink className="hero-textlink" go={navigate} args={["services"]}>{home.hero_button_secondary}<Icon name="arrow" size={15} /></GoLink>
          </div>
        </div>
        <div className="hero-visual art-line">
          <HeroVideo src={home.hero_video} fallback={<HeroScene />} />
        </div>
      </div>
      <div className="container">
        <ul className="hero-meta">
          {home.hero_badges.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── サービスカード（トップ・サービス一覧で共通） ───────────────────────── */

type ServiceItem = { name: string; text: string; short?: string; tags?: string[]; page?: string };
const serviceGroups = [
  { key: "backoffice", n: "01", data: services.backoffice },
  { key: "marketing", n: "02", data: services.marketing },
] as const;

function ServiceCard({ item, navigate, detail = false }: { item: ServiceItem; navigate: Nav; detail?: boolean }) {
  const linked = item.page && solutions.some((sol) => sol.slug === item.page);
  const body = (
    <>
      <ServiceArt slug={item.page} className="service-card-art" />
      <span className="service-card-body">
        <strong>{item.name}</strong>
        <span className="service-card-text">{detail ? item.text : item.short || item.text}</span>
        {item.tags?.map((t) => <em className="service-tag" key={t}>{t}</em>)}
      </span>
      {linked && <span className="service-card-more">詳しく見る<Icon name="arrow" size={16} /></span>}
    </>
  );
  return linked
    ? <GoLink className={detail ? "service-card is-detail" : "service-card"} go={navigate} args={["solution", undefined, item.page]}>{body}</GoLink>
    : <div className={detail ? "service-card is-detail" : "service-card"}>{body}</div>;
}

function ServiceGroupHead({ n, data }: { n: string; data: { en: string; title: string; note: string; lead: string } }) {
  return (
    <header className="service-group-head">
      <span className="service-num">{n}</span>
      <div>
        <p className="service-en">{data.en}<em>{data.note}</em></p>
        <h3>{data.title}</h3>
      </div>
      <p className="service-tagline">{data.lead}</p>
    </header>
  );
}

function ServicesHome({ navigate }: { navigate: Nav }) {
  return (
    <section className="section services-home" id="services">
      <div className="container">
        <SectionTitle en="Services" center lead={home.services_lead}>{home.services_title}</SectionTitle>
        {serviceGroups.map(({ key, n, data }) => (
          <div className="service-group" key={key}>
            <ServiceGroupHead n={n} data={data} />
            <div className="service-card-grid">
              {(data.items as ServiceItem[]).map((item) => <ServiceCard key={item.name} item={item} navigate={navigate} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Home: 支援スタイル（選ばれる理由・ツール・ミッションを統合） ───────────────────────── */

function StyleSection() {
  return (
    <section className="section style-section">
      <div className="container">
        <div className="style-head" data-reveal>
          <span className="eyebrow">Our style</span>
          <p className="style-mission"><Lines text={about.message_heading} /></p>
          <h2 className="style-title">{home.strengths_title}</h2>
        </div>
        <ul className="style-grid">
          {home.strengths.map((s) => (
            <li key={s.title}>
              <span className="style-icon"><MiniIcon name={s.icon} size={30} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ul>
        <div className="style-tools">
          <p className="style-tools-title">{home.tools_title}</p>
          <ul>
            {home.tools.map((t) => (
              <li key={t.name} title={t.category}>
                {/* ロゴは各社のブランド規約で第三者の掲載が認められているものだけ設定する。未設定のツールは名称を文字で表示 */}
                {t.logo ? <img src={t.logo} alt={t.name} loading="lazy" /> : <span>{t.name}</span>}
              </li>
            ))}
          </ul>
          {home.tools_note && <small>{home.tools_note}</small>}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Home: Topics ───────────────────────── */

function TopicsHome({ navigate }: { navigate: Nav }) {
  const latest = articles.slice(0, 3);
  return (
    <section className="section topics-home">
      <div className="container">
        <div className="title-with-link">
          <SectionTitle en="Topics" lead={home.topics_lead}>{home.topics_title}</SectionTitle>
          <GoLink className="text-link" go={navigate} args={["topics"]}>一覧を見る<Icon name="arrow" size={19} /></GoLink>
        </div>
        {latest.length ? (
          <div className="topics-card-grid">
            {latest.map((a) => (
              <GoLink key={a.slug} className="topic-card" go={navigate} args={["article", undefined, a.slug]}>
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
          <div className="empty-topics">
            <span className="empty-icon"><Icon name="spark" /></span>
            <div><h3>お知らせは準備中です</h3><p>最新のお知らせはこちらでご案内します。</p></div>
          </div>
        )}
      </div>
    </section>
  );
}

function Home({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <HeroSection navigate={navigate} />
      <ServicesHome navigate={navigate} />
      <StyleSection />
      <TopicsHome navigate={navigate} />
      <FaqSection />
      <ContactBand navigate={navigate} />
    </main>
  );
}

/* ───────────────────────── About ───────────────────────── */

/* 代表メッセージ：冒頭の「」で始まる一文は引用として独立させ、本文の手動改行は外して自然に折り返す */
const [messageQuote, messageParagraphs] = (() => {
  const paras = about.message.map((p) => p.trim());
  const first = paras[0] ?? "";
  const m = first.match(/^(「[^」]+」)\n?([\s\S]*)$/);
  const flat = (t: string) => t.replace(/\n+/g, "");
  return m ? [m[1], [m[2], ...paras.slice(1)].filter(Boolean).map(flat)] : ["", paras.map(flat)];
})();

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="About us" title="会社概要" image={about.hero_image} />
      <section id="message" className="section message-section">
        <div className="container message-grid">
          <header className="message-head">
            <span className="section-index">01<i>Message</i></span>
            <h2><Lines text={about.message_heading} /></h2>
          </header>
          <div className="message-main">
            {messageQuote && <blockquote className="message-quote"><p>{messageQuote}</p></blockquote>}
            <div className="message-body">
              {messageParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <p className="signature">
              <span>{about.signature}</span>
              <small>{about.profile_name_en}</small>
            </p>
          </div>
        </div>
      </section>
      <section id="profile" className="section profile-section">
        <div className="container">
          <span className="section-index">02<i>Profile</i></span>
          <div className="profile-grid">
            <figure className="profile-photo">
              <span className="profile-photo-deco" aria-hidden="true" />
              <span className="profile-photo-dots" aria-hidden="true" />
              <div className="profile-photo-frame">
                <img src={about.profile_photo} alt={`COANA TOKYO代表 ${about.profile_name}`} />
              </div>
            </figure>
            <div>
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
          <div>
            <span className="section-index">03<i>Company</i></span>
            <h2>会社情報</h2>
          </div>
          <dl className="company-table">
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

const FLOW_ICONS = ["chat", "search", "plan", "start"];

function Services({ navigate }: { navigate: Nav }) {
  return (
    <main className="services-page">
      <PageHero en="Services" title="サービス" intro={services.intro} image={services.hero_image} />
      {serviceGroups.map(({ key, n, data }) => (
        <section key={key} id={key} className="section service-detail">
          <div className="container">
            <ServiceGroupHead n={n} data={data} />
            <div className="service-card-grid is-detail">
              {(data.items as ServiceItem[]).map((item) => <ServiceCard key={item.name} item={item} navigate={navigate} detail />)}
            </div>
          </div>
        </section>
      ))}
      <section className="section flow-section">
        <div className="container">
          <SectionTitle en="Flow" center>{services.flow_title}</SectionTitle>
          <ol className="flow-list">
            {services.flow.map((item, index) => (
              <li key={item}>
                <span className="flow-icon"><MiniIcon name={FLOW_ICONS[index] || "doc"} size={28} /></span>
                <small>STEP {index + 1}</small>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
          <div className="pricing-box">
            <span className="pricing-icon" aria-hidden="true">¥</span>
            <div>
              <h2>{services.pricing_title}</h2>
              <p>{services.pricing}</p>
            </div>
          </div>
          <div className="center-button">
            <LinkButton large go={navigate} args={["contact"]}>お問い合わせ</LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── Topics / Article ───────────────────────── */


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

// ご相談内容の種別：サービス別ページ（content/solutions）の名称を自動で選択肢にする
const INQUIRY_TYPES = [
  ...solutions.filter((sol) => sol.lang !== "en").map((sol) => sol.nav_label || sol.title),
  "Startup support (English)",
  "セミナー・研修の講師依頼",
  "その他",
];
function takePresetInquiryType() {
  const value = takeInquiryPreset();
  return INQUIRY_TYPES.includes(value) ? value : "";
}

function Contact() {
  const [data, setData] = useState<FormData>(() => ({ ...emptyForm, type: takePresetInquiryType() }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"input" | "confirm" | "complete">("input");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // スパム対策：人には見えない入力欄（website）に値が入っていたら送信せず完了扱いにする
  const [honeypot, setHoneypot] = useState("");
  const send = async () => {
    setSending(true);
    setSendError("");
    try {
      if (honeypot) { setStep("complete"); return; }
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 20000);
      const body = new URLSearchParams({
        company: data.company,
        name: data.name,
        email: data.email,
        type: data.type,
        message: data.message,
        consent: data.consent ? "同意する" : "",
      });
      const res = await fetch(CONTACT_ENDPOINT, { method: "POST", body, signal: controller.signal }).finally(() => window.clearTimeout(timer));
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
              <p>公式LINEからも、ご相談・お問い合わせいただけます。</p>
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
              {INQUIRY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <div className="form-honeypot" aria-hidden="true">
            <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
          </div>
          <Field label="お問い合わせ内容" error={errors.message}>
            <textarea value={data.message} onChange={(e) => update("message", e.target.value)} rows={7} placeholder="ご相談内容をご入力ください" aria-invalid={!!errors.message} />
          </Field>
          <label className="consent">
            <input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} />
            <span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する <b>必須</b></span>
          </label>
          <p className="form-lang-note">English inquiries are welcome. Please write your message in English and we will reply in English.</p>
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
    // 検索結果に表示されるタイトル（ビルド時に各ページの HTML へ書き出すタイトルと揃える）
    const titles: Record<Page, string> = { home: "", about: "会社概要・代表メッセージ", services: "サービス｜経理・バックオフィス改善、ITツール導入、マーケティング支援", topics: "トピックス｜セミナー登壇・メディア掲載・お知らせ", article: "トピックス", solution: "サービス", contact: "お問い合わせ｜バックオフィス・マーケティングのご相談", privacy: "プライバシーポリシー", notfound: "ページが見つかりません" };
    const base = "中小企業のバックオフィス・マーケティング支援 | COANA TOKYO合同会社（東京・港区）";
    if (page === "article" || page === "solution") return; // 記事・サービス別ページは各ページのタイトルを優先
    document.title = titles[page] ? `${titles[page]} | COANA TOKYO合同会社` : base;
  }, [page, routeKey]);
  // URLに #message などの指定があれば、ページが描画されたあとにその位置までスクロールする（初回表示とサイト内移動の両方）
  useEffect(() => {
    const hash = safeDecode(window.location.hash.slice(1));
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
      // 画面に入る少し手前で表示を始め、読みかけの部分が薄いまま残らないようにする
      { threshold: 0, rootMargin: "0px 0px 12% 0px" },
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
