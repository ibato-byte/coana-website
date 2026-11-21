// IndexNow（Bing・Yandex・Naver など。無料・登録不要）に「更新しました」と知らせる（2026-11-22 追加）。
// 本番の sitemap.xml の全 URL を送る。鍵は public/ の 「<鍵>.txt」（中身も同じ鍵）。Google は対象外（Search Console のサイトマップで知らせる）。
// 使い方：node tools/seo/indexnow.mjs   … 失敗しても終了コード 0（公開を止めない）
import fs from 'node:fs';
const HOST = 'coana.co.jp';
const keyFile = fs.readdirSync(new URL('../../public/', import.meta.url)).find((f) => /indexnow.*\.txt$/.test(f));
if (!keyFile) { console.log('IndexNow: 鍵のファイルが無いので何もしません'); process.exit(0); }
const key = keyFile.slice(0, -4);
try {
  const sm = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  const urlList = [...new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')))].filter((u) => new URL(u).host === HOST);
  if (!urlList.length) { console.log('IndexNow: sitemap に URL がありません'); process.exit(0); }
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList }) });
  console.log('IndexNow:', r.status, urlList.length, 'URL');
} catch (e) { console.log('IndexNow: 送れませんでした（公開は続けます）', e.message); }
