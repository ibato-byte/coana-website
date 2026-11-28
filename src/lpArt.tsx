import type { CSSProperties, ReactNode } from "react";
import { LpIcon } from "./lpIcons";
import "./illustrations.css";

/* ───────────────────────── サービスLPのイラスト（SVG） ─────────────────────────
 * 2026-11-22 オーナー依頼「文字ばかりで最後まで読まれない。図や絵を増やして、直感的に」で追加。
 * - HeroArt：ヒーローの絵（サービスごと。人物＋画面＋3枚の札）
 * - WorryArt：お悩みの章の人物
 * - SpotIcon：特徴・流れ・事例などに使う、アイコンの小さな絵
 * どれも装飾（aria-hidden）。色は index.css のトークンに合わせた固定値。
 * 動きは illustrations.css の art-float（ゆっくり浮く）だけ。prefers-reduced-motion では止まる（index.css）。
 */

const NAVY = "#16334d";
const DEEP = "#087fe5";
const SKY = "#55b8f3";
const PALE = "#dff0fc";
const SOFT = "#eef6fc";
const LINE = "#cfe3f3";
const YELLOW = "#ffd85a";
const AMBER = "#f2a516";
const SKIN = "#ffd9b9";
const SKIN_D = "#f3bf98";
const CORAL = "#ff7d6e";
const GREEN = "#1fae7a";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* ── 部品 ── */

/** 人物（胸から上）。100×112 の枠に描き、x・y・s で配置する。mood: smile＝笑顔、worry＝困り顔 */
function Bust({ x, y, s = 1, shirt = DEEP, hair = NAVY, mood = "smile", long = false }: { x: number; y: number; s?: number; shirt?: string; hair?: string; mood?: "smile" | "worry"; long?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {long && <path d="M24 40C20 16 36 8 50 8s30 8 26 32c3 12 4 26 0 38H24c-4-12-3-26 0-38Z" fill={hair} />}
      <path d="M4 112C4 86 24 72 50 72s46 14 46 40Z" fill={shirt} />
      <path d="M38 72 50 86 62 72Z" fill="#fff" />
      <rect x="42" y="56" width="16" height="20" rx="7" fill={SKIN_D} />
      <circle cx="50" cy="40" r="24" fill={SKIN} />
      {long
        ? <path d="M26 42C22 22 36 12 50 12s28 10 24 30c-7-3-13-8-17-15-6 8-16 13-31 15Z" fill={hair} />
        : <path d="M26 40C23 20 36 12 51 13c15-1 27 9 23 27-3-8-9-13-23-13-12 0-21 4-25 13Z" fill={hair} />}
      {mood === "smile" ? (
        <>
          <circle cx="41.5" cy="43" r="2.4" fill={NAVY} />
          <circle cx="58.5" cy="43" r="2.4" fill={NAVY} />
          <path d="M43 51.5q7 6 14 0" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="35" cy="49" r="3.4" fill={CORAL} opacity=".35" />
          <circle cx="65" cy="49" r="3.4" fill={CORAL} opacity=".35" />
        </>
      ) : (
        <>
          <path d="M36 41l8-3M64 41l-8-3" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="41.5" cy="45" r="2.3" fill={NAVY} />
          <circle cx="58.5" cy="45" r="2.3" fill={NAVY} />
          <path d="M44 55q6-4 12 0" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M77 30c4 6 5 9 5 11a5 5 0 0 1-10 0c0-2 1-5 5-11Z" fill={SKY} />
        </>
      )}
    </g>
  );
}

/** ノートPC。画面の中（282×172）に children を描く */
function Laptop({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="150" cy="222" rx="190" ry="14" fill={NAVY} opacity=".08" />
      <rect width="300" height="190" rx="14" fill={NAVY} />
      <rect x="9" y="9" width="282" height="172" rx="7" fill="#fff" />
      <g transform="translate(9 9)">{children}</g>
      <path d="M-30 190h360l-18 20H-12Z" fill="#c4d8e8" />
      <rect x="118" y="190" width="64" height="7" rx="3.5" fill="#a5bfd4" />
    </g>
  );
}

/** 浮かぶ札：アイコンと短い言葉 */
function Tag({ x, y, icon, label, color = DEEP, delay = 0, w = 132 }: { x: number; y: number; icon: string; label: string; color?: string; delay?: number; w?: number }) {
  return (
    <g className="art-float" style={d(delay)}>
      <g transform={`translate(${x} ${y})`}>
        <rect x="3" y="7" width={w} height="108" rx="20" fill={NAVY} opacity=".1" />
        <rect width={w} height="108" rx="20" fill="#fff" stroke={LINE} strokeWidth="2" />
        <circle cx={w / 2} cy="42" r="27" fill={color === YELLOW ? "#fff3c9" : PALE} />
        <g color={color === YELLOW ? "#b17300" : color}><LpIcon name={icon} size={32} x={w / 2 - 16} y={26} strokeWidth={1.9} /></g>
        <text x={w / 2} y="93" textAnchor="middle" fontSize="16.5" fontWeight="700" fill={NAVY}>{label}</text>
      </g>
    </g>
  );
}

