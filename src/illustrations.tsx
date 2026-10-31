import { useState, type CSSProperties, type ReactNode } from "react";
import "./illustrations.css";

/* ───────────────────────── イラスト（SVG） ─────────────────────────
 * トップのヒーロー（HeroScene）と、サービスごとの挿絵（ServiceArt）。
 * 色は index.css のトークンに合わせた固定値。動きは illustrations.css の art-* クラスで付け、
 * prefers-reduced-motion では止める。いずれも装飾なので aria-hidden。
 */

const NAVY = "#16334d";
const SKY = "#55b8f3";
const DEEP = "#087fe5";
const YELLOW = "#ffd85a";
/** 線に使う黄色。YELLOW のままでは淡い背景に溶けるため、少し濃いオレンジ寄りにする（「攻め」の色） */
const AMBER = "#f2a516";
const SOFT = "#eef6fc";
const LINE = "#d8e7f2";

/** アニメーションの開始を遅らせる（CSS の --d） */
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Frame({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <svg className={`art ${className}`} viewBox="0 0 480 360" aria-hidden="true" focusable="false" data-label={label}>
      <ellipse cx="240" cy="190" rx="200" ry="150" fill={SOFT} />
      <circle cx="400" cy="70" r="22" fill={YELLOW} opacity=".5" className="art-float" style={d(1.2)} />
      <circle cx="70" cy="290" r="12" fill={SKY} opacity=".35" className="art-float" style={d(.4)} />
      {children}
    </svg>
  );
}

/** 白いカード（影つき） */
function Card({ x, y, w, h, r = 14, className, style, children }: { x: number; y: number; w: number; h: number; r?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <g className={className} style={style}>
      <rect x={x + 3} y={y + 6} width={w} height={h} rx={r} fill={NAVY} opacity=".08" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#fff" stroke={LINE} strokeWidth="2" />
      {children}
    </g>
  );
}

/* ── 経理代行：領収書 → 帳簿 → 月次レポート ── */
function Bookkeeping() {
  return (
    <Frame>
      <path d="M150 170 C 185 170 190 150 215 150" className="art-dash" stroke={DEEP} />
      <path d="M330 190 C 350 190 352 210 368 210" className="art-dash" stroke={DEEP} style={d(.6)} />
      <g className="art-float">
        <path d="M70 92h84v124l-10-7-11 7-10-7-11 7-10-7-11 7-10-7-11 7Z" fill="#fff" stroke={LINE} strokeWidth="2" />
        <circle cx="112" cy="124" r="15" fill={YELLOW} />
        <path d="m105 116 7 9 7-9M112 125v10M106 128h12" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M86 156h52M86 172h52M86 188h34" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      </g>
      <Card x={200} y={92} w={140} h={176}>
        <rect x="200" y="92" width="140" height="30" rx="14" fill={NAVY} />
        <rect x="200" y="108" width="140" height="14" fill={NAVY} />
        <circle cx="216" cy="107" r="4" fill={YELLOW} /><circle cx="230" cy="107" r="4" fill={SKY} />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x="216" y={140 + i * 24} width="40" height="9" rx="4.5" fill={LINE} />
            <rect x="266" y={140 + i * 24} width="58" height="9" rx="4.5" fill={i === 4 ? YELLOW : SKY} className="art-fill" style={d(i * .35)} />
          </g>
        ))}
      </Card>
      <Card x={346} y={178} w={96} h={100} className="art-float" style={d(.8)}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={362 + i * 18} y={250 - (16 + i * 12)} width="11" height={16 + i * 12} rx="3" fill={i === 3 ? DEEP : SKY} className="art-grow" style={d(i * .25)} />
        ))}
        <path d="M360 256h70" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
        <circle cx="430" cy="186" r="15" fill={DEEP} className="art-pop" />
        <path d="m423 186 5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="art-pop" />
      </Card>
    </Frame>
  );
}

