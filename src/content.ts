import { parse as parseYaml } from "yaml";
import { marked } from "marked";
import settingsJson from "../content/settings.json";
import homeJson from "../content/home.json";
import aboutJson from "../content/about.json";
import servicesJson from "../content/services.json";
import privacyJson from "../content/privacy.json";

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
