import { Fragment, useEffect, useState, type ReactNode } from "react";
import { articles, home, inquiryTypeOf, solutions, type Article, type Solution } from "./content";
import { ContactBand, DiagnoseLink, GoLink, Icon, LineButton, Lines, NotFound, openChat, setInquiryPreset, type Nav } from "./shared";
import { CHAT_MARK } from "./chat/ChatLauncher";
import { HeroVideo, ServiceArt } from "./illustrations";
import { LpIcon } from "./lpIcons";
import { HeroArt, MoodFace, PointArt, SpotIcon, WorryArt, caseArtName } from "./lpArt";

/* ───────────────────────── サービス別ランディングページ ─────────────────────────
 * content/solutions/*.json（CMS「サービス別ページ」）の内容を描画する。
 *
 * 2026-11-22 オーナー依頼で、デザインをゼロから作り直した（「文字ばかりで AI っぽく、最後まで読まれない。
 * 図・絵を増やして、直感的に分かるように。不要なものは削ってよい」）。
 * 章の順：ヒーロー（絵つき）→ お悩み → 特徴（3つ）→ 仕組みの図 → 支援事例 または Before／After
 *        → 料金 → ご利用の流れ → よくあるご質問 → お問い合わせの帯 → 関連するコラム・ほかのサービス。
 * - どの章も「絵・図・アイコン＋短い言葉」で見せる。文章は CMS のものをそのまま使い、コードで文字を足さない。
 * - 動きは、画面に入ったときの表示（data-reveal）と、絵がゆっくり浮く動きだけ（スクロールには連動させない）。
 * - 見た目は src/lpx.css（クラスは lpx-）。絵は src/lpArt.tsx、アイコンは src/lpIcons.tsx。
 */

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
    home: "ホーム",
    services: "サービス",
    consult: "無料で相談する",
    consultLine: "LINEで気軽に相談",
    heroNote: "ご相談・お見積もりは無料。全国オンライン対応。",
    facts: "サービスの特徴",
    kWorry: "お悩み",
    problems: "こんなお悩みはありませんか",
    bridge: ["そのお悩み、", "COANA TOKYO", "にご相談ください。"],
    kPoints: "特徴",
    points: (n: number) => (n === 3 ? "COANA TOKYOの3つの特徴" : "COANA TOKYOの特徴"),
    point: "特徴",
    kScheme: "仕組み",
    scheme: "支援の仕組み",
    clientLane: "御社がやること",
    teamLane: "COANA TOKYOがやること",
    clientTag: "御社",
    relayTodo: "やること",
    relayGoal: "受け取るもの",
    cycle: "毎月くり返し",
    kCases: "事例",
    cases: "支援事例",
    casesLead: "仕組みの作り方が伝わりやすい例を選んでご紹介します。お客さまの社名は伏せています。",
    result: "結果",
    kBa: "Before / After",
    baTitle: "導入すると、\nこう変わる。",
    baBefore: "Before",
    baAfter: "After",
    kPlans: "料金",
    pricing: "プランと料金の目安",
    plans: "ご利用プランの例",
    plansNote: "料金は業務範囲に応じて個別にお見積もりします。一部の業務だけのご相談も歓迎です。",
    priceNote: "金額はすべて税別の目安です。正式な金額は、業務の量と範囲を伺ってお見積もりします（ご相談・お見積もりは無料）。",
    bestFor: "こんな方に",
    scope: "ご依頼いただける業務の一覧",
    scopeOpen: "業務の一覧を見る",
    scopeClose: "閉じる",
    count: (n: number) => `（${n}件）`,
    tools: "対応ツールの例",
    kFlow: "流れ",
    flow: "ご利用の流れ",
    kFaq: "FAQ",
    faq: "よくあるご質問",
    bigCta: "相談する。",
    ctaTitle: "まずは、現状をお聞かせください。",
    ctaText: "ご相談・お見積もりは無料です。何から相談すればいいか分からない段階でも大丈夫です。",
    ctaButton: "無料相談・お問い合わせ",
    column: "関連するコラム",
    columnMore: "コラムをもっと見る",
    others: "そのほかのサービス",
    allServices: "サービス一覧を見る",
    sticky: "無料で相談する",
    chat: "COANA TOKYO サポートチームにチャットで相談する",
    crumbs: "パンくずリスト",
  },
  en: {
    home: "Home",
    services: "Services",
    consult: "Book a free consultation",
    consultLine: "Chat on LINE",
    heroNote: "Consultation and quotes are free. Available online nationwide, in English.",
    facts: "Key points",
    kWorry: "Challenges",
    problems: "Sound familiar?",
    bridge: ["Talk to ", "COANA TOKYO", ". We sort these out with you, step by step."],
    kPoints: "Why us",
    points: (_n: number) => "What makes COANA TOKYO different",
    point: "Point",
    kScheme: "How it works",
    scheme: "How it works",
    clientLane: "Your part",
    teamLane: "COANA TOKYO handles",
    clientTag: "You",
    relayTodo: "Your part",
    relayGoal: "What you get",
    cycle: "Every month",
    kCases: "Case studies",
    cases: "Case studies",
    casesLead: "A few examples chosen to show how we work. Client names are withheld.",
    result: "Result",
    kBa: "Before / After",
    baTitle: "Here is\nthe difference.",
    baBefore: "Before",
    baAfter: "After",
    kPlans: "Pricing",
    pricing: "Plans & pricing",
    plans: "Example plans",
    plansNote: "Pricing is quoted individually based on scope. Small or partial engagements are welcome.",
    priceNote: "All prices are estimates, excluding tax. We send a formal quote after a free consultation.",
    bestFor: "Best for",
    scope: "Examples of what you can ask us",
    scopeOpen: "See the full list",
    scopeClose: "Close",
    count: (n: number) => ` (${n})`,
    tools: "Tools we work with",
    kFlow: "Steps",
    flow: "How to get started",
    kFaq: "FAQ",
    faq: "FAQ",
    bigCta: "Let’s talk.",
    ctaTitle: "Tell us where you are. We will take it from there.",
    ctaText: "Consultation and quotes are free. If you are not sure where to start, that is exactly where we begin.",
    ctaButton: "Contact us (free consultation)",
    column: "Related articles",
    columnMore: "See more articles",
    others: "Other services (Japanese pages)",
    allServices: "See all services",
    sticky: "Free consultation",
    chat: "Chat with the COANA TOKYO support team",
    crumbs: "Breadcrumb",
  },
};
type Lang = keyof typeof LABELS;
type L10n = (typeof LABELS)[Lang];
const langOf = (sol: Solution): Lang => (sol.lang === "en" ? "en" : "ja");
/** お問い合わせへ遷移する前に相談種別を記録する navigate */
const withInquiry = (sol: Solution, navigate: Nav): Nav => (...args) => {
  if (args[0] === "contact") setInquiryPreset(inquiryTypeOf(sol));
  navigate(...args);
};