/* ── クラウド会計・ITツール導入：クラウドに各ツールがつながる ── */
function CloudAccounting() {
  // 3枚のカードは同じ高さ・同じ大きさで並べ、アイコンは上の色帯を除いた本体部分の上下左右中央に置く
  const W = 88, H = 76, Y = 228, BAND = 10;
  const tiles = [
    { x: 70, c: SKY, icon: <path d="M-14 11V-1M0 11V-11M14 11V3" /> },
    { x: 196, c: YELLOW, icon: <><circle cx="0" cy="0" r="13" /><path d="M0-6v6l5 4" /></> },
    { x: 322, c: DEEP, icon: <><path d="M-11-13h22v26h-22z" /><path d="M-6-4h12M-6 4h8" /></> },
  ];
  return (
    <Frame>
      {tiles.map((t, i) => (
        <path key={i} d={`M240 140 L ${t.x + W / 2} ${Y}`} className="art-dash" stroke={DEEP} style={d(i * .4)} />
      ))}
      <g className="art-float">
        <path d="M172 140a40 40 0 0 1-4-79.6A58 58 0 0 1 280 50a42 42 0 0 1 22 82 40 40 0 0 1-10 8Z" fill="#fff" stroke={LINE} strokeWidth="2" />
        {/* 回る矢印は、雲のふくらみの見た目の中心（下の平らな部分を除いた中心）に置く。回転の中心も同じ点 */}
        <g className="art-spin" style={{ transformOrigin: "234px 82px" }}>
          <path d="M254 82a20 20 0 0 1-34 14" stroke={DEEP} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M214 82a20 20 0 0 1 34-14" stroke={SKY} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="m248 60 1 9-9 0" stroke={SKY} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m220 104-1-9 9 0" stroke={DEEP} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      {/* 3枚とも同じ動きで浮かせ、並びがずれて見えないようにする */}
      <g className="art-float" style={d(.5)}>
        {tiles.map((t, i) => (
          <Card key={i} x={t.x} y={Y} w={W} h={H}>
            <rect x={t.x} y={Y} width={W} height={BAND} rx="5" fill={t.c} />
            <g transform={`translate(${t.x + W / 2} ${Y + BAND + (H - BAND) / 2})`} stroke={NAVY} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">{t.icon}</g>
          </Card>
        ))}
      </g>
    </Frame>
  );
}

/* ── バックオフィス代行・DX：タスクが順にチェックされる ── */
function BackofficeDx() {
  return (
    <Frame>
      <Card x={120} y={70} w={190} h={220}>
        <rect x="186" y="60" width="58" height="22" rx="8" fill={NAVY} />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="142" y={104 + i * 44} width="26" height="26" rx="8" fill={SOFT} stroke={LINE} strokeWidth="2" />
            <path d={`m148 ${117 + i * 44} 5 6 10-12`} stroke={DEEP} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="art-check" style={d(i * .6)} />
            <rect x="180" y={110 + i * 44} width={i % 2 ? 84 : 108} height="10" rx="5" fill={LINE} />
          </g>
        ))}
      </Card>
      <g className="art-spin" style={{ transformOrigin: "360px 120px" }}>
        <path d="M360 86l8 2 3 10 9 5 9-4 6 6-4 9 5 9 10 3v10l-10 3-5 9 4 9-6 6-9-4-9 5-3 10h-9l-3-10-9-5-9 4-6-6 4-9-5-9-10-3v-10l10-3 5-9-4-9 6-6 9 4 9-5 3-10Z" fill={YELLOW} transform="translate(-4 -4) scale(1.0)" />
        <circle cx="360" cy="125" r="13" fill="#fff" />
      </g>
      <Card x={318} y={196} w={118} h={72} r={18} className="art-float" style={d(.7)}>
        <path d="M340 268l-8 16 22-16" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="348" cy="232" r="6" fill={SKY} className="art-blink" />
        <circle cx="368" cy="232" r="6" fill={SKY} className="art-blink" style={d(.2)} />
        <circle cx="388" cy="232" r="6" fill={SKY} className="art-blink" style={d(.4)} />
      </Card>
    </Frame>
  );
}

