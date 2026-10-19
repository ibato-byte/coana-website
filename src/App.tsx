import { FormEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { about, articles, CATEGORIES, home, privacy, renderMarkdown, services, settings, solutions } from "./content";
import { ArticleRow, ContactBand, BirdArrow, DiagnoseBanner, FaqSection, FlowLine, GoLink, Icon, LinkButton, LineButton, Lines, NotFound, PageHero, SectionTitle, lineUrl, paths, takeInquiryMessage, takeInquiryPreset, type Nav, type Page } from "./shared";
import { SolutionPage } from "./SolutionPage";
import { HeroScene, HeroVideo, MiniIcon, ServiceArt } from "./illustrations";
import { ChatLauncher } from "./chat/ChatLauncher";
import { HeroDove } from "./heroDove";

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
    // ヘッダー・フッターは日本語。英語ページ（<html lang="en">）でも言語を正しく伝えるため lang="ja" を明示する
    <header lang="ja" className={scrolled ? "site-header is-scrolled" : "site-header"}>
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
          <GoLink className="button button-small button-fly" go={go} args={["contact"]}>
            お問い合わせ
            <BirdArrow size={17} />
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
    <footer lang="ja" className="site-footer">
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
            {/* 英語版の創業支援ページ（一覧には出さないが、全ページから辿れるようにする） */}
            {solutions.filter((sol) => sol.lang === "en").map((sol) => (
              <GoLink key={sol.slug} go={navigate} args={["solution", undefined, sol.slug]}><span lang="en">Startup support in English</span></GoLink>
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

/** ヒーローの回転ワード：最初の切り替えまでの時間（見出し→下線が引き終わってから）と、切り替えの間隔 */
const SOLVE_FIRST_MS = 3000;
const SOLVE_AFTER_DOVE_MS = 1000;
const SOLVE_INTERVAL_MS = 2600;

/** 「〇〇の悩みを、仕組みで解決。」のキーワード。古い語が上へ抜け、新しい語が下からマスク内に入る。
 *  紺のチップの幅は新しい語の幅へ同時に伸縮させ、後ろの文字が跳ねないようにする */
function SolveWords({ words, rest, dove }: { words: string[]; rest: string; dove: boolean }) {
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [state, setState] = useState({ cur: 0, prev: -1, tick: 0 });
  const [widths, setWidths] = useState<number[]>([]);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  // 各語のチップ幅を、同じ見た目の隠し要素で測る（フォント読み込み後・画面幅の変更時にも測り直す）
  useLayoutEffect(() => {
    const measure = () => {
      const el = measureRef.current;
      if (el) setWidths(Array.from(el.children).map((c) => Math.ceil((c as HTMLElement).getBoundingClientRect().width)));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [words]);
  useEffect(() => {
    if (reduceMotion || words.length < 2) return;
    let id = 0;
    const next = () => setState((s) => ({ cur: (s.cur + 1) % words.length, prev: s.cur, tick: s.tick + 1 }));
    // 下線の鳩がいるときは、このヒーローの鳩が飛び去ってから切り替え始める（どの入り方でも同じ順番）。
    // 鳩がいないとき（動きを減らす設定以外では基本ない）は SOLVE_FIRST_MS 後
    let first = 0;
    const begin = (wait: number) => {
      if (id) return; // もう切り替え始めている
      window.clearTimeout(first);
      first = window.setTimeout(() => { next(); id = window.setInterval(next, SOLVE_INTERVAL_MS); }, wait);
    };
    const hero = measureRef.current?.closest(".hero");
    const onDove = (e: Event) => {
      const line = (e as CustomEvent<Element | undefined>).detail;
      if (!line || hero?.contains(line)) begin(SOLVE_AFTER_DOVE_MS);
    };
    if (!dove) begin(SOLVE_FIRST_MS);
    window.addEventListener("coana:dove-done", onDove);
    return () => { window.clearTimeout(first); window.clearInterval(id); window.removeEventListener("coana:dove-done", onDove); };
  }, [reduceMotion, words.length, dove]);
  const { cur, prev, tick } = state;
  return (
    <p className="hero-solve">
      {/* 読み上げ用：すべてのキーワードを並べる（見た目の切り替え部分は読み上げない） */}
      <span className="visually-hidden">{words.join("、")}{rest}</span>
      <span className="solve-line" aria-hidden="true">
        <span className="solve-box" style={widths[cur] ? { width: widths[cur] } : undefined}>
          {prev >= 0 && <span key={"out" + tick} className="solve-word is-out">{words[prev]}</span>}
          <span key={"in" + tick} className={tick ? "solve-word is-in" : "solve-word"}>{words[cur]}</span>
        </span>
        <span className="solve-rest">{rest}</span>
      </span>
      <span className="solve-measure" ref={measureRef} aria-hidden="true">
        {words.map((w) => <span key={w} className="solve-word">{w}</span>)}
      </span>
    </p>
  );
}

function HeroSection({ navigate }: { navigate: Nav }) {
  const words: string[] = home.hero_words ?? ["経理", "業務フロー", "ツール導入", "営業・集客"];
  const [dove] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // ブラウザの「戻る・進む」でページが保存された状態のまま戻ったとき（別サイトから戻ったときなど）も、鳩と回転ワードを最初から
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setReplay((n) => n + 1); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker hero-anim"><span />{home.hero_kicker}</p>
          <h1>
            <span className="hero-line">{home.hero_line1}</span>
            <span className="hero-line">
              {/* 下線は、ヒーローが表示されるたびに鳩が引いて飛び去る（heroDove.tsx）。動きを減らす設定では最初から引かれた状態 */}
              <span key={replay} className={dove ? "title-underline is-dove" : "title-underline"}>{home.hero_line2}{dove && <HeroDove />}</span>
            </span>
          </h1>
          <SolveWords key={replay} words={words} rest={home.hero_solve_text} dove={dove} />
        </div>
        <div className="hero-visual hero-anim">
          <HeroVideo src={home.hero_video} fallback={<HeroScene />} />
        </div>
        <div className="hero-body hero-anim">
          <p className="hero-lead">{home.hero_lead}</p>
          <div className="button-row">
            <LinkButton go={navigate} args={["contact"]}>{home.hero_button_primary}</LinkButton>
            <LinkButton secondary go={navigate} args={["services"]}>{home.hero_button_secondary}</LinkButton>
          </div>
          <ul className="hero-badges">
            {home.hero_badges.map((b) => <li key={b}><Icon name="check" size={14} />{b}</li>)}
          </ul>
        </div>
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

/** サービスのまとまり（01 バックオフィス支援 など）の見出し。トップでは「COANA TOKYOにできること」（h2）の下なので h3、サービス一覧ページでは h2 */
function ServiceGroupHead({ n, data, level = 3 }: { n: string; data: { en: string; title: string; note: string; lead: string }; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <header className="service-group-head">
      <span className="service-num">{n}</span>
      <div>
        <p className="service-en">{data.en}<em>{data.note}</em></p>
        <Heading>{data.title}</Heading>
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
        {/* 01・02 を一通り見たあとに「迷ったら診断」 */}
        <DiagnoseBanner className="is-home" />
      </div>
    </section>
  );
}

/* ───────────────────────── Home: 支援スタイル（選ばれる理由・ツール・ミッションを統合） ───────────────────────── */

function StyleSection() {
  // 見出しは行ごとに現れる。背景にロゴの羽の線（一度だけ描く）と、画面内のときだけゆっくり動く光。
  // カードは順に立ち上がり、アイコンが線で描かれる。PC ではカーソルに合わせてわずかに傾き、光が追従する（motion.ts）
  const mission = (about.message_heading || "").split("\n");
  const delay = (i: number) => ({ ["--d" as string]: `${(i * 0.06).toFixed(2)}s` });
  return (
    <section className="section style-section" data-live>
      <div className="style-bg" aria-hidden="true">
        <span className="style-glow" />
        <svg className="style-wing" viewBox="0 0 240 340" data-draw data-reveal>
          <path d="M52 322C18 250 34 170 104 116c44-34 82-64 108-106 18 66 4 134-44 186-38 42-80 72-116 126Z" />
          <path d="M70 296c30-62 76-110 132-156" />
        </svg>
      </div>
      <div className="container">
        <div className="style-head">
          <span className="eyebrow" data-reveal>Our style</span>
          <p className="style-mission">
            {mission.map((line, i) => <span key={i} className="style-mission-line" data-reveal style={delay(i + 1)}>{line}</span>)}
          </p>
          <h2 className="style-title" data-reveal style={delay(mission.length + 1)}>{home.strengths_title}</h2>
        </div>
        <ul className="style-grid">
          {home.strengths.map((s, i) => (
            <li key={s.title} data-reveal style={delay(i)}>
              <div className="style-card" data-tilt>
                <span className="style-icon" data-draw style={{ ["--draw-d" as string]: `${(0.2 + i * 0.06).toFixed(2)}s` }}><MiniIcon name={s.icon} size={30} /></span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="style-tools" data-reveal>
          <p className="style-tools-title">{home.tools_title}</p>
          {/* ツールどうしを1本の線でつなぐ（線は飾り。ロゴは最初から表示） */}
          <div className="style-tools-row">
            <span className="style-tools-line" aria-hidden="true" />
            <ul>
              {home.tools.map((t) => (
                <li key={t.name} title={t.category}>
                  {/* ロゴは各社のブランド規約で第三者の掲載が認められているものだけ設定する。未設定のツールは名称を文字で表示 */}
                  {t.logo ? <img src={t.logo} alt={t.name} loading="lazy" /> : <span>{t.name}</span>}
                </li>
              ))}
            </ul>
          </div>
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

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="About us" title="会社概要" intro={about.intro} image={about.hero_image} imagePosition="left 45%" />
      <section id="message" className="section message-section">
        <div className="container narrow">
          <span className="section-index">01<i>Message</i></span>
          <h2><Lines text={about.message_heading} /></h2>
          <ul className="about-values">
            {home.strengths.map((s) => (
              <li key={s.title}><span className="style-icon"><MiniIcon name={s.icon} size={26} /></span>{s.title}</li>
            ))}
          </ul>
          <div className="message-body">
            {about.message.map((p, i) => <p key={i}><Lines text={p} /></p>)}
          </div>
          <p className="signature"><small>代表</small>{about.signature.replace(/^代表\s*/, "")}</p>
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
            <ServiceGroupHead n={n} data={data} level={2} />
            <div className="service-card-grid is-detail">
              {(data.items as ServiceItem[]).map((item) => <ServiceCard key={item.name} item={item} navigate={navigate} detail />)}
            </div>
          </div>
        </section>
      ))}
      {/* 01・02 を一通り見たあとに「迷ったら診断」 */}
      <div className="container diagnose-banner-wrap"><DiagnoseBanner /></div>
      <section className="section flow-section">
        <div className="container">
          {/* 料金の考え方 → 流れ → 「まずは無料相談から」のボタンで終わる（ページの最後を相談につなげる） */}
          <div className="pricing-box is-before-flow">
            <span className="pricing-icon" aria-hidden="true">¥</span>
            <div>
              <h2>{services.pricing_title}</h2>
              <p>{services.pricing}</p>
            </div>
          </div>
          <SectionTitle en="Flow" center>{services.flow_title}</SectionTitle>
          <FlowLine
            steps={services.flow.map((item, index) => ({ name: item, icon: <MiniIcon name={FLOW_ICONS[index] || "doc"} size={26} /> }))}
            stepLabel="STEP"
            lead="まずは無料相談から"
          >
            <LinkButton large go={navigate} args={["contact"]}>お問い合わせ</LinkButton>
          </FlowLine>
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

type FormData = { company: string; name: string; email: string; type: string; message: string; meeting: boolean; date1: string; date2: string; date3: string; consent: boolean };
const emptyForm: FormData = { company: "", name: "", email: "", type: "", message: "", meeting: false, date1: "", date2: "", date3: "", consent: false };
// 日程予約ツール（Googleカレンダーの予約スケジュールなど）の URL。CMS の「会社情報・共通設定」で入れると「日程を予約する」ボタンが出る
const BOOKING_URL = String((settings as { booking_url?: string }).booking_url || "");
/** 送信する本文：オンライン面談の希望と日時も、本文の末尾に書き添える（受信側の仕組みを変えずに届く） */
function messageWithMeeting(data: FormData) {
  if (!data.meeting) return data.message;
  const dates = [data.date1, data.date2, data.date3].map((d, i) => (d.trim() ? "第" + (i + 1) + "希望：" + d.trim() : "")).filter(Boolean);
  return data.message.trimEnd() + "\n\n【オンライン面談】希望する" + (dates.length ? "\n" + dates.join("\n") : "");
}

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
  // サービス別ページ・サポートチャットからの引き継ぎ（相談種別・本文）。お客さまが確認・編集してから送信する
  const [data, setData] = useState<FormData>(() => ({ ...emptyForm, type: takePresetInquiryType(), message: takeInquiryMessage() }));
  const [fromChat] = useState(() => data.message !== "");
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
        message: messageWithMeeting(data),
        meeting: data.meeting ? "希望する" : "",
        preferred_dates: [data.date1, data.date2, data.date3].map((d) => d.trim()).filter(Boolean).join(" / "),
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
              <div><dt>オンライン面談</dt><dd>{data.meeting ? "希望する" : "希望しない"}</dd></div>
              {data.meeting && <div><dt>ご希望の日時</dt><dd>{[data.date1, data.date2, data.date3].map((d, i) => (d.trim() ? "第" + (i + 1) + "希望：" + d.trim() : "")).filter(Boolean).join("\n") || "未入力"}</dd></div>}
            </dl>
            <div className="button-row form-actions">
              <LinkButton secondary onClick={() => setStep("input")}>入力内容を修正する</LinkButton>
              <button className="button button-fly" onClick={send} disabled={sending}>{sending ? "送信中…" : "送信する"}<BirdArrow /></button>
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
              <p>LINE公式アカウントからも、ご相談・お問い合わせいただけます。</p>
              <LineButton place="contact_page" />
            </div>
          )}
          {BOOKING_URL && (
            <div className="line-notice booking-notice">
              <p>オンライン面談の日程は、こちらから直接ご予約いただけます。</p>
              <a className="button button-outline" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">日程を予約する<Icon name="arrow" size={19} /></a>
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
            {fromChat && <span className="field-hint">チャットの内容を引き継いでいます。必要に応じて編集・削除してください。</span>}
            <textarea value={data.message} onChange={(e) => update("message", e.target.value)} rows={7} placeholder="ご相談内容をご入力ください" aria-invalid={!!errors.message} />
          </Field>
          <fieldset className="meeting-fieldset">
            <legend className="field-label">オンライン面談 <i className="optional">任意</i></legend>
            <label className="consent meeting-check">
              <input type="checkbox" checked={data.meeting} onChange={(e) => update("meeting", e.target.checked)} />
              <span>オンライン面談を希望する</span>
            </label>
            {data.meeting && (
              <div className="meeting-dates">
                <p className="field-hint">ご希望の日時があればご記入ください（任意）。担当者より日程をご連絡します。</p>
                {(["date1", "date2", "date3"] as const).map((key, i) => (
                  <label key={key} className="meeting-date">
                    <span>第{i + 1}希望</span>
                    <input value={data[key]} onChange={(e) => update(key, e.target.value)} placeholder="例）10月20日 14時〜" maxLength={60} />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <label className="consent">
            <input type="checkbox" checked={data.consent} onChange={(e) => update("consent", e.target.checked)} />
            <span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する <b>必須</b></span>
          </label>
          <p className="form-lang-note">English inquiries are welcome. Please write your message in English and we will reply in English.</p>
          {errors.consent && <p className="field-error consent-error">{errors.consent}</p>}
          <div className="center-button"><button className="button button-large" type="submit">入力内容を確認する <Icon name="arrow" size={19} /></button></div>
        </form>
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
      <ChatLauncher navigate={navigate} page={page} />
    </div>
  );
}
