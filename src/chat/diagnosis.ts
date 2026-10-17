/* ───────────────────────── 鳩博士チャット：「あなたに合うサービス診断」 ─────────────────────────
 * AI は使わず、回答ごとの点数（content/chat.json の diagnosis）を足し合わせて決める。CMS から質問・点数・理由を編集できる。
 * - いちばん点の高いサービスを「おすすめ」、2番目が1番目の6割以上あれば、あわせて提案する（最大2つ）
 * - 2つの組み合わせが combos にあれば、その一言を添える
 */
export type DiagOption = { label: string; phrase?: string; note?: string; scores?: Record<string, number> };
export type DiagQuestion = { id: string; short?: string; text: string; options: DiagOption[] };
export type DiagConfig = {
  title: string;
  intro: string;
  questions: DiagQuestion[];
  reasons: Record<string, string>;
  combos: { pair: [string, string] | string[]; text: string }[];
};
export type DiagResult = {
  picks: { slug: string; score: number; reason: string }[];
  combo?: string;
  notes: string[];
  summary: string[]; // 「質問：回答」の一覧（お問い合わせに引き継ぐ）
};

export function diagnose(config: DiagConfig, answers: number[]): DiagResult {
  const total = new Map<string, number>();
  const notes: string[] = [];
  const chosenOptions = config.questions.map((q, i) => q.options[answers[i]]).filter((o): o is DiagOption => !!o);
  for (const option of chosenOptions) {
    for (const [slug, points] of Object.entries(option.scores ?? {})) total.set(slug, (total.get(slug) ?? 0) + points);
    if (option.note) notes.push(option.note);
  }
  // 理由に添える回答：そのサービスにいちばん点を入れた回答の言い回し（関係のない回答を引用しない）
  const phraseFor = (slug: string) => {
    let best: DiagOption | undefined;
    for (const option of chosenOptions) if (option.phrase && (option.scores?.[slug] ?? 0) > (best?.scores?.[slug] ?? 0)) best = option;
    return best?.phrase ?? "";
  };
  const ranked = [...total.entries()].filter(([slug, score]) => score > 0 && config.reasons[slug]).sort((a, b) => b[1] - a[1]);
  // どの回答でも、必ず1つは提案する（点がつかなかった場合は、全体を見渡せるバックオフィス代行・DX支援）
  if (!ranked.length) ranked.push(["backoffice-dx", 1]);
  const [first, second] = ranked;
  const chosen = second && second[1] >= first[1] * 0.6 && second[1] >= 3 ? [first, second] : [first];
  const picks = chosen.map(([slug, score], i) => {
    const base = config.reasons[slug] ?? "";
    const phrase = i === 0 && !slug.endsWith("-en") ? phraseFor(slug) : "";
    const reason = phrase ? "「" + phrase + "」とのことなので、こちらが合いそうです。" + base : base;
    return { slug, score, reason };
  });
  const combo = picks.length === 2
    ? config.combos.find((c) => c.pair.includes(picks[0].slug) && c.pair.includes(picks[1].slug))?.text
    : undefined;
  const summary = config.questions.map((q, i) => (q.short || q.text) + "：" + (q.options[answers[i]]?.label ?? "—"));
  return { picks, combo, notes, summary };
}