/* ── 創業支援：事業計画書からロケットが飛び立つ ── */
function Startup() {
  return (
    <Frame>
      <Card x={70} y={130} w={130} h={160}>
        <rect x="88" y="150" width="70" height="12" rx="6" fill={NAVY} />
        <path d="M88 180h94M88 198h94M88 216h62" stroke={LINE} strokeWidth="6" strokeLinecap="round" />
        <path d="m92 270 22-20 18 10 30-30" stroke={DEEP} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="art-draw" />
      </Card>
      <path d="M210 250 C 250 240 270 200 290 160" className="art-dash art-dash-warm" stroke={AMBER} />
      <g className="art-bob">
        <g transform="rotate(35 330 120)">
          <path d="M330 40c26 18 38 50 34 92h-68c-4-42 8-74 34-92Z" fill="#fff" stroke={LINE} strokeWidth="2" />
          <circle cx="330" cy="88" r="14" fill={SKY} stroke={NAVY} strokeWidth="3" />
          <path d="M296 112l-20 26 22-4M364 112l20 26-22-4" fill={DEEP} />
          <path d="M314 134h32l-6 18h-20Z" fill={NAVY} />
          <path d="M322 154q8 22 16 0" fill={YELLOW} className="art-flame" />
        </g>
      </g>
      <g className="art-float" style={d(1)}>
        <circle cx="400" cy="250" r="30" fill={YELLOW} />
        <path d="m389 236 11 14 11-14M400 250v16M391 254h18M391 261h18" stroke={NAVY} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

/* ── 業務改善・IT化支援：業務の流れを書き出し、手作業の箇所に印をつけて順番を決める ── */
function ItConsulting() {
  return (
    <Frame>
      {/* 業務フロー図（左）：4つの工程と矢印。2つ目の工程に「手作業」の印 */}
      <Card x={56} y={78} w={230} h={210}>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="80" y={96 + i * 46} width="120" height="30" rx="8" fill={i === 1 ? YELLOW : SOFT} stroke={i === 1 ? AMBER : LINE} strokeWidth="2" className="art-fill" style={d(i * .3)} />
            <rect x="92" y={107 + i * 46} width={56 + (i % 2) * 24} height="8" rx="4" fill={i === 1 ? NAVY : LINE} />
            {i < 3 && <path d={`M140 ${126 + i * 46}v12`} stroke={DEEP} strokeWidth="3" strokeLinecap="round" />}
          </g>
        ))}
        {/* 手作業の印（！）と、順番の番号 */}
        <circle cx="222" cy="157" r="13" fill={AMBER} className="art-pop" />
        <path d="M222 150v8M222 162v1.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <g key={i} className="art-pop" style={d(.6 + i * .25)}>
            <circle cx="222" cy={111 + [0, 2, 3][i] * 46} r="11" fill={i === 0 ? DEEP : SKY} />
            <text x="222" y={115 + [0, 2, 3][i] * 46} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Outfit, sans-serif">{i + 1}</text>
          </g>
        ))}
      </Card>
      {/* 虫めがね（棚卸し） */}
      <g className="art-float" style={d(.5)}>
        <circle cx="330" cy="150" r="40" fill="#fff" stroke={NAVY} strokeWidth="6" />
        <circle cx="330" cy="150" r="28" fill={SKY} opacity=".25" />
        <path d="M358 178l34 34" stroke={NAVY} strokeWidth="12" strokeLinecap="round" />
        <path d="M318 150h24M330 138v24" stroke={DEEP} strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* ツールの候補（右下の小さなカード） */}
      <Card x={318} y={236} w={126} h={60} r={12} className="art-float" style={d(.9)}>
        <rect x="330" y="250" width="30" height="30" rx="8" fill={DEEP} />
        <path d="M338 265h14M345 258v14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <rect x="370" y="254" width="60" height="8" rx="4" fill={LINE} />
        <rect x="370" y="268" width="40" height="8" rx="4" fill={YELLOW} />
      </Card>
    </Frame>
  );
}