/** 見出しのうち、いちばん伝えたい言葉（CMS の「見出しで目立たせる言葉」）だけ色を変える。
 *  見出しにその言葉がなければ、そのまま表示する（文字は足さない） */
function MarkedTitle({ text, mark }: { text: string; mark?: string }) {
  const at = mark ? text.indexOf(mark) : -1;
  if (!mark || at < 0) return <Lines text={text} />;
  return <>{text.slice(0, at)}<em className="lpx-mark">{mark}</em>{text.slice(at + mark.length)}</>;
}

/** 社名（COANA TOKYO）の途中で行が折れないようにする（文字は足さない） */
function Brand({ text }: { text: string }) {
  const parts = text.split("COANA TOKYO");
  return <>{parts.map((t, i) => <Fragment key={i}>{i > 0 && <span className="lpx-nb">COANA TOKYO</span>}{t}</Fragment>)}</>;
}

/** 章の見出し：小さなラベル → 見出し → 短い線 → リード文（中央寄せ） */
function Head({ kicker, children, lead, lang }: { kicker: string; children: ReactNode; lead?: string; lang?: string }) {
  return (
    <div className="lpx-head" data-reveal>
      <p className="lpx-kicker" lang={lang}>{kicker}</p>
      <h2>{children}</h2>
      {lead && <p className="lpx-head-lead"><Brand text={lead} /></p>}
    </div>
  );
}

const Chevron = () => <svg className="lpx-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
/** 図の中の矢印（PC は右向き、スマホは下向き：CSS で回す） */
const Arrow = ({ className = "" }: { className?: string }) => (
  <span className={`lpx-arrow ${className}`} aria-hidden="true">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
  </span>
);

