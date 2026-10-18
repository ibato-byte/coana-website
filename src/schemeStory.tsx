import { useEffect, useRef, useState, type RefObject } from "react";

/* ───────────────────────── HOW IT WORKS：仕組みのアニメーション（各サービスLP） ─────────────────────────
 * 図の工程（カード）のあいだを、小さなラベル付きのチップ（「領収書」「会計データ」「見込み客」など）が1つずつ移動して、
 * 「何がどこからどこへ」を見せる。決まりごとは docs/motion-rules.md。
 * - 一度に動くのは1つ（経理代行の最後だけ、レポートが御社へ・データが税理士へと同時に分かれる）。
 * - 移動は約0.9秒のなめらかな動き。着いたらカードの上の縁に止まり（文字に重ならない）、その工程をそっと強調して「今ここ」が読める間を取る。
 * - 一周（約8〜12秒）したら、完成した状態のまま約8秒ひと息置いてから、また最初から。
 * - 止めるとき：画面外・タブが非表示・図にカーソルを当てている・工程の説明を開いている間（戻れば続きから）。
 * - 文字は常に読める。レイアウトは動かさない（チップは transform だけ）。
 * - 「動きを減らす」設定では動かさず、全工程を終えた状態で見せる。
 * 工程の指定は、各図のカード（またはSVGの要素）に付けた data-story="n0" などのキー。"c" は中心（COANA TOKYO）。 */

export type StoryIcon = "doc" | "data" | "report" | "chat" | "person" | "people" | "check" | "mail" | "heart" | "layout" | "card" | "chart" | "calendar" | "target" | "megaphone" | "refresh" | "photo" | "handshake" | "manual";

export type Beat = {
  /** 着く工程 */
  to: string;
  /** 出発する工程（チップがまだないときや、別の場所から出すとき） */
  from?: string;
  label: string;
  icon?: StoryIcon;
  /** 成果（受注・お客さま・レポートなど）は黄色で */
  gold?: boolean;
  /** 途中で通る点："c"（中心）や "below"（図の下を回って戻る） */
  via?: string;
  /** 同時に分かれて進むもう1つのチップ */
  also?: Omit<Beat, "also">;
};

export type Story = {
  /** このアニメーションで伝えたい一文（PR とコードの説明用） */
  message: string;
  /** 一周ぶんの動き。loop は何周目か（周ごとに例を変えるとき） */
  beats: (loop: number) => Beat[];
  /** 通ったら「✓」を付ける工程（一つずつ整っていく様子を見せるとき） */
  checks?: string[];
};

const BO_TASKS = [
  { node: "n0", task: "請求書の発行" },
  { node: "n1", task: "給与計算の準備" },
  { node: "n2", task: "契約書の管理" },
  { node: "n3", task: "見積書の作成" },
];

