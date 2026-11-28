// ページを足したときの登録漏れを検査する（2026-11-28 追加：/pricing を足したとき、タイトルの一覧に入れ忘れて型エラーになったため）。
// src/shared.tsx の paths（固定ページ）が、すべて ①sitemap.xml ②dist 内の HTML ③App.tsx のタイトル一覧 に入っているか。npm run build の最後に実行する。
import fs from "node:fs";
const root = new URL("../../", import.meta.url).pathname;
const shared = fs.readFileSync(root + "src/shared.tsx", "utf8");
const app = fs.readFileSync(root + "src/App.tsx", "utf8");
const block = /export const paths[^{]*\{([\s\S]*?)\n\};/.exec(shared)?.[1] ?? "";
const entries = [...block.matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
const sitemap = fs.readFileSync(root + "dist/sitemap.xml", "utf8");
const titles = /const titles: Record<Page, string> = \{([^}]*)\}/.exec(app)?.[1] ?? "";
const bad = [];
for (const [key, p] of entries) {
  if (!new RegExp(`<loc>[^<]*${p === "/" ? "/" : p}</loc>`).test(sitemap)) bad.push(`${p}：sitemap.xml にない`);
  const html = p === "/" ? "dist/index.html" : `dist${p}.html`;
  if (!fs.existsSync(root + html)) bad.push(`${p}：${html} がない`);
  if (!new RegExp(`\\b${key}:`).test(titles)) bad.push(`${p}：App.tsx のタイトル一覧（titles）にない`);
}
if (!entries.length) bad.push("paths を読み取れません");
if (bad.length) { console.error("page-registry: NG\n  " + bad.join("\n  ")); process.exit(1); }
console.log(`page-registry: OK（${entries.length} ページ）`);
