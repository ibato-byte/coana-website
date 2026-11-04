import { FormEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { about, articleService, articles, CATEGORIES, home, inquiryTypeOf, privacy, renderMarkdown, services, settings, solutions } from "./content";
import { ArticleRow, ContactBand, DiagnoseBanner, FaqSection, FlowLine, GoLink, Icon, LinkButton, LineButton, Lines, NotFound, PageHero, SectionTitle, lineUrl, NumHead, openChat, paths, setInquiryPreset, takeInquiryMessage, takeInquiryPreset, type Nav, type Page } from "./shared";
import { SolutionPage } from "./SolutionPage";
import { MiniIcon, ServiceArt } from "./illustrations";
import { LogoMark } from "./logo";
import { Feathers } from "./feathers";
// 診断の1問目（トップの「迷ったら」）。チャットのデータ全体ではなく diagnosis だけを読み込む
import { diagnosis } from "../content/chat.json";
import { ChatLauncher } from "./chat/ChatLauncher";

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


function Logo({ navigate, white = false }: { navigate: Nav; white?: boolean }) {
  return (
    <GoLink className="wordmark" go={navigate} args={["home"]} aria-label="COANA TOKYO ホームへ">
      <LogoMark white={white} />
    </GoLink>
  );
}

/* ───────────────────────── Header / Footer ───────────────────────── */

function Header({ page, navigate, en = false }: { page: Page; navigate: Nav; en?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
    ["services", "サービス", "Services"],
    ["about", "会社概要", "About"],
    ["topics", "トピックス", "Topics"],
  ];
  // PC のナビ（全ページ共通）：サービス／会社概要／トピックス＋相談する（オーナー指示：診断・進め方は入れない）。英語ページへのリンクはヘッダーに置かない（オーナー指示：英語表記は英語版の創業支援だけ）
  const navItems: [Page, string, string | undefined][] = [
    ["services", "サービス", undefined],
    ["about", "会社概要", undefined],
    ["topics", "トピックス", undefined],
  ];

  const go = (target: Page) => {
    setOpen(false);
    navigate(target);
  };
  return (
    // ヘッダーは日本語。英語ページ（英語版の創業支援）だけ英語にする（2026-11-01 オーナー指示「英語版も改善」。リンク先は日本語なので「(JP)」を添える）
    <header lang={en ? "en" : "ja"} className={scrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="header-inner">
        <Logo navigate={navigate} />
        <nav className="desktop-nav" aria-label={en ? "Main navigation" : "メインナビゲーション"}>
          {navItems.map(([target, label, hash]) => (
            <GoLink
              key={label}
              className={!hash && (page === target || (page === "article" && target === "topics") || (page === "solution" && target === "services")) ? "nav-link active" : "nav-link"}
              go={(...a) => { setOpen(false); navigate(...a); }} args={[target, hash]}
              aria-current={!hash && page === target ? "page" : undefined}
            >
              {en ? EN_NAV[target] : label}
            </GoLink>
          ))}
          <GoLink className="button button-small" go={go} args={["contact"]}>
            {en ? "Contact" : "相談する"}
            <Icon name="arrow" size={17} />
          </GoLink>
        </nav>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={en ? (open ? "Close menu" : "Open menu") : open ? "メニューを閉じる" : "メニューを開く"}
        >
          <span className="menu-button-bars" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <nav className="mobile-nav" id="mobile-nav" aria-label={en ? "Mobile navigation" : "モバイルナビゲーション"}>
          {([["home", "ホーム", "Top"], ...links] as [Page, string, string, string?][]).map(([target, label, en2, hash], i) => (
            <GoLink key={label} style={{ animationDelay: `${i * 0.05}s` }} go={(...a) => { setOpen(false); navigate(...a); }} args={[target, hash]}>
              {en ? <><span lang="en">{EN_NAV[target]}</span><small lang="ja">{label}</small></> : <><span>{label}</span><small lang="en">{en2}</small></>}
            </GoLink>
          ))}
          <GoLink className="mobile-nav-cta" style={{ animationDelay: "0.25s" }} go={go} args={["contact"]}>
            <span>{en ? "Free consultation" : "無料で相談する"}</span>
          </GoLink>
          <p className="mobile-nav-foot">{settings.company_name}</p>
        </nav>
      )}
    </header>
  );
}

/** ヘッダーの英語表記（英語ページのときだけ。リンク先は日本語のページ） */
const EN_NAV: Partial<Record<Page, string>> = { home: "Home (JP)", services: "Services (JP)", about: "About (JP)", topics: "Topics (JP)" };