/* ───────────────────────── 1. ヒーロー ───────────────────────── */

/** キャッチコピーの行。「**」で囲んだ部分に蛍光ペンの線を引く（囲みがなければ最後の行全体）。
 *  線を引くフレーズは途中で改行させず、入りきらない幅ではフレーズごと次の行へ送る（前後に改行位置 <wbr> を置く）。 */
function CatchLines({ text }: { text: string }) {
  const lines = text.split("\n");
  const marked = text.includes("**");
  return (
    <>
      {lines.map((line, i) => {
        const parts = marked ? line.split(/\*\*(.+?)\*\*/) : i === lines.length - 1 ? ["", line] : [line];
        return (
          <span key={i} className="lpx-hero-line">
            {parts.map((part, j) => (j % 2
              ? <Fragment key={j}><wbr /><span className="lpx-marker">{part}</span><wbr /></Fragment>
              : part))}
          </span>
        );
      })}
    </>
  );
}

function Hero({ sol, navigate, L }: { sol: Solution; navigate: Nav; L: L10n }) {
  const facts = sol.hero_facts ?? [];
  return (
    <section className="lpx-hero">
      <span className="lpx-hero-cloud is-1" aria-hidden="true" /><span className="lpx-hero-cloud is-2" aria-hidden="true" />
      <div className="container lpx-hero-inner">
        <div className="lpx-hero-copy">
          <nav className="lpx-crumbs" aria-label={L.crumbs}><GoLink go={navigate} args={["home"]}>{L.home}</GoLink><span aria-hidden="true">/</span><GoLink go={navigate} args={["services"]}>{L.services}</GoLink><span aria-hidden="true">/</span><span>{sol.nav_label}</span></nav>
          <p className="lpx-hero-label">{sol.nav_label}</p>
          <h1 className="lpx-hero-title">{sol.catch ? <CatchLines text={sol.catch} /> : sol.title}</h1>
          <p className="lpx-hero-lead"><Lines text={sol.lead} /></p>
          <div className="lpx-hero-actions">
            <GoLink className="button button-large lpx-primary" go={navigate} args={["contact"]}>
              {L.consult}<Icon name="arrow" size={19} />
            </GoLink>
            <LineButton place="solution_hero" label={L.consultLine} />
          </div>
          <p className="lpx-hero-note">{sol.hero_note || L.heroNote}</p>
          {sol.english?.slug && (
            <GoLink className="lpx-hero-english" go={navigate} args={["solution", undefined, sol.english.slug]}>
              <LpIcon name="globe" size={17} />{sol.english.button || "English page"}<Icon name="arrow" size={15} />
            </GoLink>
          )}
        </div>
        {/* CMS で動画を設定したときは、絵の代わりに動画を表示する */}
        <div className="lpx-hero-art" data-live><HeroVideo src={sol.hero_video} className="lpx-hero-video" fallback={<HeroArt slug={sol.slug} />} /></div>
        {facts.length > 0 && (
          <ul className="lpx-hero-facts" aria-label={L.facts}>
            {facts.map((f) => (
              <li key={f.value}><span className="lpx-fact-check"><Icon name="check" size={16} /></span><span><strong>{f.value}</strong><small>{f.label}</small></span></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── 2. お悩み ───────────────────────── */

function Worries({ sol, L }: { sol: Solution; L: L10n }) {
  const items = sol.problems ?? [];
  if (!items.length) return null;
  return (
    <section className="lpx-section lpx-worry">
      <div className="container">
        <Head kicker={L.kWorry}>{sol.problems_title || L.problems}</Head>
        <div className={`lpx-worry-stage is-${Math.min(items.length, 4)}`}>
          <div className="lpx-worry-art" data-live><WorryArt /></div>
          <ul className="lpx-worry-list">
            {items.slice(0, 4).map((p, i) => (
              <li key={p} data-reveal style={{ ["--d" as string]: `${(i * 0.08).toFixed(2)}s` }}><span className="lpx-worry-mark" aria-hidden="true"><Icon name="check" size={15} /></span><span>{p}</span></li>
            ))}
          </ul>
        </div>
        <div className="lpx-bridge" data-reveal>
          <span className="lpx-bridge-arrow" aria-hidden="true" />
          <p>{L.bridge[0]}<strong>{L.bridge[1]}</strong>{L.bridge[2]}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 3. 特徴 ───────────────────────── */

function Points({ sol, L }: { sol: Solution; L: L10n }) {
  const points = sol.scheme?.points ?? [];
  if (!points.length) return null;
  const num = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <section className="lpx-section lpx-points">
      <div className="container">
        <Head kicker={L.kPoints}>{L.points(points.length)}</Head>
        <ul className={`lpx-point-grid is-${Math.min(points.length, 4)}`}>
          {points.map((p, i) => (
            <li key={p.name} className="lpx-point" data-reveal style={{ ["--d" as string]: `${(i * 0.1).toFixed(2)}s` }}>
              <div className="lpx-point-art"><PointArt name={p.icon} tone={i === 1 ? "warm" : "sky"} /></div>
              <p className="lpx-point-no"><span>{L.point}</span>{num(i)}</p>
              <h3>{p.name}</h3>
              <p className="lpx-point-text">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── 4. 仕組みの図 ───────────────────────── */

type Scheme = NonNullable<Solution["scheme"]>;
type SchemeNode = NonNullable<Scheme["nodes"]>[number];

/** 一本の流れ：番号・アイコンの絵・短い言葉を、矢印でつなぐ */
function SchemeSteps({ nodes }: { nodes: SchemeNode[] }) {
  return (
    <ol className={`lpx-steps is-${Math.min(nodes.length, 6)}`} data-reveal>
      {nodes.map((st, i) => (
        <li key={st.label}>
          <span className="lpx-step-art"><SpotIcon name={st.icon} tone={i === nodes.length - 1 ? "warm" : "sky"} size={96} /><b>{i + 1}</b></span>
          <strong>{st.label}</strong>
          {st.sub && <span className="lpx-step-sub">{st.sub}</span>}
        </li>
      ))}
    </ol>
  );
}

/** 2つの段（御社がやること／COANA TOKYO がやること）：工程を左から順に置き、誰の仕事かを段で見せる。スマホは縦に1列で、札で見分ける */
function SchemeLanes({ scheme, L }: { scheme: Scheme; L: L10n }) {
  const nodes = scheme.nodes ?? [];
  const clientLabel = scheme.client_label || L.clientLane;
  const teamLabel = scheme.team_label || L.teamLane;
  return (
    <div className="lpx-lanes-wrap" data-reveal>
      <div className="lpx-lanes" style={{ ["--n" as string]: nodes.length }}>
        <div className="lpx-lane-bg is-client" aria-hidden="true" />
        <div className="lpx-lane-bg is-team" aria-hidden="true" />
        <p className="lpx-lane-label is-client">{clientLabel}</p>
        <p className="lpx-lane-label is-team">{teamLabel}</p>
        <ol className="lpx-lane-list">
          {nodes.map((n, i) => {
            const who = n.who === "client" ? "client" : "team";
            // 次の工程への矢印の向き：同じ段なら右、段が変わるなら斜め下／斜め上
            const next = nodes[i + 1];
            const to = !next ? "" : (next.who === "client" ? "client" : "team") === who ? " to-same" : who === "client" ? " to-down" : " to-up";
            return (
              <li key={n.label} className={`lpx-lane-node is-${who}${to}`} style={{ gridColumn: i + 2, gridRow: who === "client" ? 1 : 2 }}>
                <span className="lpx-lane-who">{who === "client" ? L.clientTag : "COANA TOKYO"}</span>
                <span className="lpx-lane-icon"><LpIcon name={n.icon || "check"} size={26} /><b>{i + 1}</b></span>
                <strong>{n.label}</strong>
                {n.sub && <span className="lpx-lane-sub">{n.sub}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      {(scheme.cycle ?? []).length > 0 && (
        <div className="lpx-cycle">
          <span className="lpx-cycle-label"><LpIcon name="refresh" size={16} />{L.cycle}</span>
          <ol>{(scheme.cycle ?? []).map((c) => <li key={c.when}><b>{c.when}</b>{c.text}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

/** リレー：御社 → COANA TOKYO が担当する範囲（窓口 → 対応する領域）→ 御社が受け取るもの。
 *  提携の専門家など COANA TOKYO 以外の相手（partner）は破線の枠 */
function SchemeRelay({ scheme, L }: { scheme: Scheme; L: L10n }) {
  const areas = scheme.nodes ?? [];
  const returns = scheme.returns ?? [];
  const steps = scheme.steps ?? [];
  const inner = returns.slice(0, -1);
  const goal = returns.length ? returns[returns.length - 1] : null;
  return (
    <div className="lpx-relay" data-reveal>
      <div className="lpx-relay-side is-client">
        <SpotIcon name={scheme.client?.icon || "person"} tone="warm" size={92} />
        <strong>{scheme.client?.label}</strong>
        {scheme.client?.todo
          ? <span className="lpx-relay-todo"><em>{L.relayTodo}</em>{scheme.client.todo}</span>
          : scheme.client?.sub && <span className="lpx-relay-sub">{scheme.client.sub}</span>}
      </div>
      <div className="lpx-relay-link">{steps[0] && <span className="lpx-relay-step"><b>1</b>{steps[0]}</span>}<Arrow /></div>
      <div className="lpx-relay-team">
        <p className="lpx-relay-head">{scheme.team_label || L.teamLane}</p>
        <div className="lpx-relay-center">
          <span className="lpx-relay-center-icon"><LpIcon name={scheme.center?.icon || "users"} size={26} /></span>
          <span><strong>{scheme.center?.label || "COANA TOKYO"}</strong>{scheme.center?.sub && <small>{scheme.center.sub}</small>}</span>
        </div>
        {steps[1] && <p className="lpx-relay-step is-down"><b>2</b>{steps[1]}</p>}
        <ul className={`lpx-relay-areas is-${Math.min(areas.length, 5)}`}>
          {areas.map((a) => (
            <li key={a.label} className={a.partner ? "is-partner" : undefined}>
              <span className="lpx-relay-area-icon"><LpIcon name={a.icon || "check"} size={22} /></span>
              <strong>{a.label}</strong>
              {a.sub && <small>{a.sub}</small>}
            </li>
          ))}
        </ul>
        {inner.length > 0 && (
          <ul className="lpx-relay-inner">
            {inner.map((rt, i) => <li key={rt.label}><b>{i + 3}</b><strong>{rt.label}</strong>{rt.sub && <small>{rt.sub}</small>}</li>)}
          </ul>
        )}
      </div>
      {goal && (
        <>
          <div className="lpx-relay-link"><Arrow /></div>
          <div className="lpx-relay-side is-goal">
            <span className="lpx-relay-goal-tag">{L.relayGoal}</span>
            <SpotIcon name={goal.icon || "check"} tone="warm" size={92} />
            <strong>{goal.label}</strong>
            {goal.sub && <span className="lpx-relay-sub">{goal.sub}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function SchemeSection({ sol, L }: { sol: Solution; L: L10n }) {
  const scheme = sol.scheme;
  if (!scheme || !(scheme.nodes ?? []).length) return null;
  return (
    <section className="lpx-section lpx-scheme" id="lp-scheme">
      <div className="container">
        <Head kicker={L.kScheme} lead={scheme.lead}><MarkedTitle text={scheme.title || L.scheme} mark={scheme.title_mark} /></Head>
        {scheme.type === "lanes" ? <SchemeLanes scheme={scheme} L={L} />
          : scheme.type === "relay" ? <SchemeRelay scheme={scheme} L={L} />
          : <SchemeSteps nodes={scheme.nodes ?? []} />}
        {scheme.note && <p className="lpx-note">{scheme.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 5. 支援事例（社名を伏せた事例） ───────────────────────── */

function Cases({ sol, L }: { sol: Solution; L: L10n }) {
  const items = (sol.cases ?? []).filter((c) => c.client && c.title);
  if (!items.length) return null;
  return (
    <section className="lpx-section lpx-cases">
      <div className="container">
        <Head kicker={L.kCases} lead={sol.cases_lead ?? L.casesLead}>{sol.cases_title || L.cases}</Head>
        <ul className={`lpx-case-grid is-${Math.min(items.length, 3)}`}>
          {items.map((c, i) => (
            <li key={c.client + c.title} className="lpx-case" data-reveal style={{ ["--d" as string]: `${(i * 0.1).toFixed(2)}s` }}>
              <div className="lpx-point-art lpx-case-art"><PointArt name={caseArtName(c.client + " " + c.title, i)} /></div>
              <p className="lpx-case-client"><span>CASE {String(i + 1).padStart(2, "0")}</span>{c.client}</p>
              <h3>{c.title}</h3>
              <p className="lpx-case-text">{c.text}</p>
              {c.result && <p className="lpx-case-result"><span className="lpx-case-result-tag"><Icon name="check" size={14} />{L.result}</span><strong>{c.result}</strong></p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── 5'. Before／After（支援事例がない LP） ─────────────────────────
 * 左に「いま」、右に「任せたあと」を並べて、行ごとに見比べる（切り替えの操作はなし。最初から両方が読める） */

function BeforeAfter({ sol, L }: { sol: Solution; L: L10n }) {
  const ba = sol.before_after;
  const items = ba?.items ?? [];
  if (!ba || !items.length) return null;
  return (
    <section className="lpx-section lpx-ba-section" id="lp-ba">
      <div className="container">
        <Head kicker={L.kBa} lang="en"><Lines text={ba.title || L.baTitle} /></Head>
        <div className="lpx-ba" data-reveal>
          <div className="lpx-ba-heads" aria-hidden="true">
            <div className="lpx-ba-headcell is-before"><MoodFace mood="worry" /><p><b lang="en">{L.baBefore}</b>{ba.center_before && <span>{ba.center_before}</span>}</p></div>
            <div className="lpx-ba-headcell is-after"><MoodFace mood="smile" /><p><b lang="en">{L.baAfter}</b>{ba.center_after && <span>{ba.center_after}</span>}</p></div>
          </div>
          <ul className="lpx-ba-rows">
            {items.map((it) => (
              <li key={it.label}>
                <h3>{it.label}</h3>
                <div className="lpx-ba-cell is-before">
                  <span className="lpx-ba-status"><span className="visually-hidden">{L.baBefore}：</span>{it.before_status || "—"}</span>
                  <p>{it.before}</p>
                </div>
                <Arrow className="lpx-ba-arrow" />
                <div className="lpx-ba-cell is-after">
                  <span className="lpx-ba-status"><span className="visually-hidden">{L.baAfter}：</span><Icon name="check" size={13} />{it.after_status || ""}</span>
                  <p>{it.after}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {ba.note && <p className="lpx-note">{ba.note}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 6. プランと料金 ───────────────────────── */

function Plans({ sol, L }: { sol: Solution; L: L10n }) {
  const tools = sol.tools ?? [];
  const groups = sol.scope?.groups ?? [];
  const plans = sol.plans?.items ?? [];
  const scopeCount = groups.reduce((sum, g) => sum + (g.items?.length ?? 0), 0);
  const [scopeOpen, setScopeOpen] = useState(false);
  const hasPrice = plans.some((p) => p.price);
  if (!plans.length && !groups.length && !tools.length) return null;
  const planNote = sol.plans?.note || (hasPrice ? L.priceNote : L.plansNote);
  return (
    <section id="lp-support" className="lpx-section lpx-plans">
      <div className="container">
        <Head kicker={L.kPlans}>{sol.plans?.title || (hasPrice ? L.pricing : L.plans)}</Head>
        {plans.length > 0 && (
          <>
            <div className={`lpx-plan-grid is-${Math.min(plans.length, 3)}`} data-reveal>
              {plans.map((p) => (
                <article key={p.name} className={p.featured ? "lpx-plan is-featured" : "lpx-plan"}>
                  {p.tag && <span className="lpx-plan-tag">{p.tag}</span>}
                  <h3>{p.name}</h3>
                  {p.price && <p className="lpx-plan-price">{p.price}</p>}
                  {p.text && <p className="lpx-plan-text">{p.text}</p>}
                  {(p.includes ?? []).length > 0 && (
                    <ul>{(p.includes ?? []).map((it) => <li key={it}><Icon name="check" size={15} /><span>{it}</span></li>)}</ul>
                  )}
                  {p.best_for && <p className="lpx-plan-for"><span>{L.bestFor}</span>{p.best_for}</p>}
                </article>
              ))}
            </div>
            <p className="lpx-note lpx-plan-note"><LpIcon name="yen" size={16} /><span>{planNote}</span></p>
          </>
        )}

        {groups.length > 0 && (
          <details className="lpx-scope" onToggle={(e) => setScopeOpen(e.currentTarget.open)}>
            <summary>
              <LpIcon name="rules" size={18} />
              <span className="lpx-scope-title">{sol.scope?.title || L.scope}</span>
              <span className="lpx-scope-open">{scopeOpen ? L.scopeClose : L.scopeOpen + L.count(scopeCount)}<Chevron /></span>
            </summary>
            <div className="lpx-scope-grid">
              {groups.map((g) => (
                <div key={g.name} className="lpx-scope-card">
                  <h3><LpIcon name={g.icon || "check"} size={18} />{g.name}</h3>
                  <ul>{(g.items ?? []).map((it) => <li key={it}>{it}</li>)}</ul>
                </div>
              ))}
            </div>
          </details>
        )}
        {sol.scope?.note && <p className="lpx-note lpx-note-legal">{sol.scope.note}</p>}

        {tools.length > 0 && (
          <div className="lpx-tools">
            <p className="lpx-tools-title">{sol.tools_title || L.tools}</p>
            <ul>
              {tools.map((t) => {
                const logo = toolLogo(t);
                return (
                  <li key={t} className={logo ? "has-logo" : undefined}>
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

/* ───────────────────────── 7. ご利用の流れ ───────────────────────── */

/** ステップ名から絵のアイコンを選ぶ（決まらなければ順番で） */
function flowIcon(name: string, i: number, n: number) {
  const s = name.toLowerCase();
  if (/問い合わせ|ヒアリング|consult/.test(s) && i === 0) return "mail";
  if (/見積|提案|quote|roadmap|段取り/.test(s)) return "doc";
  if (/棚卸し|整理|plan|お金/.test(s)) return "search";
  if (/試作|作成|制作|デザイン|設計/.test(s)) return "layout";
  if (/設定|導入|準備|整備|移行|setup|立ち上げ/.test(s)) return "tools";
  if (/開始|スタート|公開|launch|運用/.test(s) && i < n - 1) return "rocket";
  if (/改善|定着|見直し|保守|フォロー|振り返り|support|サポート/.test(s)) return "refresh";
  return ["mail", "doc", "tools", "rocket", "refresh"][Math.min(i, 4)];
}

function Flow({ sol, L }: { sol: Solution; L: L10n }) {
  const steps = sol.flow ?? [];
  if (!steps.length) return null;
  return (
    <section className="lpx-section lpx-flow">
      <div className="container">
        <Head kicker={L.kFlow}>{sol.steps_title || L.flow}</Head>
        <ol className={`lpx-flow-list is-${Math.min(steps.length, 6)}`} data-reveal>
          {steps.map((st, i) => (
            <li key={st.name}>
              <span className="lpx-flow-art"><SpotIcon name={flowIcon(st.name, i, steps.length)} tone={i === 0 ? "warm" : "sky"} size={88} /></span>
              <p className="lpx-flow-no"><span>STEP</span>{String(i + 1).padStart(2, "0")}</p>
              <h3>{st.name}</h3>
              {st.text && <p className="lpx-flow-text">{st.text}</p>}
            </li>
          ))}
        </ol>
        {sol.flow_note && <p className="lpx-note lpx-flow-note"><LpIcon name="clock" size={16} /><span>{sol.flow_note}</span></p>}
      </div>
    </section>
  );
}

/* ───────────────────────── 8. よくあるご質問 ───────────────────────── */

function Faq({ sol, L }: { sol: Solution; L: L10n }) {
  const items = sol.faqs ?? [];
  const [openIndex, setOpenIndex] = useState(0); // 最初の質問だけ開く。どれも閉じられる（-1）
  if (!items.length) return null;
  return (
    <section className="lpx-section lpx-faq">
      <div className="container lpx-faq-inner">
        <Head kicker={L.kFaq} lang="en">{sol.faq_title || L.faq}</Head>
        <div className="lpx-faq-list">
          {items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} className={open ? "lpx-faq-item is-open" : "lpx-faq-item"}>
                <h3>
                  <button type="button" className="lpx-faq-q" aria-expanded={open} aria-controls={`faq-a-${i}`} onClick={() => setOpenIndex(open ? -1 : i)}>
                    <span className="lpx-faq-mark" aria-hidden="true">Q</span>
                    <span className="lpx-faq-q-text">{item.q}</span>
                    <span className="lpx-faq-toggle" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path className="v" d="M12 5v14" /><path d="M5 12h14" /></svg></span>
                  </button>
                </h3>
                <div id={`faq-a-${i}`} className="lpx-faq-a" role="region" aria-label={item.q}>
                  <div className="lpx-faq-a-inner"><p><span className="lpx-faq-mark is-a" aria-hidden="true">A</span><span>{item.a}</span></p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 固定の相談バー ───────────────────────── */

function StickyCta({ sol, navigate, L }: { sol: Solution; navigate: Nav; L: L10n }) {
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
      {langOf(sol) === "ja" && (
        <button type="button" className="lp-sticky-chat" onClick={() => openChat("menu")} tabIndex={show ? 0 : -1} aria-label={L.chat}>
          <img src={CHAT_MARK} alt="" width={26} height={26} decoding="async" />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── ページ本体 ───────────────────────── */

/** 関連するコラムは3本まで（多いとページの終わりが長くなり、読み疲れる）。残りはトピックスの一覧へ */
const RELATED_MAX = 3;

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
  const lang = langOf(sol);
  const L = LABELS[lang];
  const related = (sol.related ?? [])
    .map((r) => articles.find((a) => a.slug === r))
    .filter((a): a is Article => Boolean(a));
  const others = solutions.filter((s) => s.slug !== sol.slug && !s.hidden);
  const hasCases = (sol.cases ?? []).some((c) => c.client && c.title);
  return (
    <main className={`lpx lpx-lang-${lang}`}>
      <Hero sol={sol} navigate={navigate} L={L} />
      <Worries sol={sol} L={L} />
      <Points sol={sol} L={L} />
      <SchemeSection sol={sol} L={L} />
      {/* 支援事例がある LP は事例を、ない LP（代行・創業支援）は Before／After を見せる（両方は出さない） */}
      {hasCases ? <Cases sol={sol} L={L} /> : <BeforeAfter sol={sol} L={L} />}
      <Plans sol={sol} L={L} />
      <Flow sol={sol} L={L} />
      <Faq sol={sol} L={L} />
      <ContactBand navigate={navigate} big title={sol.cta_title || L.ctaTitle} text={sol.cta_text || L.ctaText} bigText={L.bigCta} primary={L.ctaButton} line={L.consultLine} place="solution_cta" chat={lang === "ja"} lang={lang} />
      <section className="lpx-section lpx-more">
        <div className="container">
          {related.length > 0 && (
            <div className="lpx-more-block">
              <div className="lpx-more-head">
                <h2>{L.column}</h2>
                {related.length > RELATED_MAX && <GoLink className="lpx-more-all" go={navigate} args={["topics"]}>{L.columnMore}<Icon name="arrow" size={16} /></GoLink>}
              </div>
              <ul className="lpx-column-grid">
                {related.slice(0, RELATED_MAX).map((a) => (
                  <li key={a.slug}>
                    <GoLink className="lpx-column" go={navigate} args={["article", undefined, a.slug]}>
                      {a.thumbnail && <span className="lpx-column-thumb"><img src={a.thumbnail} alt="" loading="lazy" /></span>}
                      <span className="lpx-column-meta"><time dateTime={a.sortKey.slice(0, 10)}>{a.date}</time><i>{a.category}</i></span>
                      <strong>{a.title}</strong>
                    </GoLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="lpx-more-block">
            <div className="lpx-more-head">
              <h2>{L.others}</h2>
              <GoLink className="lpx-more-all" go={navigate} args={["services"]}>{L.allServices}<Icon name="arrow" size={16} /></GoLink>
            </div>
            <ul className="lpx-other-grid">
              {others.map((o) => (
                <li key={o.slug}>
                  <GoLink className="lpx-other" go={navigate} args={["solution", undefined, o.slug]}>
                    <ServiceArt slug={o.slug} className="lpx-other-art" />
                    <span>{o.nav_label}</span>
                  </GoLink>
                </li>
              ))}
            </ul>
            {lang === "ja" && <DiagnoseLink className="is-lpx" />}
          </div>
        </div>
      </section>
      <StickyCta sol={sol} navigate={navigate} L={L} />
    </main>
  );
}