export const STORIES: Record<string, Story> = {
  bookkeeping: {
    message: "御社は資料を入れるだけ。入力から月次の締めまで任せられて、毎月レポートが届き、決算用のデータは顧問税理士へ渡る。",
    beats: () => [
      { to: "n0", label: "領収書・請求書", icon: "doc" },
      { to: "n1", label: "領収書・請求書", icon: "doc" },
      { to: "n2", label: "会計データ", icon: "data" },
      { to: "n3", label: "会計データ", icon: "data" },
      { to: "n4", label: "月次レポート", icon: "report", gold: true, also: { from: "n3", to: "n5", label: "決算用データ", icon: "data" } },
    ],
  },
  "backoffice-dx": {
    message: "チャットで頼むだけで、チームが経理・労務・総務・事務を処理し、手順はマニュアルとして残っていく。",
    beats: (loop) => {
      const t = BO_TASKS[loop % BO_TASKS.length];
      return [
        { to: "n5", label: `依頼：${t.task}`, icon: "chat" },
        { to: "c", label: `依頼：${t.task}`, icon: "chat" },
        { to: t.node, label: t.task, icon: "doc" },
        { to: "c", label: "対応済み", icon: "check" },
        { to: "n4", label: "手順をマニュアル化", icon: "manual" },
        { to: "n5", label: "完了のご報告", icon: "check", gold: true },
      ];
    },
  },
  "cloud-accounting": {
    message: "銀行・カード・請求書のデータが自動で会計ソフトに集まり、顧問税理士と共有され、経営者は翌月早々に数字が分かる。",
    beats: () => [
      { to: "n0", label: "口座・カードの明細", icon: "card" },
      { to: "n2", via: "c", label: "自動で取り込み", icon: "data" },
      { from: "n1", to: "n1", label: "請求・入金のデータ", icon: "doc" },
      { to: "n2", label: "請求・入金のデータ", icon: "doc" },
      { to: "n3", label: "データをそのまま共有", icon: "data" },
      { from: "n2", to: "n4", via: "c", label: "月次の数字", icon: "chart", gold: true },
    ],
  },
  "startup-support": {
    checks: ["n0", "n1", "n2", "n3", "n4"],
    message: "ひとつの窓口に相談すると、計画・資金・事務・集客・専門家との連携が順番に整い、開業の土台ができあがる。",
    beats: () => [
      { to: "n5", label: "何から始めれば？", icon: "chat" },
      { to: "c", label: "まとめて相談", icon: "chat" },
      { to: "n0", label: "事業計画", icon: "doc" },
      { to: "n1", label: "資金の準備", icon: "card" },
      { to: "n2", label: "経理・事務の仕組み", icon: "data" },
      { to: "n3", label: "集客の準備", icon: "megaphone" },
      { to: "n4", label: "専門家と連携", icon: "handshake" },
      { to: "n5", via: "c", label: "開業の土台が整う", icon: "check", gold: true },
    ],
  },
  "startup-support-en": {
    checks: ["n0", "n1", "n2", "n3", "n4"],
    message: "One point of contact gets your plan, funding, back office, customs and professionals in place, one by one, until your foundation is ready.",
    beats: () => [
      { to: "n5", label: "Where do I start?", icon: "chat" },
      { to: "c", label: "Ask us in English", icon: "chat" },
      { to: "n0", label: "Business plan", icon: "doc" },
      { to: "n1", label: "Funding", icon: "card" },
      { to: "n2", label: "Back office", icon: "data" },
      { to: "n3", label: "Local customs", icon: "check" },
      { to: "n4", label: "Professionals", icon: "handshake" },
      { to: "n5", via: "c", label: "Ready to launch", icon: "check", gold: true },
    ],
  },
  "sales-support": {
    message: "見込み客が、相談→商談→受注まで一本の流れで進み、振り返りが次の一手につながる。",
    beats: () => [
      { to: "n0", label: "見込み客", icon: "person" },
      { to: "n1", label: "見込み客", icon: "person" },
      { to: "n2", label: "相談", icon: "chat" },
      { to: "n3", label: "商談", icon: "doc" },
      { to: "n3", label: "受注", icon: "check", gold: true },
      { to: "n4", label: "数字で振り返り", icon: "chart" },
      { to: "n0", via: "below", label: "次の一手へ", icon: "refresh" },
    ],
  },
  "seminar-event": {
    message: "告知で集まった参加者が、当日の体験と開催後のフォローを経て、お客さまに変わる。",
    beats: () => [
      { to: "n0", label: "テーマ", icon: "target" },
      { to: "n1", label: "告知", icon: "megaphone" },
      { to: "n2", label: "申込", icon: "people" },
      { to: "n3", label: "参加者", icon: "people" },
      { to: "n4", label: "参加者", icon: "people" },
      { to: "n4", label: "お客さま", icon: "handshake", gold: true },
    ],
  },
  "sns-management": {
    message: "計画→投稿→反応の振り返りが毎月まわり、次の月の投稿に活かされていく。",
    beats: () => [
      { to: "n0", label: "届けたい相手", icon: "target" },
      { to: "n1", label: "今月の計画", icon: "calendar" },
      { to: "n2", label: "投稿", icon: "photo" },
      { to: "n3", label: "投稿", icon: "photo" },
      { to: "n4", label: "反応", icon: "heart" },
      { to: "n1", via: "below", label: "翌月の計画へ", icon: "refresh", gold: true },
    ],
  },
  "web-production": {
    message: "目的から原稿・デザインへとサイトが組み上がり、訪れた人が問い合わせにつながる。",
    beats: () => [
      { to: "n0", label: "設計図", icon: "layout" },
      { to: "n1", label: "原稿", icon: "doc" },
      { to: "n2", label: "サイト", icon: "layout" },
      { to: "n3", label: "訪問者", icon: "person" },
      { to: "n3", label: "問い合わせ", icon: "mail", gold: true },
      { to: "n4", label: "改善", icon: "chart" },
    ],
  },
};

