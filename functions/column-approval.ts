/* ───────────────────────── コラムの公開ボタン（Cloudflare Pages Functions） ─────────────────────────
 * GET  /column-approval?pr=&sha=&action=publish|decline&exp=&sig=  … 確認画面（ここでは何も実行しない）
 * POST /column-approval（同じ値をフォームで送る）                     … 実行：publish＝PR をマージ（本番に公開）、decline＝PR をクローズ
 *
 * メールのリンクを開いただけでは実行されない（メールソフトやセキュリティ製品のリンク先読みは GET なので、確認画面が出るだけ）。
 * 実行の条件（すべて満たしたときだけ）：
 *   - 署名が正しい（tools/column/signature.mjs。秘密の値 COLUMN_APPROVAL_SECRET は Cloudflare と GitHub の Secrets にだけある）
 *   - 期限内（リンクの発行から14日）
 *   - PR が開いていて、ラベル「コラム公開待ち」が付いていて、マージ先が main
 *   - PR の最新のコミットが、リンクを発行したときのもの（記事が更新されたら古いリンクは無効）
 *   - そのコミットのチェック（Cloudflare Pages など）がすべて成功
 * 一度実行すると PR は閉じるので、同じリンクは二度と効かない。
 * GitHub の操作は、オーナーが作った権限の狭いトークン（GITHUB_COLUMN_TOKEN：このリポジトリだけ）で行う。
 */
import { LABEL, parseFields, verify } from "../tools/column/signature.mjs";

type Env = { COLUMN_APPROVAL_SECRET?: string; GITHUB_COLUMN_TOKEN?: string };
type Context = { request: Request; env: Env };

const REPO = "ibato-byte/coana-website";
const OK_CONCLUSIONS = new Set(["success", "neutral", "skipped"]);

type Pull = {
  number: number; title: string; state: string; merged: boolean; html_url: string;
  head: { sha: string; ref: string; repo: { full_name: string } | null };
  base: { ref: string }; labels: { name: string }[];
};