/* ── 自動化・システム開発：ツール同士がつながり、データが自動で流れる ── */
function Automation() {
  const W = 84, H = 70;
  const tiles = [
    { x: 56, y: 92, c: SKY, icon: <><rect x="-11" y="-13" width="22" height="26" rx="3" /><path d="M-5-4h10M-5 3h10M-5 10h6" /></> },
    { x: 56, y: 208, c: YELLOW, icon: <><path d="M-12-6h24v12h-24z" /><path d="M-12-6l12 8 12-8" /></> },
    { x: 340, y: 92, c: DEEP, icon: <><path d="M-12 11V-1M-4 11V-11M4 11V3M12 11V-6" /></> },
    { x: 340, y: 208, c: SKY, icon: <><path d="M-12-8h24v14h-16l-6 5v-5h-2z" /></> },
  ];
  return (
    <Frame>
      {/* 4つのツール → 中心の歯車 → 流れる線 */}
      {tiles.map((t, i) => (
        <path key={i} d={`M${t.x < 200 ? t.x + W : t.x} ${t.y + H / 2} C 220 ${t.y + H / 2} 220 180 240 180`} className="art-dash" stroke={DEEP} style={d(i * .3)} fill="none" />
      ))}
      <g className="art-float" style={d(.4)}>
        {tiles.map((t, i) => (
          <Card key={i} x={t.x} y={t.y} w={W} h={H}>
            <rect x={t.x} y={t.y} width={W} height="10" rx="5" fill={t.c} />
            <g transform={`translate(${t.x + W / 2} ${t.y + 10 + (H - 10) / 2})`} stroke={NAVY} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round">{t.icon}</g>
          </Card>
        ))}
      </g>
      {/* 中心：回る歯車（自動で動く仕組み） */}
      <g className="art-spin" style={{ transformOrigin: "240px 180px" }}>
        <path d="M240 128l8 2 2 10 9 4 9-5 6 6-5 9 4 9 10 2 2 8-2 8-10 2-4 9 5 9-6 6-9-5-9 4-2 10-8 2-8-2-2-10-9-4-9 5-6-6 5-9-4-9-10-2-2-8 2-8 10-2 4-9-5-9 6-6 9 5 9-4 2-10Z" fill="#fff" stroke={NAVY} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="240" cy="180" r="18" fill={YELLOW} stroke={NAVY} strokeWidth="5" />
      </g>
      {/* データの粒（線の上を流れる） */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="150" cy="127" r="6" fill={i === 1 ? YELLOW : DEEP} className="art-drop" style={d(i * .8)} />
      ))}
      {/* 右下：できあがったPDF */}
      <g className="art-float" style={d(1)}>
        <path d="M392 262h40l14 14v46h-54Z" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M432 262v14h14" fill="none" stroke={LINE} strokeWidth="2" />
        <rect x="400" y="288" width="30" height="6" rx="3" fill={LINE} /><rect x="400" y="300" width="22" height="6" rx="3" fill={SKY} />
        <circle cx="440" cy="268" r="11" fill={DEEP} className="art-pop" /><path d="m435 268 4 4 7-8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" className="art-pop" />
      </g>
    </Frame>
  );
}