const Check = ({ x, y, r = 11, color = GREEN }: { x: number; y: number; r?: number; color?: string }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={color} />
    <path d={`M${x - r * 0.45} ${y}l${r * 0.32} ${r * 0.34} ${r * 0.6}-${r * 0.66}`} stroke="#fff" strokeWidth={r * 0.24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const bar = (x: number, y: number, w: number, color = LINE, h = 9) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={color} />;

/* ── 画面の中身（282×172） ── */

const SCREENS: Record<string, ReactNode> = {
  /* 業務フローを書き出して、順番を決める */
  "it-consulting": (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="18" y={18 + i * 50} width="104" height="34" rx="9" fill={i === 1 ? "#fff3c9" : SOFT} stroke={i === 1 ? AMBER : LINE} strokeWidth="2" />
          {bar(30, 31 + i * 50, 50 + i * 12, i === 1 ? NAVY : "#a9c4d9")}
          {i < 2 && <path d={`M70 ${54 + i * 50}v12m-5-5 5 5 5-5`} stroke={DEEP} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
      <circle cx="122" cy="68" r="12" fill={AMBER} />
      <path d="M122 62v7M122 73v.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="146" y="18" width="120" height="136" rx="10" fill={SOFT} />
      {bar(158, 30, 54, NAVY)}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="166" cy={66 + i * 32} r="10" fill={i === 0 ? DEEP : SKY} />
          <text x="166" y={70.5 + i * 32} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{i + 1}</text>
          {bar(184, 61 + i * 32, 70 - i * 12, i === 0 ? "#9cc8ee" : LINE, 10)}
        </g>
      ))}
    </>
  ),
  /* 質問を入れると、下書きが返ってくる（人が確認して使う） */
  "ai-support": (
    <>
      <rect x="18" y="16" width="150" height="34" rx="12" fill={PALE} />
      {bar(30, 28, 100, DEEP, 8)}{bar(30, 40, 60, SKY, 6)}
      <rect x="114" y="62" width="150" height="62" rx="12" fill="#fff" stroke={LINE} strokeWidth="2" />
      {bar(126, 74, 110, NAVY, 8)}{bar(126, 90, 126, LINE, 7)}{bar(126, 104, 84, LINE, 7)}
      <path d="M232 22l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill={YELLOW} />
      <circle cx="40" cy="146" r="14" fill={GREEN} /><path d="M33 146l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {bar(62, 141, 96, LINE, 9)}
    </>
  ),
  /* ツール同士がつながり、書類が自動でできあがる */
  automation: (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path d={`M66 ${36 + i * 50}C104 ${36 + i * 50} 96 86 128 86`} stroke={SKY} strokeWidth="3" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
          <rect x="18" y={14 + i * 50} width="48" height="44" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
          <rect x="18" y={14 + i * 50} width="48" height="9" rx="4.5" fill={[SKY, YELLOW, DEEP][i]} />
          {bar(27, 32 + i * 50, 30, LINE, 6)}{bar(27, 43 + i * 50, 20, LINE, 6)}
        </g>
      ))}
      <g transform="translate(141 86)">
        <path d="M0-30l6 2 2 8 7 3 7-4 5 5-4 7 3 7 8 2v8l-8 2-3 7 4 7-5 5-7-4-7 3-2 8H-6l-2-8-7-3-7 4-5-5 4-7-3-7-8-2v-8l8-2 3-7-4-7 5-5 7 4 7-3 2-8Z" transform="translate(0 0) scale(.92)" fill={NAVY} />
        <circle r="11" fill={YELLOW} />
      </g>
      <path d="M172 86h26m-7-7 7 7-7 7" stroke={DEEP} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M208 42h40l16 16v72h-56Z" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M248 42v16h16" fill={SOFT} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      {bar(218, 70, 34, NAVY, 7)}{bar(218, 86, 36, LINE, 7)}{bar(218, 100, 26, LINE, 7)}
      <Check x={262} y={128} r={13} />
    </>
  ),
  /* 取引が自動で会計に入る */
  "cloud-accounting": (
    <>
      <rect width="282" height="28" rx="7" fill={SOFT} />
      {bar(14, 10, 70, NAVY, 8)}
      <rect x="206" y="6" width="62" height="17" rx="8.5" fill={YELLOW} />
      <text x="237" y="18.5" textAnchor="middle" fontSize="11" fontWeight="800" fill={NAVY}>AUTO</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="14" y={40 + i * 32} width="254" height="24" rx="8" fill={i % 2 ? "#fff" : "#f6fbff"} stroke={LINE} strokeWidth="1.5" />
          {bar(24, 48 + i * 32, 30, "#a9c4d9", 8)}
          {bar(64, 48 + i * 32, 64 - (i % 2) * 14, LINE, 8)}
          <rect x="150" y={45 + i * 32} width="50" height="14" rx="7" fill={[PALE, "#fff3c9", PALE, "#dff5ec"][i]} />
          {bar(214, 48 + i * 32, 30, i === 3 ? GREEN : DEEP, 8)}
          <Check x={256} y={52 + i * 32} r={7} />
        </g>
      ))}
    </>
  ),
  /* LP が組み上がる */
  "web-production": (
    <>
      <rect width="282" height="24" rx="7" fill={SOFT} />
      <circle cx="14" cy="12" r="4" fill={CORAL} /><circle cx="28" cy="12" r="4" fill={YELLOW} /><circle cx="42" cy="12" r="4" fill={SKY} />
      <rect x="66" y="6" width="150" height="12" rx="6" fill="#fff" />
      <rect x="14" y="34" width="254" height="72" rx="10" fill={PALE} />
      {bar(28, 50, 96, NAVY, 11)}{bar(28, 68, 70, "#9cc8ee", 8)}
      <rect x="28" y="84" width="62" height="16" rx="8" fill={AMBER} />
      <circle cx="222" cy="70" r="24" fill="#fff" />
      <path d="M208 78l10-12 8 7 6-6 6 11Z" fill={SKY} />
      <circle cx="214" cy="60" r="4" fill={YELLOW} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={14 + i * 87} y="116" width="80" height="44" rx="9" fill="#fff" stroke={LINE} strokeWidth="2" />
          <circle cx={30 + i * 87} cy="132" r="7" fill={[SKY, YELLOW, DEEP][i]} />
          {bar(44 + i * 87, 128, 38, LINE, 7)}{bar(24 + i * 87, 146, 54, LINE, 6)}
        </g>
      ))}
    </>
  ),
  /* やることリストと、お金の見通し */
  "startup-support": (
    <>
      <rect x="16" y="16" width="116" height="140" rx="10" fill={SOFT} />
      {bar(28, 28, 52, NAVY)}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          {i < 3 ? <Check x={36} y={58 + i * 26} r={8} /> : <circle cx="36" cy={58 + i * 26} r="7" fill="#fff" stroke="#a9c4d9" strokeWidth="2" />}
          {bar(52, 54 + i * 26, 64 - (i % 2) * 14, i < 3 ? "#a9c4d9" : LINE, 8)}
        </g>
      ))}
      <rect x="146" y="16" width="120" height="140" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
      {bar(158, 28, 44, NAVY)}
      {[0, 1, 2, 3].map((i) => <rect key={i} x={162 + i * 24} y={134 - (22 + i * 18)} width="15" height={22 + i * 18} rx="4" fill={i === 3 ? DEEP : SKY} />)}
      <path d="M160 110l26-18 22 6 38-34" stroke={AMBER} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M234 62l13 1-2 13" stroke={AMBER} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M158 138h98" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  /* 帳簿と月次のグラフ */
  bookkeeping: (
    <>
      <rect width="282" height="28" rx="7" fill={NAVY} />
      <circle cx="16" cy="14" r="4.5" fill={YELLOW} /><circle cx="31" cy="14" r="4.5" fill={SKY} />
      {bar(52, 10, 70, "#fff", 8)}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          {bar(16, 46 + i * 28, 30, "#a9c4d9", 9)}{bar(54, 46 + i * 28, 62 - (i % 2) * 12, LINE, 9)}
          {bar(126, 46 + i * 28, 30, i === 3 ? GREEN : DEEP, 9)}
        </g>
      ))}
      <path d="M16 152h140" stroke={LINE} strokeWidth="2" />
      <rect x="170" y="40" width="98" height="118" rx="10" fill={SOFT} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={182 + i * 20} y={142 - (24 + i * 16)} width="13" height={24 + i * 16} rx="3.5" fill={i === 3 ? DEEP : SKY} />)}
      {bar(182, 50, 40, NAVY, 7)}
      <Check x={258} y={48} r={12} />
    </>
  ),
  /* 頼んだ事務が、順に終わっていく */
  "backoffice-dx": (
    <>
      {bar(16, 16, 80, NAVY, 10)}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="16" y={38 + i * 32} width="250" height="25" rx="9" fill={i < 3 ? "#f6fbff" : "#fff"} stroke={LINE} strokeWidth="1.5" />
          <circle cx="32" cy={50.5 + i * 32} r="8" fill={[SKY, YELLOW, DEEP, "#a9c4d9"][i]} />
          {bar(48, 46 + i * 32, 92 - (i % 2) * 22, i < 3 ? "#a9c4d9" : LINE, 9)}
          {i < 3
            ? <><rect x="200" y={43 + i * 32} width="54" height="15" rx="7.5" fill="#dff5ec" /><path d={`M220 ${50.5 + i * 32}l4 4 9-9`} stroke={GREEN} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>
            : <rect x="200" y={43 + i * 32} width="54" height="15" rx="7.5" fill="#fff3c9" />}
        </g>
      ))}
    </>
  ),
};
SCREENS["startup-support-en"] = SCREENS["startup-support"];

