import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { ReactNode } from "react";
import { Parser, jaModel } from "budoux";

/* ───────────────────────── 日本語の文節改行 ─────────────────────────
 * HTML 要素の子に直接書かれた日本語の文字列を BudouX で文節に分け、文節の境目に <wbr> を入れる。
 * CSS（index.css）の word-break: keep-all と組み合わせ、単語の途中（「クラウ/ド」「会/計」）や
 * 助詞だけが次の行に落ちる改行を防ぐ。Chrome の word-break: auto-phrase と違い、iOS Safari でも同じ結果になる。
 * jsx-runtime.ts から呼ばれるため、各コンポーネントで個別に対応する必要はない。
 * 文字列そのもの（コピーされる文字・クローラ向けHTML・title など）は変えない。
 */

// 文節の判定だけを使う（HTML 処理用の loadDefaultJapaneseParser は DOM 処理まで含むため使わない）
const parser = new Parser(jaModel);
const JA = /[぀-ヿ㐀-鿿]/;
/** 文節分割しない要素：SVG の文字（自動では折り返さない）、フォーム部品、コードなど */
const SKIP = new Set(["title", "option", "optgroup", "textarea", "script", "style", "code", "pre", "kbd", "svg", "text", "tspan", "textPath", "desc"]);

/** BudouX の文節が長いとき（8文字以上）、語の切れ目でさらに分ける：カタカナ→漢字（「バックオフィス｜実務の」）、
 *  「問い合わせ」の直後（「問い合わせ｜導線の」）。狭いカードで最後の1〜2文字だけが次の行に残るのを防ぐ */
const SUB_BREAK = /(?<=[゠-ヿー])(?=[一-鿿])|(?<=問い合わせ)(?=[一-鿿])/g;
/** 行頭に来ると不自然な文字（区切りのスラッシュ・閉じかっこ・句読点など）で始まる文節は、前の文節につなげる */
const NO_LINE_START = /^[／/）」』】〕〉》、。，．・：；！？ー]/;

function refine(phrases: string[]) {
  const out: string[] = [];
  for (const p of phrases.flatMap((p) => (p.length >= 8 ? p.split(SUB_BREAK) : [p]))) {
    if (out.length && NO_LINE_START.test(p)) out[out.length - 1] += p;
    else out.push(p);
  }
  return out;
}

const cache = new Map<string, ReactNode[] | null>();

/** 文字列を文節に分けた子要素の配列（分ける必要がなければ null） */
function phraseNodes(text: string): ReactNode[] | null {
  if (text.length < 4 || !JA.test(text)) return null;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const phrases = refine(parser.parse(text));
  let nodes: ReactNode[] | null = null;
  if (phrases.length > 1) {
    const list: ReactNode[] = [];
    phrases.forEach((phrase, i) => {
      if (i) list.push(jsx("wbr", {}, "w" + i));
      // 全角スラッシュはブラウザが前後で改行してしまうため、その文節だけ折り返さない（「税理士／社内」）
      list.push(phrase.includes("／") ? jsx("span", { style: { whiteSpace: "nowrap" }, children: phrase }, "p" + i) : phrase);
    });
    nodes = list;
  }
  cache.set(text, nodes);
  return nodes;
}

/** 文字列を <wbr> 入りの断片にする。配列の中に置くときは位置を key にする */
function split(text: string, key?: string): ReactNode {
  const nodes = phraseNodes(text);
  return nodes ? jsxs(Fragment, { children: nodes }, key) : text;
}

/** HTML 要素の props.children に含まれる日本語の文字列を、<wbr> 入りの断片に置き換える */
export function withPhrases<P>(type: unknown, props: P): P {
  if (typeof type !== "string" || SKIP.has(type) || !props || typeof props !== "object") return props;
  const children = (props as { children?: unknown }).children;
  if (typeof children === "string") {
    const next = split(children);
    return next === children ? props : { ...props, children: next };
  }
  if (Array.isArray(children) && children.some((c) => typeof c === "string")) {
    return { ...props, children: children.map((c, i) => (typeof c === "string" ? split(c, "t" + i) : c)) };
  }
  return props;
}
