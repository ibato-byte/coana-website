/* レンとジルのページ（/renjill）は 2026-10-24 にオーナー指示で削除。
 * Google などの検索結果から早く消えるよう、転送（301）ではなく「410 Gone（完全に削除）」を返し、noindex も付ける。
 * 人が開いたときは、トップへのリンクを出す。 */
export const onRequest = () =>
  new Response(
    '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>このページは終了しました｜COANA TOKYO合同会社</title></head>' +
      '<body style="font-family:sans-serif;padding:48px 20px;text-align:center;color:#16334d"><p>このページは終了しました。</p><p><a href="/">COANA TOKYO合同会社のトップページへ</a></p></body></html>',
    { status: 410, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "no-store" } },
  );