/** スマホ（SNS運用代行）：投稿に反応が集まる */
function Phone({ x, y }: { x: number; y: number }) {
  const heart = "M0 6C0-2 10-4 12 3 14-4 24-2 24 6 24 13 12 20 12 20S0 13 0 6Z";
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="90" cy="338" rx="120" ry="12" fill={NAVY} opacity=".08" />
      <rect width="180" height="330" rx="30" fill={NAVY} />
      <rect x="9" y="9" width="162" height="312" rx="22" fill="#fff" />
      <rect x="66" y="16" width="48" height="9" rx="4.5" fill={NAVY} />
      <circle cx="33" cy="52" r="13" fill={SKY} />{bar(54, 43, 60, NAVY, 8)}{bar(54, 56, 40, LINE, 7)}
      <rect x="20" y="76" width="140" height="124" rx="14" fill={PALE} />
      <circle cx="52" cy="108" r="14" fill={YELLOW} />
      <path d="M20 186l42-40 30 24 26-18 42 34v0a14 14 0 0 1-14 14H34a14 14 0 0 1-14-14Z" fill={SKY} />
      <g transform="translate(22 212)"><path d={heart} fill={CORAL} /></g>
      {bar(54, 217, 44, "#a9c4d9", 9)}
      {bar(22, 244, 132, LINE, 9)}{bar(22, 261, 96, LINE, 9)}
      <rect x="22" y="284" width="136" height="24" rx="12" fill={SOFT} />
    </g>
  );
}