/* ── SNS運用：スマホの投稿にいいねが集まる ── */
function Sns() {
  const heart = "M0 6C0-2 10-4 12 3 14-4 24-2 24 6 24 13 12 20 12 20S0 13 0 6Z";
  return (
    <Frame>
      <Card x={170} y={40} w={140} h={270} r={26}>
        <rect x="216" y="52" width="48" height="8" rx="4" fill={LINE} />
        <rect x="186" y="74" width="108" height="88" rx="12" fill={SKY} opacity=".55" />
        <circle cx="216" cy="104" r="12" fill={YELLOW} />
        <path d="m186 150 34-30 26 20 22-14 26 24v2Z" fill={DEEP} opacity=".7" />
        <path d="M186 180h90M186 198h64" stroke={LINE} strokeWidth="7" strokeLinecap="round" />
        <path transform="translate(186 222) scale(.9)" d={heart} fill="#ff6b81" />
        <rect x="216" y="226" width="40" height="9" rx="4.5" fill={LINE} />
        <rect x="186" y="254" width="108" height="40" rx="10" fill={SOFT} />
      </Card>
      {[0, 1, 2].map((i) => (
        <g key={i} className="art-rise" style={d(i * .8)}>
          <circle cx={350 + i * 22} cy={210 - i * 10} r="18" fill="#fff" stroke={LINE} strokeWidth="2" />
          <path transform={`translate(${340 + i * 22} ${200 - i * 10}) scale(.85)`} d={heart} fill="#ff6b81" />
        </g>
      ))}
      <Card x={60} y={140} w={92} h={92} className="art-float" style={d(.6)}>
        <rect x="60" y="140" width="92" height="22" rx="14" fill={NAVY} />
        <rect x="60" y="150" width="92" height="12" fill={NAVY} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={72 + (i % 3) * 24} y={174 + Math.floor(i / 3) * 24} width="16" height="16" rx="4" fill={i === 4 ? YELLOW : SOFT} />
        ))}
      </Card>
    </Frame>
  );
}

/* ── Webサイト制作：ブラウザの中にページが組み上がる ── */
function Web() {
  return (
    <Frame>
      <Card x={60} y={60} w={280} h={210}>
        <rect x="60" y="60" width="280" height="26" rx="14" fill={NAVY} />
        <rect x="60" y="74" width="280" height="12" fill={NAVY} />
        <circle cx="78" cy="73" r="4" fill="#ff8a8a" /><circle cx="92" cy="73" r="4" fill={YELLOW} /><circle cx="106" cy="73" r="4" fill={SKY} />
        <rect x="80" y="100" width="240" height="64" rx="10" fill={SKY} opacity=".45" className="art-slide" />
        <rect x="96" y="118" width="110" height="10" rx="5" fill={NAVY} className="art-slide" style={d(.2)} />
        <rect x="96" y="136" width="60" height="16" rx="8" fill={YELLOW} className="art-slide" style={d(.35)} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={80 + i * 82} y="178" width="72" height="70" rx="10" fill={SOFT} stroke={LINE} strokeWidth="2" className="art-slide" style={d(.5 + i * .15)} />
        ))}
      </Card>
      <Card x={340} y={140} w={88} h={160} r={18} className="art-float" style={d(.4)}>
        <rect x="352" y="160" width="64" height="40" rx="8" fill={SKY} opacity=".45" />
        <rect x="352" y="210" width="64" height="10" rx="5" fill={LINE} />
        <rect x="352" y="228" width="44" height="10" rx="5" fill={LINE} />
        <rect x="352" y="252" width="40" height="16" rx="8" fill={YELLOW} />
      </Card>
      <path className="art-cursor" d="M250 210l0 34 9-9 7 15 7-3-7-15h13Z" fill={NAVY} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </Frame>
  );
}

const ARTS: Record<string, () => ReactNode> = {
  bookkeeping: Bookkeeping,
  "cloud-accounting": CloudAccounting,
  "backoffice-dx": BackofficeDx,
  "startup-support": Startup,
  "startup-support-en": Startup,
  "it-consulting": ItConsulting,
  automation: Automation,
  "sns-management": Sns,
  "web-production": Web,
};

/** サービス（content/solutions の slug）ごとの挿絵。未登録の slug はバックオフィスの図で代用 */
export function ServiceArt({ slug, className = "" }: { slug?: string; className?: string }) {
  const Art = ARTS[slug || ""] || BackofficeDx;
  return <div className={`service-art ${className}`}><Art /></div>;
}

/* ───────────────────────── トップのヒーロー：仕事の様子 ─────────────────────────
 * 左から資料（バックオフィス）が流れ込み、中央の画面で数字が整い、右へ集客・営業の成果が広がる。
 */
