import { parse as parseYaml } from "yaml";
import { marked } from "marked";
import settingsJson from "../content/settings.json";
import homeJson from "../content/home.json";
import aboutJson from "../content/about.json";
import servicesJson from "../content/services.json";
import privacyJson from "../content/privacy.json";
// ビルド時に外部の写真（Unsplash など）を自社ドメインに取り込んだ対応表（vite.config.ts の coanaRemoteImages）
import remoteImages from "virtual:remote-images";

export const settings = settingsJson;
export const home = homeJson;
export const about = aboutJson;
export const services = servicesJson;
export const privacy = privacyJson as { body: string };

export const CATEGORIES = ["お知らせ", "サービス", "イベント", "実績・事例"] as const;

export type Article = {
  slug: string;
  title: string;
  date: string; // YYYY.MM.DD
  sortKey: string;
  category: string;
  summary: string;
  thumbnail?: string;
  html: string;
};

const files = import.meta.glob("../content/topics/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const p = (n: number) => String(n).padStart(2, "0");
const todayJst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 予約投稿の確認用：Cloudflare Pages のプレビュー（<ブランチ等>.<プロジェクト>.pages.dev）とローカルに限り、
// URLに ?preview=YYYY-MM-DD を付けるとその日付時点の公開状態で表示する（タブを閉じるまで有効、?preview=off で解除）。
// 本番（coana.co.jp）では無効。sitemap.xml・feed.xml・llms.txt はビルド時に別途生成しており、この設定の影響を受けない。
function previewDate(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (!/^[^.]+\.[^.]+\.pages\.dev$/.test(host) && host !== "localhost" && host !== "127.0.0.1") return null;
  const KEY = "coana-preview-date";
  const param = new URLSearchParams(window.location.search).get("preview");
  const valid = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : null;
  try {
    if (valid) sessionStorage.setItem(KEY, valid);
    else if (param === "off") sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY);
  } catch {
    return valid;
  }
}
const publishCutoff = previewDate() ?? todayJst();

// 日付は閲覧者のタイムゾーンに左右されず、日本時間の表記で表示する
function toDate(value: unknown) {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? "").trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.000)?)?Z?)?$/);
  if (dateOnly) {
    return {
      label: `${dateOnly[1]}.${dateOnly[2]}.${dateOnly[3]}`,
      key: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
    };
  }
  const d = value instanceof Date ? value : new Date(raw);
  if (isNaN(d.getTime())) return { label: raw, key: raw };
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return {
    label: `${jst.getUTCFullYear()}.${p(jst.getUTCMonth() + 1)}.${p(jst.getUTCDate())}`,
    key: d.toISOString(),
  };
}

export const articles: Article[] = Object.entries(files)
  .map(([path, raw]) => {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    const fm = (m ? parseYaml(m[1]) : {}) ?? {};
    const body = m ? m[2] : raw;
    if (fm.draft) return null;
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const d = toDate(fm.date);
    // 予約投稿：公開日（日本時間）が今日より先の記事は表示しない（毎朝の自動ビルドで公開される）
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(d.label) && d.label.replace(/\./g, "-") > publishCutoff) return null;
    return {
      slug,
      title: fm.title ?? slug,
      date: d.label,
      sortKey: d.key,
      category: fm.category ?? "お知らせ",
      summary: fm.summary ?? "",
      thumbnail: fm.thumbnail || undefined,
      html: marked.parse(body, { async: false }) as string,
    } as Article;
  })
  .filter((a): a is Article => a !== null)
  .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

export function renderMarkdown(md: string) {
  return marked.parse(md || "", { async: false }) as string;
}

/** サービス別の専用ページ（content/solutions/*.json、CMSの「サービス別ページ」から編集） */
export type Solution = {
  slug: string;
  order?: number;
  nav_label: string;
  en?: string;
  title: string;
  seo_title?: string;
  description?: string;
  lead: string;
  lang?: "ja" | "en";
  hidden?: boolean;
  /* ── ページの構成（上から順）：ヒーロー → お悩み → 仕組み → 支援内容とプラン → 事例 → 流れ → FAQ → お問い合わせ。空欄のセクションは表示しない ── */
  catch?: string;
  hero_facts?: { value: string; label: string }[];
  /** 実写動画（設定時はイラストの代わりに表示） */
  hero_video?: string;
  problems_title?: string;
  problems: string[];
  scheme?: {
    type?: "hub" | "flow";
    title?: string;
    lead?: string;
    center?: { label: string; sub?: string };
    nodes?: { label: string; sub?: string; icon?: string }[];
    points?: { name: string; text: string; icon?: string }[];
    note?: string;
  };
  features_title?: string;
  features_lead?: string;
  features: { name: string; text: string; icon?: string }[];
  scope?: { title?: string; groups?: { name: string; icon?: string; items?: string[] }[]; note?: string };
  plans?: { title?: string; items?: { name: string; tag?: string; text?: string; includes?: string[]; best_for?: string; featured?: boolean }[]; note?: string };
  tools_title?: string;
  tools?: string[];
  tools_note?: string;
  scenarios?: { title?: string; lead?: string; items?: { name: string; tag?: string; before?: string; text: string }[]; note?: string };
  steps_title?: string;
  flow?: { name: string; text: string }[];
  flow_note?: string;
  faq_title?: string;
  faqs?: { q: string; a: string }[];
  cta_title?: string;
  cta_text?: string;
  related?: string[];
  english?: { title: string; text: string; button?: string; slug: string };
};

const solutionFiles = import.meta.glob("../content/solutions/*.json", {
  import: "default",
  eager: true,
}) as Record<string, Solution>;

/** 外部画像のURLを、ビルド時に取り込んだ自社ドメインの画像パスに置き換える（取り込めなかった画像は元のURLのまま） */
export function localImage(url?: string) {
  if (!url) return url;
  return (remoteImages as Record<string, string>)[url] ?? url;
}
function localizeImages<T>(value: T): T {
  if (typeof value === "string") return localImage(value) as unknown as T;
  if (Array.isArray(value)) return value.map(localizeImages) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, localizeImages(v)])) as T;
  }
  return value;
}

export const solutions: Solution[] = Object.values(solutionFiles)
  .filter((s) => s && s.slug)
  .map((s) => localizeImages(s))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