const TAGS: Record<string, [string, string, string][]> = {
  "it-consulting": [["search", "業務の棚卸し", DEEP], ["tools", "ツール導入", YELLOW], ["rules", "手順書", DEEP]],
  automation: [["link", "ツール連携", DEEP], ["mail", "自動で通知", YELLOW], ["invoice", "書類を作成", DEEP]],
  "ai-support": [["sparkle", "下書きを作る", DEEP], ["rules", "社内ルール", YELLOW], ["users", "説明会", DEEP]],
  "cloud-accounting": [["bank", "銀行・カード", DEEP], ["cloud", "自動で取込", YELLOW], ["chart", "月次の数字", DEEP]],
  "web-production": [["layout", "構成・原稿", DEEP], ["camera", "デザイン", YELLOW], ["mail", "問い合わせ", DEEP]],
  "startup-support": [["doc", "事業計画", DEEP], ["rocket", "開業", YELLOW], ["handshake", "専門家", DEEP]],
  "startup-support-en": [["doc", "Plan", DEEP], ["rocket", "Launch", YELLOW], ["handshake", "Experts", DEEP]],
  bookkeeping: [["camera", "撮って送る", DEEP], ["invoice", "請求・支払い", YELLOW], ["chart", "月次レポート", DEEP]],
  "backoffice-dx": [["mail", "チャットで依頼", DEEP], ["users", "チームで対応", YELLOW], ["rules", "手順を残す", DEEP]],
  "sns-management": [["calendar", "投稿計画", DEEP], ["camera", "作成・投稿", YELLOW], ["chart", "振り返り", DEEP]],
};

/** ヒーローの絵。slug（サービス）ごとに、画面の中身と札の言葉が変わる */
export function HeroArt({ slug }: { slug: string }) {
  const tags = TAGS[slug] ?? TAGS["backoffice-dx"];
  const sns = slug === "sns-management";
  const en = slug.endsWith("-en");
  const tw = en ? 148 : 136;
  return (
    <svg className="art lpx-hero-svg" viewBox="0 0 600 480" aria-hidden="true" focusable="false">
      {/* 背景：大きな水色の面と、黄色・水色の丸 */}
      <path d="M92 250c0-120 92-206 214-206s214 78 214 196-90 204-216 204S92 370 92 250Z" fill={PALE} />
      <circle cx="514" cy="92" r="30" fill={YELLOW} opacity=".7" />
      <circle cx="74" cy="150" r="13" fill={SKY} opacity=".5" />
      <circle cx="548" cy="356" r="9" fill={DEEP} opacity=".35" />
      <path d="M52 96l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" fill={YELLOW} />
      {sns ? <Phone x={210} y={64} /> : <Laptop x={150} y={130}>{SCREENS[slug] ?? SCREENS["backoffice-dx"]}</Laptop>}
      {/* 札：左上・右上・右下 */}
      <Tag x={sns ? 36 : 24} y={sns ? 96 : 40} icon={tags[0][0]} label={tags[0][1]} color={tags[0][2]} w={tw} />
      <Tag x={sns ? 424 : 438} y={sns ? 60 : 22} icon={tags[1][0]} label={tags[1][1]} color={tags[1][2]} delay={1.4} w={tw} />
      <Tag x={sns ? 430 : 448} y={sns ? 270 : 330} icon={tags[2][0]} label={tags[2][1]} color={tags[2][2]} delay={2.6} w={tw} />
      {/* 人物：相談するお客さま（左下）と、COANA TOKYO の担当（その隣） */}
      <Bust x={40} y={318} s={1.38} shirt={AMBER} hair="#5b3a29" long />
      <Bust x={176} y={352} s={1.12} shirt={DEEP} />
    </svg>
  );
}

/** お悩みの章の人物（困り顔）と、頭の上の「？」 */
export function WorryArt() {
  return (
    <svg className="art lpx-worry-svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <circle cx="120" cy="130" r="104" fill={SOFT} />
      <g className="art-float"><circle cx="52" cy="58" r="22" fill="#fff" stroke={LINE} strokeWidth="2" /><text x="52" y="68" textAnchor="middle" fontSize="28" fontWeight="900" fill={DEEP}>?</text></g>
      <g className="art-float" style={d(1.5)}><circle cx="196" cy="48" r="17" fill="#fff3c9" /><text x="196" y="56" textAnchor="middle" fontSize="22" fontWeight="900" fill="#b17300">?</text></g>
      <Bust x={36} y={52} s={1.68} shirt="#8fa9bd" hair={NAVY} mood="worry" />
    </svg>
  );
}

/** アイコンの小さな絵（白い札に線のアイコン、うしろに水色の面と黄色の丸） */
export function SpotIcon({ name, tone = "sky", size = 112 }: { name?: string; tone?: "sky" | "warm" | "gray"; size?: number }) {
  const bg = tone === "warm" ? "#fff3c9" : tone === "gray" ? "#e9eef2" : PALE;
  const fg = tone === "warm" ? "#a86a00" : tone === "gray" ? "#5a6e80" : DEEP;
  return (
    <svg className="lpx-spot" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path d="M12 62c0-30 20-50 50-50s48 18 48 46-20 52-50 52S12 92 12 62Z" fill={bg} />
      {tone !== "gray" && <circle cx="98" cy="22" r="9" fill={tone === "warm" ? SKY : YELLOW} />}
      <rect x="30" y="34" width="62" height="62" rx="18" fill={NAVY} opacity=".08" />
      <rect x="28" y="28" width="62" height="62" rx="18" fill="#fff" />
      <g color={fg}><LpIcon name={name} size={36} x={41} y={41} strokeWidth={1.8} /></g>
    </svg>
  );
}

/** Before／After の見出しに添える小さな顔（困り顔／笑顔） */
export function MoodFace({ mood }: { mood: "smile" | "worry" }) {
  return (
    <svg className="lpx-face" width="56" height="56" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="48" fill={mood === "smile" ? "#fff" : "#e9eef2"} />
      <g transform="translate(4 -2) scale(.92)"><Bust x={0} y={8} shirt={mood === "smile" ? DEEP : "#8fa9bd"} mood={mood} /></g>
    </svg>
  );
}