/** フッターの英語表記（英語ページのときだけ。リンク先の各ページは日本語なので、その旨を見出しに添える） */
const FOOTER_EN = {
  tagline: "Engineering that makes the daily work of small businesses lighter.",
  company: "COANA TOKYO LLC.",
  address: "3F, 1-3-3 Kita-Aoyama, Minato-ku, Tokyo 107-0061, Japan",
  menuTitle: "Menu (in Japanese)",
  menu: ["Home", "About us", "Services", "Topics", "Contact"],
  servicesTitle: "Services (in Japanese)",
  trademark: "Company, product and service names mentioned on this site are trademarks or registered trademarks of their respective owners.",
  privacy: "Privacy policy (in Japanese)",
};

function Footer({ navigate, en = false }: { navigate: Nav; en?: boolean }) {
  const E = FOOTER_EN;
  return (
    <footer lang={en ? "en" : "ja"} className="site-footer">
      <div className="container footer-grid">
        <div className="footer-company">
          <Logo navigate={navigate} white />
          <p className="footer-tagline">{en ? E.tagline : settings.footer_tagline}</p>
          <p className="footer-address">{en ? E.company : settings.company_name}<br />{en ? E.address : <>{settings.postal_code} {settings.address}</>}</p>
          {/* メールアドレスはフッターのここだけに掲載する（CLAUDE.md） */}
          <a className="footer-mail" href={`mailto:${settings.email}`}><Icon name="mail" size={16} />{settings.email}</a>
        </div>
        <nav className="footer-links" aria-label={en ? "Footer navigation" : "フッターナビゲーション"}>
          <div>
            <p className="footer-links-title" lang="en">{en ? E.menuTitle : "Menu"}</p>
            {(["home", "about", "services", "topics", "contact"] as const).map((t, i) => (
              <GoLink key={t} go={navigate} args={[t]}>{en ? E.menu[i] : ["ホーム", "会社概要", "サービス", "トピックス", "お問い合わせ"][i]}</GoLink>
            ))}
          </div>
          <div className="footer-links-services">
            <p className="footer-links-title" lang="en">{en ? E.servicesTitle : "Services"}</p>
            {solutions.filter((sol) => !sol.hidden).map((sol) => (
              <GoLink key={sol.slug} go={navigate} args={["solution", undefined, sol.slug]}><span lang="ja">{sol.nav_label}</span></GoLink>
            ))}
            {/* 英語版の創業支援ページ（一覧には出さないが、全ページから辿れるようにする） */}
            {solutions.filter((sol) => sol.lang === "en").map((sol) => (
              <GoLink key={sol.slug} go={navigate} args={["solution", undefined, sol.slug]}><span lang="en">Startup support in English</span></GoLink>
            ))}
          </div>
        </nav>
      </div>
      <div className="container footer-bottom">
        <small className="footer-trademark">{en ? E.trademark : "記載されている会社名・製品名・サービス名は、各社の商標または登録商標です。"}</small>
        <GoLink className="footer-privacy" go={navigate} args={["privacy"]}>{en ? E.privacy : "プライバシーポリシー"}</GoLink>
        <small>{settings.copyright}</small>
      </div>
    </footer>
  );
}


/* ───────────────────────── Home（Signal Sky） ─────────────────────────
 * 構成：ヒーロー（整える。つくる。任せる。）→ 帯 → 01 できること → 02 支援事例 → 03 状況から探す → 04 支援スタイルと流れ → ツール → 05 トピックス → 06 FAQ → お問い合わせ
 * 動きの決まりは docs/motion-rules.md：スクロールに連動させない（ピン留めなし）。ヒーローのカードは画面に入っている間だけ約7秒ごとに切り替え、
 * カードの上でカーソルを動かしている・フォーカスしている間は止める。「動きを減らす」設定では切り替えない（言葉を押すと切り替わる）。
 */

/** サービスの性格（ヒーローの3つの言葉と、一覧の右端の札）。2026-10-31 打ち出しの見直し：整える（業務の棚卸し。2026-11-01 オーナー指示で「見直す」から変更）→ つくる（自動化・システム・ツール導入）→ 任せる（運用代行） */
const VERB_OF: Record<string, string> = {
  "it-consulting": "整える",
  automation: "つくる",
  "cloud-accounting": "整える",
  "web-production": "つくる",
  "startup-support": "整える",
  bookkeeping: "任せる",
  "backoffice-dx": "任せる",
  "sns-management": "任せる",
};

