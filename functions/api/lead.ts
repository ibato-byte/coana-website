/**
 * お問い合わせフォームの受け口（顧客管理への連携）。
 * フォームの送信と同時に呼ばれ、D1「coana-inbound」（バインディング名 LEAD_DB）に1行入れるだけ。
 * 顧客管理（Automation Hub の CRM）がこの表を読んで、見込み客として登録する。
 * ここからは顧客の台帳には触れない（このサイトは公開のリポジトリから自動で公開されるため、顧客の情報を読める権限を持たせない）。
 * メールの通知とスプレッドシートへの記録は、これまでどおり Google Apps Script が行う（この受け口が止まっても、フォームは動く）。
 * 表の形は、顧客管理の src/crm/inbound.mjs と同じ文にそろえる。
 */
type D1Stmt = { bind: (...v: unknown[]) => D1Stmt; run: () => Promise<{ meta?: { changes?: number } }>; first: <T = Record<string, unknown>>() => Promise<T | null> };
type D1 = { prepare: (sql: string) => D1Stmt };
type Env = { LEAD_DB?: D1 };
type Context = { request: Request; env: Env };

export const INBOUND_TABLE = `CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, received_at TEXT NOT NULL, company TEXT, name TEXT, email TEXT, kind TEXT, message TEXT,
  meeting TEXT, page TEXT, hash TEXT UNIQUE, ip_hash TEXT, done_at TEXT, crm_company_id TEXT, error TEXT)`;

// 受け付けるのは、このサイト（本番・プレビュー・手元）から送られたものだけ
const ORIGINS = /^https:\/\/((www\.)?coana\.co\.jp|([a-z0-9-]+\.)?coana-website\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX = { company: 120, name: 80, email: 254, kind: 80, message: 8000, meeting: 300, page: 200 };
const PER_IP_PER_HOUR = 5;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, n);
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const origin = request.headers.get("origin") || "";
  if (!ORIGINS.test(origin)) return json({ ok: false, error: "origin" }, 403);
  if (!/^application\/json/i.test(request.headers.get("content-type") || "")) return json({ ok: false, error: "type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > 20000) return json({ ok: false, error: "size" }, 413);
  // 受け口がまだつながっていない環境（プレビューなど）では、何もせず成功を返す（フォームの送信は止めない）
  if (!env.LEAD_DB) return json({ ok: true, stored: false });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  if (!body || typeof body !== "object") return json({ ok: false, error: "json" }, 400);
  // 人には見えない欄に値が入っていたら、機械の送信として捨てる（成功の形で返す）
  if (clip(body.website, 200)) return json({ ok: true, stored: false });
  const row = {
    company: clip(body.company, MAX.company), name: clip(body.name, MAX.name), email: clip(body.email, MAX.email).toLowerCase(),
    kind: clip(body.type, MAX.kind), message: clip(body.message, MAX.message), meeting: clip(body.meeting, MAX.meeting), page: clip(body.page, MAX.page),
  };
  if (!row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !row.message || body.consent !== true) return json({ ok: false, error: "fields" }, 400);
  if (row.page && !row.page.startsWith("/")) row.page = "";
  const db = env.LEAD_DB;
  try {
    await db.prepare(INBOUND_TABLE).run();
    const now = new Date();
    const ipHash = (await sha256(`${request.headers.get("cf-connecting-ip") || ""}|${now.toISOString().slice(0, 10)}`)).slice(0, 32);
    const recent = await db.prepare("SELECT COUNT(*) AS n FROM leads WHERE ip_hash = ? AND received_at > ?").bind(ipHash, new Date(now.getTime() - 3600e3).toISOString()).first<{ n: number }>();
    if ((recent?.n || 0) >= PER_IP_PER_HOUR) return json({ ok: false, error: "rate" }, 429);
    // 同じ人が同じ内容を送り直したとき（送信の失敗のあとなど）は、1件にまとめる
    const hash = (await sha256(`${row.email}|${row.message}`)).slice(0, 40);
    const id = crypto.randomUUID();
    await db.prepare("INSERT OR IGNORE INTO leads (id, received_at, company, name, email, kind, message, meeting, page, hash, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, now.toISOString(), row.company, row.name, row.email, row.kind, row.message, row.meeting, row.page, hash, ipHash).run();
    return json({ ok: true, stored: true });
  } catch {
    return json({ ok: false, error: "store" }, 500);
  }
}

export const onRequest = () => json({ ok: false, error: "method" }, 405);