/* ───────────────────────── 特徴のカードの絵（小さな場面） ─────────────────────────
 * アイコン名（content の icon）ごとに、何をするかが伝わる小さな絵を出す。用意のない名前は SpotIcon で代用する。
 * 240×150。背景は透明（カード側の淡い面の上に置く）。 */

function MCard({ x, y, w, h, r = 12, children }: { x: number; y: number; w: number; h: number; r?: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x + 3} y={y + 5} width={w} height={h} rx={r} fill={NAVY} opacity=".09" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#fff" stroke={LINE} strokeWidth="2" />
      {children}
    </g>
  );
}
const GEAR = "M0-30l6 2 2 8 7 3 7-4 5 5-4 7 3 7 8 2v8l-8 2-3 7 4 7-5 5-7-4-7 3-2 8H-6l-2-8-7-3-7 4-5-5 4-7-3-7-8-2v-8l8-2 3-7-4-7 5-5 7 4 7-3 2-8Z";
const Pencil = ({ x, y, rot = -40, s = 1 }: { x: number; y: number; rot?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x="-7" y="-40" width="14" height="52" rx="2" fill={YELLOW} stroke={NAVY} strokeWidth="2.5" />
    <rect x="-7" y="-40" width="14" height="10" rx="2" fill={CORAL} stroke={NAVY} strokeWidth="2.5" />
    <path d="M-7 12h14l-7 15Z" fill={SKIN} stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M-2.4 22h4.8L0 27Z" fill={NAVY} />
  </g>
);
const Spark = ({ x, y, s = 1, color = YELLOW }: { x: number; y: number; s?: number; color?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-9l2.4 6.6L9 0 2.4 2.4 0 9-2.4 2.4-9 0l6.6-2.4Z" fill={color} />
);

const POINT_SCENES: Record<string, () => ReactNode> = {
  /* 業務の流れを見て、効くところを見つける */
  search: () => (
    <>
      <MCard x={26} y={20} w={118} h={112}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="42" y={32 + i * 32} width="72" height="22" rx="7" fill={i === 1 ? "#fff3c9" : SOFT} stroke={i === 1 ? AMBER : LINE} strokeWidth="2" />
            {bar(52, 39 + i * 32, 36 + i * 8, i === 1 ? NAVY : "#a9c4d9", 8)}
            {i < 2 && <path d={`M78 ${55 + i * 32}v8m-4-4 4 4 4-4`} stroke={DEEP} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        ))}
      </MCard>
      <path d="M176 96l26 26" stroke={NAVY} strokeWidth="11" strokeLinecap="round" />
      <circle cx="154" cy="74" r="32" fill="#fff" stroke={NAVY} strokeWidth="6" />
      <circle cx="154" cy="74" r="22" fill={SKY} opacity=".22" />
      <path d="M143 74l8 8 15-17" stroke={DEEP} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Spark x={206} y={34} />
    </>
  ),
  /* 設定や自動化を、自分たちで作る */
  tools: () => (
    <>
      <MCard x={28} y={20} w={156} h={110}>
        <path d="M28 44V32a12 12 0 0 1 12-12h132a12 12 0 0 1 12 12v12Z" fill={SOFT} />
        <circle cx="44" cy="32" r="4" fill={CORAL} /><circle cx="58" cy="32" r="4" fill={YELLOW} /><circle cx="72" cy="32" r="4" fill={SKY} />
        <g transform="translate(74 88) scale(.82)"><path d={GEAR} fill={NAVY} /><circle r="10" fill={YELLOW} /></g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="112" y={64 + i * 20} width="58" height="7" rx="3.5" fill={LINE} />
            <rect x="112" y={64 + i * 20} width={[36, 20, 46][i]} height="7" rx="3.5" fill={SKY} />
            <circle cx={112 + [36, 20, 46][i]} cy={67.5 + i * 20} r="7" fill="#fff" stroke={DEEP} strokeWidth="3" />
          </g>
        ))}
      </MCard>
      <Pencil x={196} y={86} />
      <Spark x={214} y={30} />
    </>
  ),
  /* 実務を知っている人が、チームで対応する */
  users: () => (
    <>
      <rect x="84" y="10" width="72" height="38" rx="14" fill="#fff" stroke={LINE} strokeWidth="2" />
      <path d="M106 47l-6 12 18-12Z" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <rect x="100" y="42" width="20" height="5" fill="#fff" />
      <Check x={104} y={29} r={9} />{bar(119, 25, 26, "#a9c4d9", 8)}
      <Bust x={24} y={46} s={0.93} shirt={AMBER} hair="#5b3a29" long />
      <Bust x={124} y={46} s={0.93} shirt={DEEP} />
      <Spark x={30} y={30} color={SKY} />
    </>
  ),
  /* いまのツール同士をつなぐ */
  link: () => (
    <>
      {[[34, 18, SKY], [166, 18, YELLOW], [34, 94, YELLOW], [166, 94, SKY]].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${(x as number) + 20} ${(y as number) + 19}L120 75`} stroke={SKY} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <MCard x={x as number} y={y as number} w={40} h={38} r={10}>
            <rect x={x as number} y={y as number} width="40" height="9" rx="4.5" fill={c as string} />
            {bar((x as number) + 8, (y as number) + 17, 24, LINE, 6)}{bar((x as number) + 8, (y as number) + 27, 16, LINE, 6)}
          </MCard>
        </g>
      ))}
      <circle cx="120" cy="75" r="30" fill={DEEP} />
      <circle cx="120" cy="75" r="36" fill="none" stroke={DEEP} strokeWidth="2" opacity=".3" />
      <g color="#fff"><LpIcon name="link" size={32} x={104} y={59} strokeWidth={2.2} /></g>
    </>
  ),
  /* 判断が要るところは、人が確認する */
  shield: () => (
    <>
      <MCard x={34} y={18} w={104} h={116}>
        {bar(48, 32, 44, NAVY, 9)}
        {[0, 1, 2].map((i) => <g key={i}>{bar(48, 54 + i * 20, 76 - i * 12, LINE, 8)}</g>)}
        <rect x="48" y="110" width="50" height="14" rx="7" fill="#fff3c9" stroke={AMBER} strokeWidth="2" />
      </MCard>
      <g transform="translate(160 80)">
        <path d="M0-44 38-30V2c0 26-17 42-38 52-21-10-38-26-38-52v-32Z" fill={DEEP} />
        <path d="M0-34 28-24V2c0 20-12 32-28 41Z" fill="#fff" opacity=".14" />
        <path d="M-15 2l10 11 20-23" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Spark x={210} y={26} />
    </>
  ),
  /* チャットで頼める */
  mail: () => (
    <>
      <circle cx="38" cy="50" r="15" fill={AMBER} /><circle cx="38" cy="45" r="6" fill={SKIN} /><path d="M27 60a11 9 0 0 1 22 0Z" fill="#fff" opacity=".9" />
      <rect x="62" y="24" width="124" height="48" rx="16" fill="#fff" stroke={LINE} strokeWidth="2" />
      <path d="M64 56l-12 10 16-2Z" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      {bar(78, 38, 84, "#a9c4d9", 8)}{bar(78, 54, 56, LINE, 8)}
      <rect x="52" y="84" width="124" height="46" rx="16" fill={DEEP} />
      <path d="M174 114l12 10-16-2Z" fill={DEEP} />
      {bar(68, 98, 70, "#fff", 8)}{bar(68, 113, 44, "#9cc8ee", 8)}
      <Check x={158} y={107} r={11} color="#fff" />
      <path d="M152.5 107l4 4.2 7-8" stroke={DEEP} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="204" cy="108" r="15" fill={NAVY} /><circle cx="204" cy="103" r="6" fill={SKIN} /><path d="M193 118a11 9 0 0 1 22 0Z" fill={SKY} />
    </>
  ),
  /* 手順を残して、くり返しを減らす */
  refresh: () => (
    <>
      <path d="M44 84a78 62 0 0 1 132-46" stroke={SKY} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M166 22l12 17-20 3" stroke={SKY} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 66a78 62 0 0 1-132 46" stroke={DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M74 128l-12-17 20-3" stroke={DEEP} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <MCard x={84} y={30} w={72} h={90}>
        {bar(96, 44, 34, NAVY, 8)}
        {[0, 1, 2].map((i) => <g key={i}><Check x={101} y={66 + i * 18} r={6.5} />{bar(113, 62 + i * 18, 32 - i * 5, LINE, 8)}</g>)}
      </MCard>
    </>
  ),
  /* 手順・ルールを決めて、文書に残す */
  rules: () => (
    <>
      <MCard x={58} y={18} w={124} h={118}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx="80" cy={52 + i * 30} r="11" fill={i === 0 ? DEEP : SKY} />
            <text x="80" y={57 + i * 30} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{i + 1}</text>
            {bar(100, 43 + i * 30, 56 - i * 8, "#a9c4d9", 8)}{bar(100, 56 + i * 30, 38, LINE, 7)}
          </g>
        ))}
      </MCard>
      <rect x="96" y="10" width="48" height="18" rx="8" fill={NAVY} />
      <circle cx="120" cy="19" r="4" fill={YELLOW} />
      <Check x={180} y={122} r={15} />
      <Spark x={38} y={40} />
    </>
  ),
  /* クラウドに自動で取り込まれる */
  cloud: () => (
    <>
      {[[40, SKY], [100, YELLOW], [160, DEEP]].map(([x, c], i) => (
        <g key={i}>
          <path d={`M${(x as number) + 20} 104L120 62`} stroke={DEEP} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <MCard x={x as number} y={100} w={40} h={36} r={10}>
            <rect x={x as number} y={100} width="40" height="9" rx="4.5" fill={c as string} />
            {bar((x as number) + 8, 116, 24, LINE, 6)}{bar((x as number) + 8, 125, 15, LINE, 6)}
          </MCard>
        </g>
      ))}
      <g transform="translate(120 44) scale(.62) translate(-238 -96)">
        <path d="M172 140a40 40 0 0 1-4-79.6A58 58 0 0 1 280 50a42 42 0 0 1 22 82 40 40 0 0 1-10 8Z" fill="#fff" stroke={LINE} strokeWidth="3.2" />
        <path d="M258 86a22 22 0 0 1-37 16" stroke={DEEP} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M214 86a22 22 0 0 1 37-16" stroke={SKY} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="m252 60 1 11-11 0" stroke={SKY} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m220 112-1-11 11 0" stroke={DEEP} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Spark x={200} y={28} />
    </>
  ),
  /* 毎月の数字が見える */
  chart: () => (
    <>
      <MCard x={36} y={18} w={168} h={116}>
        {bar(50, 32, 52, NAVY, 9)}{bar(50, 47, 34, LINE, 7)}
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={54 + i * 28} y={116 - (18 + i * 11)} width="17" height={18 + i * 11} rx="4" fill={i === 4 ? DEEP : SKY} />)}
        <path d="M50 120h140" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
        <path d="M58 88l28-10 28 4 28-18 30-14" stroke={AMBER} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M160 50l13 0-4 12" stroke={AMBER} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </MCard>
      <Check x={200} y={24} r={15} />
    </>
  ),
  /* 書類・原稿を一緒に作る */
  doc: () => (
    <>
      <MCard x={48} y={14} w={116} h={124}>
        <path d="M134 14h18a12 12 0 0 1 12 12v18Z" fill={SOFT} />
        {bar(62, 30, 50, NAVY, 9)}
        {bar(62, 52, 84, LINE, 8)}{bar(62, 68, 84, LINE, 8)}
        <rect x="60" y="82" width="64" height="12" rx="6" fill="#ffe9a3" />
        {bar(62, 102, 84, LINE, 8)}{bar(62, 118, 50, LINE, 8)}
      </MCard>
      <Pencil x={184} y={78} rot={28} s={1.1} />
      <Spark x={30} y={36} color={SKY} />
    </>
  ),
  /* 専門家へつなぐ */
  handshake: () => (
    <>
      <path d="M70 60C90 28 150 28 170 60" stroke={SKY} strokeWidth="3.5" fill="none" strokeDasharray="2 9" strokeLinecap="round" />
      <circle cx="120" cy="36" r="22" fill={YELLOW} />
      <g color={NAVY}><LpIcon name="handshake" size={28} x={106} y={22} strokeWidth={2} /></g>
      <Bust x={20} y={48} s={0.91} shirt={AMBER} hair="#5b3a29" long />
      <Bust x={130} y={48} s={0.91} shirt={NAVY} hair="#6b7f90" />
    </>
  ),
  /* 開業のあとも支える */
  rocket: () => (
    <>
      <MCard x={26} y={68} w={84} h={66}>
        {[0, 1, 2].map((i) => <rect key={i} x={40 + i * 20} y={120 - (16 + i * 11)} width="13" height={16 + i * 11} rx="3.5" fill={i === 2 ? DEEP : SKY} />)}
        <path d="M38 122h60" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      </MCard>
      <path d="M112 112C130 104 142 92 150 76" stroke={AMBER} strokeWidth="4" fill="none" strokeDasharray="3 9" strokeLinecap="round" />
      <g transform="translate(170 58) rotate(32) scale(.86)">
        <path d="M0-52c20 14 30 38 27 70h-54c-3-32 7-56 27-70Z" fill="#fff" stroke={NAVY} strokeWidth="3.4" strokeLinejoin="round" />
        <circle cx="0" cy="-16" r="10" fill={SKY} stroke={NAVY} strokeWidth="3.4" />
        <path d="M-27 4l-15 20 17-3M27 4l15 20-17-3" fill={DEEP} stroke={NAVY} strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M-12 18h24l-5 12h-14Z" fill={NAVY} />
        <path d="M-6 32q6 20 12 0" fill={YELLOW} stroke={AMBER} strokeWidth="2" />
      </g>
      <Spark x={206} y={112} /><Spark x={128} y={26} s={0.8} color={SKY} />
    </>
  ),
  /* 必要な分だけ：大きさを選べる */
  layout: () => (
    <>
      {[[30, 44, 50], [92, 62, 72], [166, 46, 44]].map(([x, w, h], i) => (
        <g key={i}>
          <MCard x={x} y={128 - h} w={w} h={h} r={12}>
            <rect x={x} y={128 - h} width={w} height="10" rx="5" fill={i === 1 ? DEEP : SKY} opacity={i === 1 ? 1 : 0.7} />
            {bar(x + 9, 128 - h + 20, w - 18, i === 1 ? "#a9c4d9" : LINE, 7)}
            {h > 46 && bar(x + 9, 128 - h + 33, w - 28, LINE, 7)}
            {i === 1 && bar(x + 9, 128 - h + 46, w - 22, LINE, 7)}
          </MCard>
        </g>
      ))}
      <rect x="89" y="53" width="68" height="78" rx="14" fill="none" stroke={AMBER} strokeWidth="3" strokeDasharray="5 6" />
      <Check x={154} y={52} r={14} />
      <Spark x={40} y={52} />
    </>
  ),
};

/* ───────── 支援事例の絵（事例の中身ごと。2026-11-22 オーナー依頼「事例紹介を、絵で直感的に分かるように」）───────── */
const CASE_SCENES: Record<string, () => ReactNode> = {
  /* サーバーから無料のサービスへ移行し、スタッフが自分で更新 */
  "case-site": () => (
    <>
      <MCard x={14} y={40} w={58} h={76} r={10}>
        {[0, 1, 2].map((i) => <g key={i}><rect x="24" y={52 + i * 20} width="38" height="13" rx="4" fill={SOFT} stroke={LINE} strokeWidth="1.5" /><circle cx="54" cy={58.5 + i * 20} r="2.6" fill={i === 1 ? AMBER : "#a9c4d9"} /></g>)}
      </MCard>
      <circle cx="66" cy="42" r="11" fill={CORAL} />
      <path d="M61.5 37.5l9 9M70.5 37.5l-9 9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M82 80h22m-7-7 7 7-7 7" stroke={DEEP} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <MCard x={114} y={22} w={112} h={96}>
        <path d="M114 44V34a12 12 0 0 1 12-12h88a12 12 0 0 1 12 12v10Z" fill={SOFT} />
        <circle cx="127" cy="33" r="3.5" fill={CORAL} /><circle cx="138" cy="33" r="3.5" fill={YELLOW} /><circle cx="149" cy="33" r="3.5" fill={SKY} />
        <rect x="124" y="52" width="92" height="28" rx="7" fill={PALE} />
        {bar(132, 60, 44, NAVY, 7)}{bar(132, 70, 28, "#9cc8ee", 6)}
        {[0, 1, 2].map((i) => <rect key={i} x={124 + i * 32} y="88" width="26" height="20" rx="5" fill="#fff" stroke={LINE} strokeWidth="1.5" />)}
      </MCard>
      <Pencil x={214} y={118} rot={30} s={0.72} />
      <Check x={222} y={26} r={13} />
    </>
  ),
  /* シフト・勤怠・給与から請求まで、毎月の作業を自動に */
  "case-shift": () => (
    <>
      <MCard x={14} y={26} w={84} h={96}>
        <rect x="14" y="26" width="84" height="20" rx="10" fill={DEEP} />
        <rect x="14" y="38" width="84" height="8" fill={DEEP} />
        {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <rect key={r + "-" + c} x={23 + c * 24} y={54 + r * 16} width="18" height="11" rx="3" fill={(r + c) % 3 === 0 ? "#ffe9a3" : (r + c) % 3 === 1 ? PALE : SOFT} />))}
      </MCard>
      <path d="M102 74h14" stroke={SKY} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
      <g transform="translate(138 74) scale(.62)"><path d={GEAR} fill={NAVY} /><circle r="10" fill={YELLOW} /></g>
      <path d="M160 74h14" stroke={SKY} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
      <MCard x={178} y={34} w={50} h={80} r={10}>
        <circle cx="203" cy="56" r="11" fill={YELLOW} />
        <path d="m197 50 6 7 6-7M203 57v7M198 59h10" stroke={NAVY} strokeWidth="2" fill="none" strokeLinecap="round" />
        {bar(188, 76, 30, LINE, 6)}{bar(188, 88, 22, LINE, 6)}
      </MCard>
      <Check x={224} y={108} r={12} />
      <rect x="112" y="112" width="52" height="20" rx="10" fill={GREEN} />
      <path d="M124 122l4 4 8-8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {bar(140, 118, 16, "#bfeedd", 7)}
    </>
  ),
  /* 自動化の結果を、1つの画面で確かめる */
  "case-dashboard": () => (
    <>
      <MCard x={30} y={16} w={180} h={120}>
        <path d="M30 40V28a12 12 0 0 1 12-12h156a12 12 0 0 1 12 12v12Z" fill={NAVY} />
        <circle cx="44" cy="28" r="3.5" fill={YELLOW} /><circle cx="55" cy="28" r="3.5" fill={SKY} />
        {bar(70, 24, 60, "#fff", 7)}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="42" y={50 + i * 20} width="156" height="15" rx="5" fill={i === 2 ? "#fff3c9" : SOFT} />
            <circle cx="52" cy={57.5 + i * 20} r="4.5" fill={i === 2 ? AMBER : GREEN} />
            {bar(62, 54 + i * 20, 64 - (i % 2) * 14, i === 2 ? NAVY : "#a9c4d9", 7)}
            {bar(160, 54 + i * 20, 28, i === 2 ? AMBER : "#bfeedd", 7)}
          </g>
        ))}
      </MCard>
      <g transform="translate(214 24)">
        <circle r="17" fill={AMBER} />
        <path d="M-7 4h14l-2-3v-5a5 5 0 0 0-10 0v5Z" fill="#fff" />
        <circle cy="7" r="2.4" fill="#fff" />
      </g>
    </>
  ),
  /* サイトの点検・改善を自動にし、評価で満点 */
  "case-score": () => (
    <>
      <MCard x={18} y={22} w={124} h={108}>
        <path d="M18 44V34a12 12 0 0 1 12-12h100a12 12 0 0 1 12 12v10Z" fill={SOFT} />
        <circle cx="31" cy="33" r="3.5" fill={CORAL} /><circle cx="42" cy="33" r="3.5" fill={YELLOW} /><circle cx="53" cy="33" r="3.5" fill={SKY} />
        {bar(30, 54, 64, NAVY, 8)}{bar(30, 70, 96, LINE, 7)}{bar(30, 84, 84, LINE, 7)}
        <rect x="30" y="98" width="44" height="18" rx="9" fill={DEEP} />
      </MCard>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${170 + (i === 1 ? 32 : 0)} ${i === 0 ? 46 : i === 1 ? 64 : 106})`}>
          <circle r={i === 0 ? 26 : 18} fill="#fff" stroke="#dff5ec" strokeWidth="6" />
          <circle r={i === 0 ? 26 : 18} fill="none" stroke={GREEN} strokeWidth="6" />
          <path d={i === 0 ? "M-9 0l6 6 12-12" : "M-6 0l4 4 8-8"} stroke={GREEN} strokeWidth={i === 0 ? 4.5 : 3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <Spark x={226} y={24} />
    </>
  ),
};
Object.assign(POINT_SCENES, CASE_SCENES);

/** 支援事例の中身（お客さま・見出し）から、合う絵を選ぶ */
export function caseArtName(text: string, i = 0) {
  if (/点検|SEO|Lighthouse|コラム/.test(text)) return "case-score";
  if (/サーバー|サイトを移行|公式サイト|Cloudflare Pagesへ/.test(text)) return "case-site";
  if (/シフト|勤怠|給与/.test(text)) return "case-shift";
  if (/画面|管理する/.test(text)) return "case-dashboard";
  if (/入力ルール|記帳/.test(text)) return "rules";
  if (/freee|会計/.test(text)) return "cloud";
  return ["refresh", "chart", "link", "layout"][i % 4];
}

export function PointArt({ name, tone = "sky" }: { name?: string; tone?: "sky" | "warm" }) {
  const scene = POINT_SCENES[name || ""];
  if (!scene) return <SpotIcon name={name} tone={tone} size={126} />;
  return <svg className="art lpx-point-svg" viewBox="0 0 240 150" aria-hidden="true" focusable="false">{scene()}</svg>;
}