export function HeroScene() {
  const heart = "M0 6C0-2 10-4 12 3 14-4 24-2 24 6 24 13 12 20 12 20S0 13 0 6Z";
  return (
    <svg className="art hero-scene" viewBox="0 0 560 470" aria-hidden="true" focusable="false">
      <circle cx="290" cy="235" r="205" fill="#fff" opacity=".7" />
      <circle cx="290" cy="235" r="150" fill={SOFT} />
      {/* 流れ */}
      <path d="M128 140 C 170 150 180 190 205 200" className="art-dash" stroke={DEEP} />
      <path d="M128 330 C 170 320 180 290 205 280" className="art-dash" stroke={DEEP} style={d(.5)} />
      <path d="M375 200 C 400 190 410 150 438 136" className="art-dash art-dash-warm" stroke={AMBER} style={d(.3)} />
      <path d="M375 280 C 400 290 410 320 438 334" className="art-dash art-dash-warm" stroke={AMBER} style={d(.8)} />

      {/* 中央：ノートPCとダッシュボード */}
      <g>
        <rect x="190" y="154" width="200" height="140" rx="14" fill={NAVY} />
        <rect x="200" y="164" width="180" height="120" rx="8" fill="#fff" />
        <rect x="212" y="176" width="70" height="9" rx="4.5" fill={NAVY} opacity=".85" />
        <rect x="212" y="192" width="44" height="7" rx="3.5" fill={LINE} />
        {[0, 1, 2, 3, 4].map((i) => (
          // 表示したときに一度だけ、左から順に伸びて止まる（右肩上がり＝成長）
          <rect key={i} x={214 + i * 22} y={272 - (18 + i * 11)} width="14" height={18 + i * 11} rx="3" fill={i === 4 ? DEEP : SKY} className="art-grow-once" style={d(.55 + i * .12)} />
        ))}
        <path d="M330 262 l12 -16 12 6 14 -22" stroke={AMBER} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="art-draw-once" style={d(1.25)} />
        <g className="art-pop-once" style={d(1.7)}>
          <circle cx="352" cy="190" r="12" fill={DEEP} />
          <path d="m346 190 4 4 8-9" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M166 298h248l-16 18H182Z" fill="#c9dbe9" />
        <rect x="262" y="298" width="56" height="6" rx="3" fill="#a9c2d6" />
      </g>

      {/* 左上：領収書・請求書 */}
      <g className="art-float">
        <path d="M60 80h70v96l-9-6-9 6-9-6-9 6-9-6-9 6-9-6-7 6Z" fill="#fff" stroke={LINE} strokeWidth="2" />
        <circle cx="95" cy="108" r="13" fill={YELLOW} />
        <path d="m89 101 6 8 6-8M95 109v8M90 112h10" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M74 134h42M74 148h42" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      </g>
      <text x="95" y="206" textAnchor="middle" className="hero-scene-label">経理・請求</text>

      {/* 左下：クラウド連携 */}
      <g className="art-float" style={d(.9)}>
        <path d="M70 360a24 24 0 0 1-2-47.8A34 34 0 0 1 134 306a25 25 0 0 1 4 52Z" fill="#fff" stroke={LINE} strokeWidth="2" />
        {/* 回る矢印は、雲のふくらみの見た目の中心に置く（回転の中心も同じ点） */}
        <g className="art-spin" style={{ transformOrigin: "104px 325px" }}>
          <path d="M116 325a12 12 0 0 1-20 8" stroke={DEEP} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M92 325a12 12 0 0 1 20-8" stroke={SKY} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <text x="102" y="392" textAnchor="middle" className="hero-scene-label">ツール導入</text>

      {/* 右上：SNS・発信 */}
      <g className="art-float" style={d(.4)}>
        <rect x="438" y="84" width="92" height="70" rx="18" fill="#fff" stroke={LINE} strokeWidth="2" />
        <path d="M456 154l-6 14 18-14" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <g transform="translate(472 106) scale(1.05)"><path d={heart} fill="#ff6b81" className="art-beat" /></g>
      </g>
      <text x="484" y="196" textAnchor="middle" className="hero-scene-label">LP・SNS</text>

      {/* 右下：営業・成長 */}
      <g className="art-float" style={d(1.3)}>
        <rect x="438" y="300" width="92" height="76" rx="14" fill="#fff" stroke={LINE} strokeWidth="2" />
        <path d="m452 362 18-18 14 10 30-30" stroke={DEEP} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m502 322 14 2-2 14" stroke={DEEP} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="484" y="404" textAnchor="middle" className="hero-scene-label">自動化</text>

      {/* 中央下：COANA TOKYO */}
      <g className="art-float" style={d(.6)}>
        <rect x="222" y="340" width="136" height="40" rx="20" fill={YELLOW} />
        <text x="290" y="366" textAnchor="middle" className="hero-scene-badge">COANA TOKYO</text>
      </g>
    </svg>
  );
}