async function gh(env: Env, path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_COLUMN_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "coana-column-approval",
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function page(status: number, title: string, body: string) {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}｜COANA TOKYO コラム</title>
<style>
body{margin:0;background:#eef6fc;color:#16334d;font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif;line-height:1.75}
main{max-width:560px;margin:48px auto;padding:32px 24px;background:#fff;border:1px solid #d8e7f2;border-radius:16px}
h1{font-size:22px;margin:0 0 16px}p{margin:0 0 14px}.muted{color:#4a667d;font-size:14px}
.article{padding:14px 16px;background:#fbfdff;border:1px solid #d8e7f2;border-radius:12px;margin:0 0 20px;font-weight:700}
a{color:#0666b8}
button{font:inherit;font-weight:700;font-size:17px;padding:14px 28px;border-radius:999px;border:0;cursor:pointer;width:100%}
.publish{background:#16334d;color:#fff}.decline{background:#fff;color:#16334d;border:2px solid #16334d}
.ok{color:#0b6b3a}.ng{color:#b42318}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" },
  });
}

const fail = (status: number, title: string, msg: string) => page(status, title, `<h1 class="ng">${esc(title)}</h1><p>${msg}</p>`);

/** 署名・期限・PR の状態・チェックを確かめる。問題がなければ PR を返す */
async function check(env: Env, params: URLSearchParams, forPost: boolean): Promise<{ pr: Pull; fields: NonNullable<ReturnType<typeof parseFields>> } | Response> {
  if (!env.COLUMN_APPROVAL_SECRET || !env.GITHUB_COLUMN_TOKEN) return fail(503, "設定が完了していません", "公開ボタンの設定（Cloudflare の環境変数）がまだありません。docs/SEO_PLAYBOOK.md の「コラムの自動作成」を参照してください。");
  const fields = parseFields(params);
  if (!fields || !(await verify(env.COLUMN_APPROVAL_SECRET, fields, params.get("sig") || ""))) return fail(400, "リンクが正しくありません", "メールのリンクが途中で切れているか、書き換えられています。メールのボタンをもう一度押してください。");
  if (Number(fields.exp) * 1000 < Date.now()) return fail(410, "リンクの期限が切れています", "このリンクは期限切れです。必要なら週次タスクに再発行を依頼してください（GitHub の PR は開いたままです）。");
  const r = await gh(env, `/pulls/${fields.pr}`);
  if (!r.ok) return fail(502, "GitHub に接続できませんでした", `時間をおいてもう一度お試しください（${r.status}）。`);
  const pr = (await r.json()) as Pull;
  if (pr.merged) return page(200, "公開済みです", `<h1 class="ok">この記事は公開済みです</h1><p class="article">${esc(pr.title)}</p><p class="muted">本番への反映には数分かかります。</p>`);
  if (pr.state !== "open") return page(200, "見送り済みです", `<h1>この記事は見送り済みです</h1><p class="article">${esc(pr.title)}</p><p class="muted">あとから公開したいときは、GitHub で PR を開き直してください。</p>`);
  if (!pr.labels.some((l) => l.name === LABEL) || pr.base.ref !== "main" || pr.head.repo?.full_name !== REPO) return fail(403, "公開待ちのコラムではありません", "この PR はコラム公開の対象外です（ラベル・マージ先・作成元を確認してください）。");
  if (pr.head.sha !== fields.sha) return fail(409, "記事が更新されています", "このリンクを発行したあとに記事が更新されました。新しく届いたメールのボタンを使ってください。");
  if (forPost && fields.action === "publish") {
    const c = await gh(env, `/commits/${fields.sha}/check-runs?per_page=100`);
    if (c.ok) {
      // 確認メールを送るジョブ（approval-mail）自体は除く（重複起動で取り消されたものが「cancelled」で残るため）
      const runs = ((await c.json()) as { check_runs: { name: string; status: string; conclusion: string | null }[] }).check_runs.filter((x) => x.name !== "approval-mail");
      const bad = runs.filter((x) => x.status !== "completed" || !OK_CONCLUSIONS.has(x.conclusion || ""));
      if (!runs.length || bad.length) return fail(409, "チェックが合格していません", `公開前のチェックが完了・合格していないため公開できません（${esc(bad.map((x) => `${x.name}：${x.conclusion || x.status}`).join("、") || "チェックなし")}）。`);
    } else if (c.status !== 403 && c.status !== 404) {
      return fail(502, "チェックの状態を確認できません", `時間をおいてもう一度お試しください（${c.status}）。`);
    }
    // 403/404（トークンに Checks の権限がない）のとき：リンクは「このコミットのチェックが全部合格したあと」にしか発行されず、
    // 署名に SHA が入っているので、署名が正しい＝そのコミットは合格済み。コミットが変わっていないことは上で確認済み。
  }
  return { pr, fields };
}

export const onRequestGet = async ({ request, env }: Context) => {
  const url = new URL(request.url);
  const res = await check(env, url.searchParams, false);
  if (res instanceof Response) return res;
  const { pr, fields } = res;
  const preview = url.searchParams.get("preview") || "";
  const safePreview = /^https:\/\/[a-z0-9-]+\.coana-website\.pages\.dev\/topics\/[a-z0-9-]+(\?preview=\d{4}-\d{2}-\d{2})?$/.test(preview) ? preview : "";
  const publish = fields.action === "publish";
  const hidden = ["pr", "sha", "action", "exp", "sig"].map((k) => `<input type="hidden" name="${k}" value="${esc(url.searchParams.get(k) || "")}">`).join("");
  return page(200, publish ? "公開の確認" : "見送りの確認", `
<h1>${publish ? "このコラムを公開しますか？" : "このコラムを見送りますか？"}</h1>
<p class="article">${esc(pr.title.replace(/^【コラム公開待ち】/, ""))}</p>
${safePreview ? `<p><a href="${esc(safePreview)}" target="_blank" rel="noopener">記事を読む（プレビュー）</a></p>` : ""}
<p class="muted">${publish ? "「公開する」を押すと本番（coana.co.jp）に公開されます。反映まで数分かかります。" : "「見送る」を押すと、この記事は公開されません（GitHub の PR は閉じられます。あとから開き直すこともできます）。"}</p>
<form method="post" action="${url.pathname}">${hidden}<button class="${publish ? "publish" : "decline"}" type="submit">${publish ? "公開する" : "見送る"}</button></form>
<p class="muted" style="margin-top:18px"><a href="${esc(pr.html_url)}" target="_blank" rel="noopener">GitHub の PR を見る</a></p>`);
};

export const onRequestPost = async ({ request, env }: Context) => {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return fail(403, "実行できません", "別のサイトからの送信は受け付けません。");
  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "リンクが正しくありません", "フォームの内容を読み取れませんでした。");
  const params = new URLSearchParams();
  for (const k of ["pr", "sha", "action", "exp", "sig"]) params.set(k, String(form.get(k) || ""));
  const res = await check(env, params, true);
  if (res instanceof Response) return res;
  const { pr, fields } = res;
  const title = pr.title.replace(/^【コラム公開待ち】/, "");
  const when = new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16);

  if (fields.action === "publish") {
    const m = await gh(env, `/pulls/${pr.number}/merge`, { method: "PUT", body: JSON.stringify({ merge_method: "squash", sha: fields.sha, commit_title: `コラム公開：${title} (#${pr.number})` }) });
    if (!m.ok) return fail(502, "公開できませんでした", `GitHub でマージできませんでした（${m.status}）。PR の状態を確認してください：<a href="${esc(pr.html_url)}">${esc(pr.html_url)}</a>`);
    await gh(env, `/issues/${pr.number}/comments`, { method: "POST", body: JSON.stringify({ body: `✅ メールの「公開する」ボタンで公開しました（${when} 日本時間）。本番への反映には数分かかります。` }) }).catch(() => null);
    await gh(env, `/git/refs/heads/${encodeURIComponent(pr.head.ref)}`, { method: "DELETE" }).catch(() => null);
    return page(200, "公開しました", `<h1 class="ok">公開しました</h1><p class="article">${esc(title)}</p><p>本番（coana.co.jp）への反映には数分かかります。トピックスの一覧に表示されます。</p><p class="muted"><a href="https://coana.co.jp/topics">トピックス一覧を見る</a></p>`);
  }
  const c = await gh(env, `/pulls/${pr.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  if (!c.ok) return fail(502, "見送りの処理ができませんでした", `GitHub で PR を閉じられませんでした（${c.status}）。`);
  await gh(env, `/issues/${pr.number}/comments`, { method: "POST", body: JSON.stringify({ body: `メールの「見送る」ボタンで見送りました（${when} 日本時間）。公開はされていません。` }) }).catch(() => null);
  return page(200, "見送りました", `<h1>見送りました</h1><p class="article">${esc(title)}</p><p>この記事は公開されません。</p>`);
};
