// CMS（/admin）で編集できる文言の直後に、コード側で句読点（、。）を足していないかを検査する。
// 足していると、CMS に入れた文言とサイトの表示が一致しなくなる
// （2026-11-03、トップのヒーローのキャッチコピーに「、」「。」が勝手に付いていた）。
// `npm run build` の最初に実行し、見つかったらビルドを止める（＝ Cloudflare Pages のチェックが不合格になり、マージできない）。
// 単体で動かすとき：node tools/qa/cms-verbatim.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// src/content.ts が CMS の中身として渡している変数と、LP・記事ページでの呼び名
const CMS_VARS = ["home", "about", "settings", "services", "privacy", "sol", "solution", "article"];
// {home.hero_line1}、 や ${home.hero_line1}。 のように、CMS の値のすぐ後ろ（空白・改行をはさんでも）に句読点がある所
const PATTERN = new RegExp(
  String.raw`\$?\{\s*(?:${CMS_VARS.join("|")})(?:\??\.[\w$]+|\[[^\]]+\])+\s*\}\s*[、。]`,
  "g",
);

const root = fileURLToPath(new URL("../..", import.meta.url));
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
  }
};
walk(join(root, "src"));

const found = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(PATTERN)) {
    const line = src.slice(0, m.index).split("\n").length;
    found.push(`${relative(root, f)}:${line}  ${m[0].replace(/\s+/g, " ")}`);
  }
}

if (found.length) {
  console.error("CMS の文言の後ろに、コード側で句読点を足している所があります（CMS に入れたとおりに表示されなくなります）：");
  for (const f of found) console.error("  " + f);
  console.error("句読点が必要なら、CMS の文言の側に入れてください。");
  process.exit(1);
}
console.log(`cms-verbatim: OK（${files.length} ファイルを確認）`);