/* 時間（ミリ秒） */
const MOVE = 950; // 1回の移動
const DWELL = 750; // 着いてから次の移動まで（「今ここ」を読む間）
const FADE = 350;
const END_HOLD = 1800; // 一周の最後
const REST = 8000; // 次の周までのひと息（完成した状態のまま）

type Chip = { id: number; label: string; icon: StoryIcon; gold: boolean; x: number; y: number; shown: boolean; instant: boolean; at: string; right: boolean };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 仕組みのアニメーションを動かす。
 * @param box 図の外側（position: relative）。中に data-story のキーを付けた要素を置く
 * @param story STORIES のどれか（なければ何もしない）
 * @param keys 図にあるすべてのキー（「動きを減らす」設定では全部を完了に）
 * @param verticalQuery 縦に並ぶレイアウトになる幅（チップをカードの右上に止める）
 * @param hold 外から一時停止したいとき（工程の説明を開いている間など）
 */
export function useSchemeStory(box: RefObject<HTMLElement | null>, story: Story | undefined, keys: string[], verticalQuery: string, hold = false) {
  const [reduce] = useState(reducedMotion);
  const still = reduce || !story;
  const [now, setNow] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(still ? keys : []);
  const [chips, setChips] = useState<Chip[]>([]);
  const [running, setRunning] = useState(false);
  const holdRef = useRef(hold);
  const hoverRef = useRef(false);
  const visibleRef = useRef(false);
  const wakeRef = useRef<() => void>(() => {});
  holdRef.current = hold;
  const keyList = keys.join(",");

  useEffect(() => {
    if (!hold) wakeRef.current();
  }, [hold]);

  useEffect(() => {
    const el = box.current;
    if (still || !el || !story) return;
    let cancelled = false;
    const vertical = window.matchMedia(verticalQuery);
    const paused = () => !visibleRef.current || document.hidden || holdRef.current || hoverRef.current;
    // 止めている間は待ち、再開したら続きから
    const gate = () => new Promise<void>((resolve) => {
      const check = () => { if (cancelled || !paused()) { wakeRef.current = () => {}; resolve(); } };
      wakeRef.current = check;
      check();
    });
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const find = (key: string) => {
      for (const t of el.querySelectorAll<Element>(`[data-story="${key}"]`)) {
        const r = t.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
      }
      return null;
    };
    const point = (key: string) => {
      const r = find(key);
      if (!r) return null;
      const b = el.getBoundingClientRect();
      // 横並び：カードの上の縁の中央。縦並び：カードの右上（チップの右端をそろえる）
      return vertical.matches ? { x: r.right - b.left - 14, y: r.top - b.top } : { x: r.left - b.left + r.width / 2, y: r.top - b.top };
    };
    // 図の下（カードの下の余白）を通るときの高さ
    const underY = () => {
      const top = el.getBoundingClientRect().top;
      return Math.max(...keys.map((k) => { const r = find(k); return r ? r.bottom - top : 0; })) + 18;
    };
    let seq = 0;
    const update = (id: number, patch: Partial<Chip>) => setChips((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const place = async (key: string, beat: Omit<Beat, "also">) => {
      const p = point(key);
      if (!p) return null;
      const id = ++seq;
      setChips((cs) => [...cs, { id, label: beat.label, icon: beat.icon ?? "doc", gold: !!beat.gold, x: p.x, y: p.y, shown: false, instant: true, at: key, right: vertical.matches }]);
      await wait(30);
      update(id, { shown: true, instant: false });
      return id;
    };
    const move = async (id: number, from: string, beat: Omit<Beat, "also">) => {
      update(id, { label: beat.label, icon: beat.icon ?? "doc", gold: !!beat.gold, instant: false });
      if (from === beat.to) return wait(FADE);
      const a = point(from), b = point(beat.to);
      if (!a || !b) return;
      if (beat.via === "below" && !vertical.matches) {
        // 図の下を回って戻る：いったん消えてカードの下に出直し、カードの下の余白を横に進む（文字の上を通らない）
        update(id, { shown: false });
        await wait(FADE);
        update(id, { x: a.x, y: underY(), instant: true });
        await wait(30);
        update(id, { shown: true, instant: false });
        await wait(FADE);
        update(id, { x: b.x, at: beat.to });
        return wait(MOVE * 1.3);
      }
      const mid = beat.via && beat.via !== "below" ? point(beat.via) : null;
      if (mid) {
        update(id, { x: mid.x, y: mid.y });
        await wait(MOVE * 0.62);
        update(id, { x: b.x, y: b.y, at: beat.to });
        return wait(MOVE * 0.62);
      }
      update(id, { x: b.x, y: b.y, at: beat.to });
      return wait(MOVE);
    };

    const run = async () => {
      let loop = 0;
      while (!cancelled) {
        let main: { id: number; at: string } | null = null;
        for (const beat of story.beats(loop)) {
          await gate();
          if (cancelled) return;
          const start: string = beat.from ?? main?.at ?? beat.to;
          if (!main || beat.from) {
            if (main) { update(main.id, { shown: false }); await wait(FADE); } // 前のチップが消えてから、次のチップを出す
            const id = await place(start, beat);
            if (id === null) continue;
            main = { id, at: start };
            await wait(FADE);
          }
          setNow(null);
          const moves = [move(main.id, main.at, beat)];
          if (beat.also) {
            const id = await place(beat.also.from ?? main.at, beat.also);
            if (id !== null) moves.push(move(id, beat.also.from ?? main.at, beat.also));
          }
          await Promise.all(moves);
          if (cancelled) return;
          main.at = beat.to;
          setNow(beat.to);
          setDone((d) => [...new Set([...d, beat.to, ...(beat.also ? [beat.also.to] : [])])]);
          await wait(DWELL);
        }
        await wait(END_HOLD);
        // 一周おわり：チップを消し、完成した状態のままひと息
        setChips((cs) => cs.map((c) => ({ ...c, shown: false })));
        setNow(null);
        await wait(REST);
        await gate();
        if (cancelled) return;
        setChips([]);
        setDone([]);
        await wait(900);
        loop++;
      }
    };

    // 画面に2割以上入っている間だけ進める
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visibleRef.current = e.isIntersecting && e.intersectionRatio >= 0.2;
      wakeRef.current();
    }, { threshold: [0, 0.2, 0.4] });
    io.observe(el);
    const onVis = () => wakeRef.current();
    document.addEventListener("visibilitychange", onVis);
    // PC：図にカーソルを当てている間は止める
    const enter = (e: PointerEvent) => { if (e.pointerType === "mouse") hoverRef.current = true; };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") { hoverRef.current = false; wakeRef.current(); } };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    // 画面幅が変わったら、チップを今いる工程の位置へ（動きなしで）
    const ro = new ResizeObserver(() => setChips((cs) => cs.map((c) => { const p = point(c.at); return p ? { ...c, x: p.x, y: p.y, instant: true, right: vertical.matches } : c; })));
    ro.observe(el);
    setRunning(true);
    void run();
    return () => {
      cancelled = true;
      wakeRef.current();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      setRunning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, story, still, keyList, verticalQuery]);

  const state = (key: string) => `${done.includes(key) ? " is-done" : ""}${now === key ? " is-now" : ""}`;
  return { state, chips, running, still };
}

/** 動くチップ（図の上に重ねる。読み上げない） */
export function StoryChips({ chips }: { chips: Chip[] }) {
  return (
    <>
      {chips.map((c) => (
        <span
          key={c.id}
          className={`story-chip${c.gold ? " is-gold" : ""}${c.instant ? " is-instant" : ""}${c.right ? " is-right" : ""}`}
          style={{ transform: `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`, opacity: c.shown ? 1 : 0 }}
          aria-hidden="true"
        >
          <StoryGlyph name={c.icon} />
          {c.label}
        </span>
      ))}
    </>
  );
}

const GLYPHS: Record<StoryIcon, string> = {
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  data: "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  report: "M5 3h14v18H5zM9 17v-3M12 17v-6M15 17V9",
  chat: "M4 5h16v11H9l-5 4zM8 10h8M8 13h5",
  person: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  people: "M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4a3 3 0 0 1 0 6M18 14c2.2.6 3.5 2.6 3.5 6",
  check: "M4 12.5l5 5L20 6.5",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  layout: "M3 4h18v16H3zM3 9h18M9 9v11",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  chart: "M4 20h16M7 16v-4M12 16V8M17 16v-7",
  calendar: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  megaphone: "M3 10v4h4l7 5V5L7 10zM18 9a4 4 0 0 1 0 6",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4",
  photo: "M3 6h4l2-2h6l2 2h4v14H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  handshake: "M3 11l4-4 4 2 3-2 7 5-4 4-3-2-2 2-3-2-2 1zM11 9l3 3",
  manual: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6",
};

function StoryGlyph({ name }: { name: StoryIcon }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={GLYPHS[name]} />
    </svg>
  );
}