const VERBS = [
  { no: "01", en: "Organize", verb: "整える", kicker: "業務を整える", head: ["何から変えればいいか、", "一緒に決めます。"], text: "いまの仕事のやり方を伺い、「ここを変えるとラクになる」を費用の目安と一緒にお伝えします。会計ソフトの導入や開業準備のご相談も。", slugs: ["it-consulting", "cloud-accounting", "startup-support"] },
  { no: "02", en: "Build", verb: "つくる", kicker: "仕組みをつくる", head: ["毎月の同じ作業を、", "自動で終わるように。"], text: "Excelへの転記、毎月の集計、請求書づくり。くり返しの作業を自動にします。問い合わせが届くホームページもつくります。", slugs: ["automation", "web-production"] },
  { no: "03", en: "Operate", verb: "任せる", kicker: "運用を任せる", head: ["経理も事務もSNSも、", "必要な分だけ任せる。"], text: "記帳や請求、労務の手続き、SNSの投稿まで、担当者を決めて毎月代行します。「請求書だけ」など一部のご依頼も歓迎です。", slugs: ["bookkeeping", "backoffice-dx", "sns-management"] },
];
const VERB_INTERVAL_MS = 7000;
const VERB_FIRST_MS = 4200;

function HeroSection({ navigate }: { navigate: Nav }) {
  const [reduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [cur, setCur] = useState(0);
  const curRef = useRef(0);
  const [swap, setSwap] = useState(false);
  const [shown, setShown] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  // PC（幅1101px以上・高さ900px以上）ではデザイン案どおり、ヒーローを画面に固定し、スクロール量で言葉とカードを切り替える
  //（2026-10-23 オーナー決定。CLAUDE.md・docs/motion-rules.md の「ピン留め禁止」の例外）。それ以外の画面では自動で切り替える
  // 高さの条件は 2026-11-04 オーナー指示で 700px → 900px。固定すると言葉の大きさを画面の高さに収めるため、低い画面では
  //「整える。つくる。任せる。」が小さくなりバランスが崩れる（真ん中が空く・カードが文字に重なる）。低い画面は固定せず、言葉を大きいまま見せる
  const PIN_MQ = "(min-width: 1101px) and (min-height: 900px)";
  const [pinMode, setPinMode] = useState(() => !reduce && window.matchMedia(PIN_MQ).matches);
  const pinModeRef = useRef(pinMode);
  // 選ばれている言葉だけ白、ほかは輪郭。PC（ピン留め）だけでなくスマホ・タブレット（自動切り替え）でも同じ見せ方にして、いまどれかが分かるように（2026-10-23 オーナー指示）
  const [pinning, setPinning] = useState(true);
  // ブラウザの「戻る・進む」でページが保存された状態のまま戻ったとき（別サイトから戻ったときなど）も、鳩を最初から
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setReplay((n) => n + 1); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  // カードの中身は、いったん薄くしてから入れ替える（文字は 0.3 秒ほどで読める状態に戻る）
  const select = (i: number) => {
    if (i === curRef.current) return;
    curRef.current = i;
    setCur(i);
    if (reduce) { setShown(i); return; }
    setSwap(true);
    window.setTimeout(() => { setShown(i); setSwap(false); }, 220);
  };
  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia(PIN_MQ);
    const onMq = () => { pinModeRef.current = mq.matches; setPinMode(mq.matches); };
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);
  // ピン留めの間：進み具合（0〜1）を3つに分けて、言葉とカードを切り替える。選ばれていない言葉は最初から輪郭
  useEffect(() => {
    if (!pinMode) { setPinning(true); return; }
    const wrap = pinRef.current;
    if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const span = wrap.offsetHeight - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / span)) : 0;
      setPinning(true); // 案どおり、ピン留めの画面では最初から「選ばれている言葉だけ白、ほかは輪郭」
      select(Math.min(2, Math.floor(p * 3)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinMode]);
  /** 言葉を押したとき：ピン留め中はその言葉の位置までスクロール、それ以外はその場で切り替え */
  const choose = (i: number) => {
    const wrap = pinRef.current;
    if (pinModeRef.current && wrap) {
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const span = wrap.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + span * ((i + 0.5) / 3), behavior: "smooth" });
      return;
    }
    select(i);
  };
  useEffect(() => {
    if (reduce) return;
    const hero = heroRef.current;
    const card = cardRef.current;
    if (!hero || !card) return;
    let visible = true;
    let readUntil = 0;
    let timer = 0;
    let started = false;
    const tick = () => {
      if (!pinModeRef.current && visible && !document.hidden && Date.now() > readUntil) select((curRef.current + 1) % VERBS.length);
      timer = window.setTimeout(tick, VERB_INTERVAL_MS);
    };
    const begin = (wait: number) => { if (started) return; started = true; timer = window.setTimeout(tick, wait); };
    // 見出しを読む時間をとってから切り替え始める（どの入り方でも同じ）
    const fallback = window.setTimeout(() => begin(0), VERB_FIRST_MS + 1800);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(hero);
    // 読んでいる間だけ止める（カードの上でカーソルを動かした・フォーカスした。約2.5秒で再開。readingPause.ts と同じ考え方）
    const hold = () => { readUntil = Date.now() + 2500; };
    let last = { x: -1, y: -1 };
    const onMove = (e: PointerEvent) => { if (Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y) > 2) hold(); last = { x: e.clientX, y: e.clientY }; };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("focusin", hold);
    return () => { window.clearTimeout(timer); window.clearTimeout(fallback); io.disconnect(); card.removeEventListener("pointermove", onMove); card.removeEventListener("focusin", hold); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, replay]);
  const nameOf = (slug: string) => solutions.find((s) => s.slug === slug)?.nav_label || slug;
  return (
    <div className={pinMode ? "sky-hero-pin is-pin" : "sky-hero-pin"} ref={pinRef}>
    {/* 固定（PC）の間も、ヒーローと帯をひとかたまりで止める（帯だけが先に動いて「グイッ」と上がらないように） */}
    <div className="sky-hero-stick">
    <section className={pinning ? "hero sky-hero is-pinning" : "hero sky-hero"} ref={heroRef}>
      <Feathers />
      <div className="container sky-hero-top">
        <h1 className="sky-hero-title">
          <span className="hero-line">{home.hero_line1}</span>
          <span className="hero-line">
            {home.hero_line2}
          </span>
        </h1>
        <p className="sky-kicker" lang="en">{home.hero_kicker}</p>
      </div>
      <div className="container sky-hero-mid">
        <ul className="sky-verbs" aria-label="COANA TOKYOの支援">
          {VERBS.map((item, i) => (
            <li key={item.verb}>
              <button type="button" className={i === cur ? "sky-verb is-on" : "sky-verb"} aria-pressed={i === cur} onClick={() => choose(i)}>
                <small lang="en">{item.no} {item.en}</small>{item.verb}。
              </button>
            </li>
          ))}
        </ul>
        <div className={swap ? "sky-card is-swap" : "sky-card"} ref={cardRef} aria-live="polite">
          <div className="sky-card-prog" aria-hidden="true">{VERBS.map((_, i) => <i key={i} className={i <= cur ? "on" : ""} />)}</div>
          {/* 3つの内容を同じ場所に重ねて置き、見えているもの以外は visibility: hidden。カードの高さはいちばん長い内容に揃うので、
              切り替わってもヒーローの高さが変わらず、下の内容がずれない（2026-11-01：スマホで7秒ごとにページがずれていた） */}
          <div className="sky-card-stack">
            {VERBS.map((vv, i) => (
              <div key={vv.no} className={i === shown ? "sky-card-body is-on" : "sky-card-body"} aria-hidden={i === shown ? undefined : true}>
                <p className="sky-card-kicker">{vv.no} — {vv.kicker}</p>
                <h2 className="sky-card-title">{vv.head[0]}<br />{vv.head[1]}</h2>
                <p className="sky-card-text">{vv.text}</p>
                <ul className="sky-card-links">
                  {vv.slugs.filter((slug) => solutions.some((s) => s.slug === slug)).map((slug) => (
                    <li key={slug}><GoLink go={navigate} args={["solution", undefined, slug]} tabIndex={i === shown ? undefined : -1}>{nameOf(slug)}<Icon name="arrow" size={16} /></GoLink></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="container sky-hero-bottom">
        <div>
          <p className="hero-lead">{home.hero_lead}</p>
          <ul className="sky-chk">
            {home.hero_badges.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
        <div className="button-row">
          <LinkButton go={navigate} args={["contact"]}>{home.hero_button_primary}</LinkButton>
          <button type="button" className="button button-outline" onClick={() => openChat("diagnosis")}>状況から探す</button>
        </div>
      </div>
    </section>
    <SkyTape />
    </div>
    </div>
  );
}

/** ヒーローの下の帯（できることの見出し語）。画面に入っている間だけゆっくり流れ、スマホと「動きを減らす」設定では止まる */
function SkyTape() {
  const words = ["業務の棚卸し", "自動化", "ツール連携", "システム開発", "クラウド会計", "経理・事務の代行", "LP制作", "SNS運用"];
  return (
    <div className="sky-tape-wrap" aria-hidden="true">
      <div className="sky-tape" data-live>
        <div className="sky-tape-track">
          {[...words, ...words].map((w, i) => <span key={i}>{w}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── サービスカード（サービス一覧ページで使用） ───────────────────────── */

type ServiceItem = { name: string; text: string; short?: string; tags?: string[]; page?: string };
const serviceGroups = [
  { key: "build", n: "01", data: services.build },
  { key: "operate", n: "02", data: services.operate },
] as const;

/** detail：説明文（text）を出す。stack：絵を上、文章を下に積む縦型（サービス一覧ページ。3列で5＋3枚を並べる。2026-10-31） */
function ServiceCard({ item, navigate, detail = false, stack = false }: { item: ServiceItem; navigate: Nav; detail?: boolean; stack?: boolean }) {
  const linked = item.page && solutions.some((sol) => sol.slug === item.page);
  const cls = stack ? "service-card is-stack" : detail ? "service-card is-detail" : "service-card";
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
    ? <GoLink className={cls} go={navigate} args={["solution", undefined, item.page]}>{body}</GoLink>
    : <div className={cls}>{body}</div>;
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

/** 一覧の行の上で、カーソルについてくる黄色い丸「詳しく見る」（PC・マウスのみ。「動きを減らす」設定とタッチ端末では出さない）。
 *  行の上にいる間だけ追いかける（離れたら止める）。transform と位置だけを動かす */
function FollowLabel({ areaRef }: { areaRef: { current: HTMLElement | null } }) {
  const labelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const area = areaRef.current;
    const el = labelRef.current;
    if (!area || !el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false;
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      el.style.left = `${cx}px`; el.style.top = `${cy}px`;
      raf = on || Math.abs(x - cx) + Math.abs(y - cy) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      const hit = !!(e.target as Element | null)?.closest?.(".svc-row a");
      if (hit && !on) { if (!raf) { cx = x; cy = y; } }
      on = hit;
      el.classList.toggle("on", hit);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => { on = false; el.classList.remove("on"); };
    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onLeave, { passive: true });
    return () => { cancelAnimationFrame(raf); area.removeEventListener("pointermove", onMove); area.removeEventListener("pointerleave", onLeave); window.removeEventListener("scroll", onLeave); };
  }, [areaRef]);
  return <div className="follow-label" ref={labelRef} aria-hidden="true">詳しく<br />見る</div>;
}

function ServicesHome({ navigate }: { navigate: Nav }) {
  const items = serviceGroups.flatMap(({ data }) => data.items as ServiceItem[]);
  const rowsRef = useRef<HTMLUListElement | null>(null);
  return (
    <section className="section sky-section services-home" id="services">
      <div className="container">
        <NumHead n="01" title={home.services_title} side={<p>{home.services_lead}</p>} />
        <ul className="svc-rows" ref={rowsRef}>
          {items.map((item, i) => {
            const linked = item.page && solutions.some((sol) => sol.slug === item.page);
            const inner = (
              <>
                <span className="svc-row-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="svc-row-name">{item.name}</span>
                <span className="svc-row-text">{item.short || item.text}{item.tags?.map((t) => <em key={t}>{t}</em>)}</span>
                {item.page && VERB_OF[item.page] && <span className="svc-row-verb" aria-hidden="true">{VERB_OF[item.page]}。</span>}
              </>
            );
            return (
              <li key={item.name} className="svc-row" data-reveal style={{ ["--d" as string]: `${(i * 0.04).toFixed(2)}s` }}>
                {linked ? <GoLink go={navigate} args={["solution", undefined, item.page]}>{inner}</GoLink> : <div>{inner}</div>}
              </li>
            );
          })}
        </ul>
        <FollowLabel areaRef={rowsRef} />
        <p className="svc-rows-more"><GoLink className="text-link" go={navigate} args={["services"]}>サービス一覧を見る<Icon name="arrow" size={18} /></GoLink></p>
      </div>
    </section>
  );
}

/** 02 支援事例（2026-10-31 打ち出しの見直し）：お客さまの社名を伏せた事例を「前」→「後」＋結果で並べ、関係するサービスへつなぐ。
 *  「日々の支援のなかから選んだ例」として見せ、最後に「ほかにも仕組みにしてきた業務」を並べて、件数が少なく見えないようにする（件数の数字は書かない）。
 *  文言は content/home.json の cases / cases_more（CMS「トップページ」）。数字は作業記録にあるものだけ（CLAUDE.md：数字・実績を捏造しない） */
type CaseItem = { client: string; title: string; before: string; after: string; result?: string; note?: string; tools?: string[]; slugs?: string[] };
function CasesSection({ navigate }: { navigate: Nav }) {
  const h = home as { cases?: CaseItem[]; cases_title?: string; cases_lead?: string; cases_more_title?: string; cases_more?: string[] };
  const items = (h.cases ?? []).filter((e) => e.client && e.before && e.after);
  if (!items.length) return null;
  const more = (h.cases_more ?? []).filter(Boolean);
  const nameOf = (slug: string) => solutions.find((s) => s.slug === slug)?.nav_label;
  return (
    <section className="section sky-section case-section" id="cases">
      <div className="container">
        <NumHead n="02" title={<Lines text={h.cases_title || "支援事例"} />} side={<p>{h.cases_lead}</p>} />
        <ul className="case-grid">
          {items.map((e, i) => (
            <li key={e.client + e.title} className="case-card" data-reveal style={{ ["--d" as string]: `${(i * 0.06).toFixed(2)}s` }}>
              <p className="case-client"><span className="case-no" lang="en" aria-hidden="true">Case {String(i + 1).padStart(2, "0")}</span>{e.client}</p>
              <h3 className="case-title">{e.title}</h3>
              <div className="case-row is-before">
                <span className="case-tag" lang="en">Before</span>
                <p>{e.before}</p>
              </div>
              <span className="case-arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
              <div className="case-row is-after">
                <span className="case-tag" lang="en">After</span>
                <p>{e.after}</p>
              </div>
              {e.result && (
                <p className="case-result"><Icon name="check" size={16} /><span>{e.result}</span>{e.note && <small>{e.note}</small>}</p>
              )}
              {((e.tools ?? []).length > 0 || (e.slugs ?? []).some((s) => nameOf(s))) && (
                <div className="case-foot">
                  {(e.tools ?? []).length > 0 && <p className="case-tools" aria-label="使ったツール">{(e.tools ?? []).map((t) => <span key={t}>{t}</span>)}</p>}
                  {(e.slugs ?? []).some((s) => nameOf(s)) && (
                    <ul className="case-links" aria-label="関係するサービス">
                      {(e.slugs ?? []).filter((s) => nameOf(s)).map((s) => (
                        <li key={s}><GoLink go={navigate} args={["solution", undefined, s]}>{nameOf(s)}<Icon name="arrow" size={14} /></GoLink></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {more.length > 0 && (
          <div className="case-more" data-reveal>
            <p className="case-more-title">{h.cases_more_title || "ほかにも、こうした業務を仕組みにしてきました"}</p>
            <ul className="case-more-list" aria-label="仕組みにしてきた業務の例">
              {more.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** 03 サービスのご案内（2026-10-26 オーナー指示：「合う・合わない」ではなく、状況から該当するサービスを案内する）：サポートチャットの診断（content/chat.json）の1問目をここで答えられる。答えると、チャットがその続きから開く */
function FinderSection() {
  const q = diagnosis.questions[0];
  const total = diagnosis.questions.length;
  return (
    <section className="section sky-section sky-dark finder-section" id="finder">
      <div className="container">
        <NumHead n="03" title={<>状況から<br />サービスを探す</>} side={<p>{total}つの質問に答えると、いまの状況がどのサービスに当たるかをご案内します。約1分・個人情報の入力は不要です。</p>} />
        <div className="finder-grid">
          <p className="finder-big" data-reveal>どれを頼めばいいか、<br />分からないときに。<small>1問目を選ぶとチャットが開き、残りの質問にそのまま進めます。</small></p>
          <div className="finder-card" data-reveal>
            <div className="finder-card-top"><span lang="en">Service guide</span><span>Q1 / {total}</span></div>
            <h3>{q.text}</h3>
            <div className="finder-options">
              {q.options.map((o, i) => (
                <button key={o.label} type="button" onClick={() => openChat("diagnosis", i)}>{o.label}<b aria-hidden="true">{String.fromCharCode(65 + i)}</b></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 04 支援スタイル：大きな一文（会社概要のメッセージ見出し）＋4つの強み＋ご利用までの流れ */
const STYLE_KANJI: Record<string, [string, string]> = { expertise: ["業", "Workflow"], engineering: ["作", "Engineering"], operate: ["運", "Operation"], team: ["担", "Team"], "one-stop": ["窓", "One window"], flexible: ["適", "Right size"] };
const FLOW_TEXT = ["フォームまたはLINE公式アカウントから、ご相談内容をお送りください。", "担当者からご連絡し、現状の業務と困りごとを伺います。", "効くところから順に、必要な範囲に絞ってご提案します。", "ご納得いただけてからご契約し、支援を始めます。"];
function StyleSection() {
  const mission = (about.message_heading || "").split("\n").filter(Boolean);
  return (
    <section className="section sky-section style-section" id="style">
      <div className="container">
        <NumHead n="04" title={<>{mission.map((line, i) => <span key={i} className="num-head-line">{line}</span>)}</>} side={<p>{home.strengths_title}</p>} />
        <ul className="poster-grid">
          {home.strengths.map((s, i) => {
            const [k, en] = STYLE_KANJI[s.icon] || ["", ""];
            return (
              <li key={s.title} className="poster-card" data-reveal style={{ ["--d" as string]: `${(i * 0.06).toFixed(2)}s` }}>
                {k && <span className="poster-kanji" aria-hidden="true">{k}</span>}
                {en && <span className="poster-en" lang="en">{en}</span>}
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            );
          })}
        </ul>
        <h3 className="visually-hidden">{services.flow_title}</h3>
        <ol className="step-poster">
          {services.flow.map((name, i) => (
            <li key={name} data-reveal style={{ ["--d" as string]: `${(i * 0.06).toFixed(2)}s` }}>
              <span className="step-poster-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <b>{name}</b>
              {FLOW_TEXT[i] && <p>{FLOW_TEXT[i]}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ToolBand() {
  return (
    <section className="tool-band">
      <div className="container tool-band-inner" data-reveal>
        <div>
          <p className="sky-mono" lang="en">Cloud tools</p>
          <h2>{home.tools_title}</h2>
          {home.tools_note && <p>{home.tools_note}</p>}
        </div>
        <ul className="tool-pills">
          {home.tools.map((t) => (
            <li key={t.name} title={t.category}>
              {/* デザイン案どおり、ツール名は文字で表示（CMS のロゴ画像は使わない） */}
              <span>{t.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TopicsHome({ navigate }: { navigate: Nav }) {
  const latest = articles.slice(0, 3);
  return (
    <section className="section sky-section topics-home">
      <div className="container">
        <NumHead n="05" title={home.topics_title} side={<GoLink className="text-link" go={navigate} args={["topics"]}>一覧を見る<Icon name="arrow" size={18} /></GoLink>} />
        {latest.length ? (
          <ul className="topic-tiles">
            {latest.map((a) => (
              <li key={a.slug} data-reveal>
                <GoLink className="topic-tile" go={navigate} args={["article", undefined, a.slug]}>
                  <span className="topic-tile-meta"><i>{a.category}</i><time dateTime={a.sortKey.slice(0, 10)}>{a.date}</time></span>
                  <strong>{a.title}</strong>
                  <span className="topic-tile-more" lang="en">READ<Icon name="arrow" size={15} /></span>
                </GoLink>
              </li>
            ))}
          </ul>
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
    <main className="home-page">
      <HeroSection navigate={navigate} />
      <ServicesHome navigate={navigate} />
      <CasesSection navigate={navigate} />
      <FinderSection />
      <StyleSection />
      <ToolBand />
      <TopicsHome navigate={navigate} />
      <FaqSection numbered="06" />
      <ContactBand navigate={navigate} big />
    </main>
  );
}

/* ───────────────────────── About ───────────────────────── */

function About({ navigate }: { navigate: Nav }) {
  return (
    <main>
      <PageHero en="About us" title="会社概要" intro={about.intro} image={about.hero_image} imagePosition="left 45%" />
      {/* 代表のごあいさつ（2026-10-26 オーナー依頼：経歴は載せず、あいさつの形にする。代表の紹介は会社概要ページだけ）
          PC は写真（左）とあいさつ文（右）の2列。写真の下に名前、文の最後に署名。考え方の4つは、あいさつの後に横一列で */}
      <section id="message" className="section message-section">
        <div className="container">
          <div className="greeting">
            <div className="greeting-side">
              {about.profile_photo && (
                <figure className="profile-photo greeting-photo">
                  <span className="profile-photo-dots" aria-hidden="true" />
                  <div className="profile-photo-frame">
                    <img src={about.profile_photo} alt={`COANA TOKYO代表 ${about.profile_name}`} />
                  </div>
                </figure>
              )}
              <p className="greeting-name">
                <small>{about.profile_role}</small>
                <b>{about.profile_name}</b>
                <span lang="en">{about.profile_name_en}</span>
              </p>
            </div>
            <div className="greeting-main">
              <span className="section-index">01<i>Message</i></span>
              <h2><Lines text={about.message_heading} /></h2>
              <div className="message-body">
                {about.message.map((p, i) => <p key={i} className={i === 0 ? "greeting-lead" : undefined}><Lines text={p} /></p>)}
              </div>
              {/* 署名は出さない：名前は写真の下にあるため（2026-10-26 オーナー指摘：近くで重複している） */}
              {(about.profile ?? []).length > 0 && (
                <div className="profile-copy">
                  {about.profile.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              )}
            </div>
          </div>
          {/* 考え方の4つはトップに載っているため、会社概要では出さない（あいさつと会社情報の間をすっきりさせる） */}
        </div>
      </section>
      <section className="section company-section">
        <div className="container company-inner">
          <div>
            <span className="section-index">02<i>Company</i></span>
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
            <div className="service-card-grid is-stack">
              {(data.items as ServiceItem[]).map((item) => <ServiceCard key={item.name} item={item} navigate={navigate} detail stack />)}
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
      <PageHero en="Topics" title="トピックス" intro={(settings as { topics_intro?: string }).topics_intro} image={settings.topics_hero_image} />
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
  // つなぐサービス：記事からお問い合わせへ進んだとき、フォームの「ご相談内容」をそのサービスにしておく（サービスLPと同じ。お客さまが変更できる）
  const service = articleService(article);
  const presetInquiry = () => { if (service) setInquiryPreset(inquiryTypeOf(service)); };
  const onBodyClick = (e: { target: EventTarget }) => {
    const link = (e.target as Element).closest?.("a");
    if (link && new URL(link.href, location.href).pathname === "/contact") presetInquiry();
  };
  const navigateFromArticle: Nav = (...args) => { if (args[0] === "contact") presetInquiry(); navigate(...args); };
  const en = service?.lang === "en";
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
          <div className="article-body" onClick={onBodyClick}>
            <div dangerouslySetInnerHTML={{ __html: article.html }} />
          </div>
          {service && (
            <aside className="article-service" aria-labelledby="article-service-title">
              <p id="article-service-title" className="article-service-label">{en ? "Related service" : "この記事に関連するサービス"}</p>
              <GoLink className="article-service-card" go={navigate} args={["solution", undefined, service.slug]}>
                <ServiceArt slug={service.slug} className="article-service-art" />
                <span className="article-service-name">{service.nav_label}</span>
                <span className="article-service-more">{en ? "See the service" : "サービスの詳細を見る"}<Icon name="arrow" size={18} /></span>
              </GoLink>
            </aside>
          )}
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
      <ContactBand navigate={navigateFromArticle} />
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
            <FormSteps current={1} />
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
        <div className="container contact-layout">
        <aside className="contact-side" aria-label="フォーム以外のご相談方法">
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
          <div className="line-notice tel-notice">
            <p>お電話でのお問い合わせ<small>AIによる自動受付ののち、担当者より折り返しご連絡いたします。</small></p>
            <a className="tel-number" href="tel:050-5367-5192" onClick={() => window.gtag?.("event", "phone_click", { place: "contact_page" })}>
              <span className="tel-number__label">TEL</span>
              <span className="tel-number__digits">050-5367-5192</span>
            </a>
          </div>
          <div className="line-notice chat-notice">
            <p>まずはチャットで<small>サービスの違いや進め方など、気軽に質問できます。</small></p>
            <button type="button" className="button button-outline button-small" onClick={() => openChat("menu")}>チャットで質問する</button>
          </div>
          <p className="form-lang-note">English inquiries are welcome. Please write your message in English and we will reply in English.</p>
        </aside>
        <form className="form-wrap contact-form-card" name="contact" onSubmit={submit} noValidate>
          <FormSteps current={0} />
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
          {errors.consent && <p className="field-error consent-error">{errors.consent}</p>}
          <div className="center-button"><button className="button button-large" type="submit">入力内容を確認する <Icon name="arrow" size={19} /></button></div>
        </form>
        </div>
      </section>
    </main>
  );
}

/** お問い合わせフォームの進み具合（01 入力 → 02 確認 → 03 完了。デザイン案どおり） */
function FormSteps({ current }: { current: number }) {
  return (
    <ol className="form-steps" aria-label="お問い合わせの手順">
      {["入力", "確認", "完了"].map((label, i) => (
        <li key={label} className={i <= current ? "is-on" : undefined} aria-current={i === current ? "step" : undefined}><span lang="en">0{i + 1}</span>{label}</li>
      ))}
    </ol>
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
    // トップではヒーロー（PCはピン留めの間も）のボタンが見えている間は出さない（右下のボタンに重なるため）
    const onScroll = () => { const h = document.querySelector(".sky-hero-pin"); setShow(window.scrollY > 700 && !(h && h.getBoundingClientRect().bottom > window.innerHeight * 0.55)); };
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
    const titles: Record<Page, string> = { home: "", about: "会社概要・代表あいさつ", services: "サービス｜業務改善・自動化・システム開発、クラウド会計、経理・バックオフィス代行", topics: "トピックス｜業務効率化・クラウド会計のコラム・お知らせ", article: "トピックス", solution: "サービス", contact: "お問い合わせ｜業務の効率化・自動化・経理代行のご相談", privacy: "プライバシーポリシー", notfound: "ページが見つかりません" };
    const base = "中小企業の業務効率化・自動化・IT化支援｜経理代行・バックオフィス代行 | COANA TOKYO合同会社（東京・港区）";
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
  const isEnPage = page === "solution" && solutions.some((sol) => sol.lang === "en" && window.location.pathname.replace(/\/+$/, "") === "/services/" + sol.slug);
  return (
    <div className="app-shell">
      <Header page={page} navigate={navigate} en={isEnPage} />
      <div key={`${page}-${routeKey}`} className="page-fade">{content}</div>
      <Footer navigate={navigate} en={isEnPage} />
      <BackToTop />
      {/* サポートチャットは日本語だけなので、英語ページでは出さない（お問い合わせの帯・固定バーと同じ扱い） */}
      {!isEnPage && <ChatLauncher navigate={navigate} page={page} />}
    </div>
  );
}