/** 小さなアイコン群（トップの「支援スタイル」・サービス一覧の流れなど） */
export type MiniIconName = "expertise" | "team" | "one-stop" | "flexible" | "chat" | "plan" | "doc" | "start";

export function MiniIcon({ name, size = 30 }: { name: string; size?: number }) {
  const c = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name as MiniIconName) {
    case "expertise": return <svg {...c}><rect x="5" y="7" width="22" height="15" rx="2.5" /><path d="M3 25h26M10 17l4-4 3 3 5-5" /></svg>;
    case "team": return <svg {...c}><circle cx="11" cy="11" r="4" /><circle cx="22" cy="12" r="3.2" /><path d="M3.5 26c.6-5 3.4-7.5 7.5-7.5s6.9 2.5 7.5 7.5M18.5 19c4.5-.6 8 1.6 9 6" /></svg>;
    case "one-stop": return <svg {...c}><circle cx="16" cy="16" r="5" /><path d="M16 4v5M16 23v5M4 16h5M23 16h5" /><circle cx="16" cy="4" r="1.5" /><circle cx="16" cy="28" r="1.5" /><circle cx="4" cy="16" r="1.5" /><circle cx="28" cy="16" r="1.5" /></svg>;
    case "flexible": return <svg {...c}><path d="M5 9h14M5 16h8M5 23h18" /><circle cx="23" cy="9" r="3" /><circle cx="17" cy="16" r="3" /><circle cx="27" cy="23" r="0" /></svg>;
    case "chat": return <svg {...c}><path d="M5 7h22v14H14l-6 5v-5H5Z" /><path d="M10 13h12M10 17h7" /></svg>;
    case "plan": return <svg {...c}><path d="M8 4h12l6 6v18H8Z" /><path d="M20 4v6h6M12 16h10M12 21h7" /></svg>;
    case "doc": return <svg {...c}><path d="M7 5h18v22H7Z" /><path d="m11 16 4 4 7-8" /></svg>;
    case "start": return <svg {...c}><path d="M16 4c5 3.5 7 9 6.5 15H9.5C9 13 11 7.5 16 4Z" /><circle cx="16" cy="13" r="2.5" /><path d="M12.5 23l-1 5M19.5 23l1 5M16 23v6" /></svg>;
    default: return <svg {...c}><path d="m7 16 6 6 12-12" /></svg>;
  }
}

/** 実写動画の差し替え枠。CMS で動画（mp4 など）を設定したときだけ、イラストの代わりに表示する。
 * 音なし・ループ。動きを減らす設定の閲覧者には自動再生せず、操作ボタンを出す。 */
export function HeroVideo({ src, poster, fallback, className = "" }: { src?: string; poster?: string; fallback: ReactNode; className?: string }) {
  const [reduce] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!src) return <>{fallback}</>;
  return (
    <video className={`hero-video ${className}`} src={src} poster={poster} muted loop playsInline autoPlay={!reduce} controls={reduce} preload="metadata" aria-hidden={!reduce} />
  );
}
