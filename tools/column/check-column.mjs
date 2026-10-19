// コラムの品質ゲート（機械で確かめられる部分）。docs/column-guide.md と docs/SEO_PLAYBOOK.md「8. コラムの自動作成」に対応。
//   node tools/column/check-column.mjs content/topics/20271019-xxx.md [--keyword "経理代行 費用"]
// NG が1つでもあれば終了コード 1（その回は出さない）。注意は人（レビュー担当）が判断する。
// 中身の正しさ（事実・出典の内容・士業の判断に踏み込んでいないか・他社批判・AIっぽさ）は、執筆と別のレビュー担当（サブエージェント）が確かめる。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.md'));
const kwIdx = args.indexOf('--keyword');
const keywords = kwIdx >= 0 ? args[kwIdx + 1].split(/\s+/).filter(Boolean) : [];
if (!file) { console.error('記事のファイルを指定'); process.exit(2); }
const raw = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const [, fmRaw, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
const ng = [], warn = [];
const NG = (m) => ng.push(m), WARN = (m) => warn.push(m);
if (!fmRaw) { console.log('NG front matter がない'); process.exit(1); }
const fm = (k) => { const m = fmRaw.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const width = (s) => [...s].reduce((w, c) => w + (/[\x20-\x7e]/.test(c) ? 0.5 : 1), 0);
const base = path.basename(file, '.md');

// ── front matter ──
const title = fm('title'), slug = fm('slug'), date = fm('date'), summary = fm('summary'), thumb = fm('thumbnail');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || base.slice(0, 8) !== date.replace(/-/g, '')) NG(`date（${date}）とファイル名の日付が合わない`);
if (base !== `${date.replace(/-/g, '')}-${slug}`) NG(`ファイル名は「日付-slug」（${date.replace(/-/g, '')}-${slug}.md）にする`);
if (!/^[a-z0-9-]+$/.test(slug)) NG('slug は英小文字・数字・ハイフンだけ');
if (width(title) < 20 || width(title) > 48) NG(`title の長さ（全角換算 ${width(title)}）。目安 32〜40、20〜48 の範囲に`);
if ([...summary].length < 70 || [...summary].length > 140) NG(`summary の長さ（${[...summary].length}字）。80〜120字を目安に`);
if (fm('category') !== 'サービス') WARN(`category が「${fm('category')}」（コラムは「サービス」）`);
if (fm('draft') !== 'false') NG('draft: false にする');
if (thumb !== `/uploads/topics/${base}.jpg` || !fs.existsSync(path.join(ROOT, 'public', thumb))) NG('見出し画像がない（tools/column/thumbnail.mjs で作る）');
if (fs.existsSync(path.join(ROOT, 'content/topics')) && fs.readdirSync(path.join(ROOT, 'content/topics')).some((f) => f !== base + '.md' && f.endsWith(`-${slug}.md`))) NG(`slug「${slug}」が既存の記事と重複`);

// ── 構成 ──
const text = body.replace(/<[^>]+>/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
const chars = text.replace(/\s/g, '').length;
if (chars < 2800 || chars > 9000) NG(`本文の長さ ${chars} 字（2800〜9000字）`);
const h2 = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
if (h2.length < 5 || h2.length > 12) NG(`見出し（##）の数 ${h2.length}（5〜12）`);
if (!h2.some((h) => /結論/.test(h))) NG('「結論」の見出しがない（結論の先出し）');
if (!h2.some((h) => /チェック/.test(h))) NG('チェックリストの見出しがない');
if (!h2.some((h) => /失敗/.test(h))) NG('「よくある失敗」の見出しがない');
if (!h2.some((h) => /まとめ/.test(h))) NG('「まとめ」の見出しがない');
if (!/^執筆：衣鳩 翔太（COANA TOKYO合同会社 代表）$/m.test(body)) NG('末尾の著者欄（執筆：衣鳩 翔太…）がない');
const paras = body.split(/\n{2,}/).filter((p) => !/^(#|<|-|\||\d+\.|>|\s*$)/.test(p.trim()));
const longParas = paras.filter((p) => (p.match(/。/g) || []).length > 5);
if (longParas.length) WARN(`5文を超える段落が ${longParas.length} 個（1段落2〜4文）`);

// ── 図解 ──
const figs = [...body.matchAll(/<figure class="article-figure">([\s\S]*?)<\/figure>/g)].map((m) => m[1]);
if (figs.length < 2 || figs.length > 4) NG(`図解の数 ${figs.length}（2〜4点）`);
figs.forEach((f, i) => {
  const src = (f.match(/src="([^"]+)"/) || [])[1] || '';
  const alt = (f.match(/alt="([^"]*)"/) || [])[1] || '';
  if (!new RegExp(`^/images/topics/${slug}/[a-z0-9-]+\\.svg$`).test(src)) NG(`図${i + 1}：保存先は /images/topics/${slug}/*.svg`);
  if ([...alt].length < 20) NG(`図${i + 1}：alt が短い（図の要点を1〜2文で）`);
  if (!new RegExp(`<figcaption>図${i + 1}：`).test(f)) NG(`図${i + 1}：figcaption は「図${i + 1}：」から`);
  const fp = path.join(ROOT, 'public', src);
  if (!fs.existsSync(fp)) { NG(`図${i + 1}：ファイルがない ${src}`); return; }
  const svg = fs.readFileSync(fp, 'utf8');
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!vb || vb[1] !== '600') NG(`図${i + 1}：viewBox の幅は 600`);
  if (/<svg[^>]*\swidth=/.test(svg)) NG(`図${i + 1}：svg に width 属性を付けない`);
  const h = (f.match(/height="(\d+)"/) || [])[1];
  if (vb && h !== vb[2]) NG(`図${i + 1}：img の height（${h}）を viewBox の高さ（${vb[2]}）に`);
  const sizes = [...svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]));
  if (sizes.some((s) => s < 24)) NG(`図${i + 1}：24px 未満の文字（${Math.min(...sizes)}px）`);
  const colors = [...svg.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  const palette = ['#16334d', '#4a667d', '#087fe5', '#55b8f3', '#ffd85a', '#fff7df', '#d8e7f2', '#ffffff', '#fbfdff', '#eef6fc'];
  const off = [...new Set(colors.filter((c) => !palette.includes(c)))];
  if (off.length) NG(`図${i + 1}：サイトにない色 ${off.join(' ')}`);
  if ((svg.match(/#ffd85a/gi) || []).length > 3) WARN(`図${i + 1}：黄色が多い（1か所程度に）`);
});

// ── リンク・CTA ──
const links = [...body.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
const services = fs.readdirSync(path.join(ROOT, 'content/solutions')).map((f) => f.replace('.json', ''));
if (!links.includes('/contact')) NG('/contact への誘導がない');
const svc = links.filter((l) => l.startsWith('/services/'));
if (!svc.length) NG('関連サービスページ（/services/…）への誘導がない');
for (const l of svc) if (!services.includes(l.replace('/services/', '').split('#')[0])) NG(`存在しないサービスページ ${l}`);
const topicLinks = links.filter((l) => l.startsWith('/topics/'));
if (topicLinks.length < 1 || topicLinks.length > 3) NG(`関連コラムへの内部リンク ${topicLinks.length} 本（1〜2本）`);
for (const l of topicLinks) {
  const t = l.replace('/topics/', '');
  if (!fs.existsSync(path.join(ROOT, 'content/topics', t + '.md'))) NG(`リンク先のコラムがない ${l}`);
  else if (t.slice(0, 8) > base.slice(0, 8)) NG(`公開日がこの記事より後のコラムへのリンク ${l}（予約投稿は表示されない）`);
}
const ext = links.filter((l) => /^https?:/.test(l));
const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(go\.jp|lg\.jp|e-gov\.go\.jp|nta\.go\.jp|jfc\.go\.jp|smrj\.go\.jp|jpo\.go\.jp|ipa\.go\.jp|support\.google\.com|developers\.google\.com|biz\.moneyforward\.com|support\.freee\.co\.jp|freee\.co\.jp|moneyforward\.com)(\/|$)/;
// 一次情報が必要な記述：具体的な数字（金額・割合・期間）や、名前のある制度・法令
const factual = /(補助金|助成金|インボイス|電子帳簿保存法|法人税|消費税|所得税|源泉徴収|控除|罰則|義務化|施行|改正|相場|\d+(\.\d+)?\s*(%|％|万円|円|年間|か月|日以内|年以内|年間保存))/.test(text);
if (factual && !ext.some((l) => OFFICIAL.test(l))) NG('法制度・金額などに触れているのに、一次情報（公的機関・公式サポート）の出典リンクがない');
for (const l of ext) if (!l.startsWith('https://')) NG(`https でない外部リンク ${l}`);
if (factual && !/(\d{4}年\d{1,2}月(\d{1,2}日)?)(時点|現在)/.test(body)) NG('制度・数字の「時点」（例：2026年10月時点）が書かれていない');

// ── 禁止事項 ──
const PHONE = /(?:0\d{1,4}[-‐ー−（(]\d{1,4}[-‐ー−）)]\d{3,4}|\+81[-\s]?\d|tel:)/;
if (PHONE.test(body)) NG('電話番号');
if (/月\s*70\s*時間|70時間削減/.test(text)) NG('「月70時間削減」（根拠のない数字）');
const banned = [
  [/当社のお客様|弊社のお客様|導入企業(様|の声)|満足度\s*\d|リピート率\s*\d|実績\s*\d+\s*社|\d+\s*社以上|累計\s*\d+\s*(社|件)/, '実績・お客様の声・数字の主張（捏造の恐れ）'],
  [/業界(No\.?1|ナンバーワン|最安|唯一)|日本一|最安値|必ず(成功|削減|儲)|絶対に(得|損しない)|100\s*%(削減|成功|保証)/, '誇大な表現'],
  [/いかがでしたか|いかがでしたでしょうか|ぜひ参考にしてみてください|この記事が.{0,10}役に立てば|〜?について解説していきます/, 'AI っぽい定型文'],
  [/節税(になります|できます)|申告(は|が)不要です|(税務|労務)上(は)?問題ありません|こう申告すれば/, '士業の独占業務に当たる具体的な判断'],
  [/(他社|競合).{0,20}(ひどい|最悪|ダメ|劣る|使えない)/, '他社批判'],
];
for (const [re, msg] of banned) { const m = text.match(re); if (m) NG(`${msg}：「${m[0]}」`); }
if (/お客様の声|事例/.test(text)) WARN('「お客様の声」「事例」の語がある。実在の顧客の話になっていないか、レビューで確認');
if (/税|申告|社会保険|労務/.test(text) && !/(税理士|社労士|社会保険労務士)(に|へ)(ご)?(確認|相談)/.test(text)) NG('税務・労務に触れているのに「顧問の税理士（社労士）にご確認ください」の一文がない');
const quotes = body.split('\n').filter((l) => l.startsWith('>')).join('').length;
if (quotes > 200) WARN(`引用が長い（${quotes}字）。転載にならないよう要約する`);

// ── キーワードの詰め込み ──
for (const k of keywords) {
  const n = text.split(k).length - 1;
  const per1000 = (n / chars) * 1000;
  if (per1000 > 4) NG(`キーワード「${k}」が多すぎる（${n}回、1000字あたり${per1000.toFixed(1)}回）`);
  else if (n === 0) WARN(`キーワード「${k}」が本文にない`);
}

console.log(`${file}：本文 ${chars} 字・見出し ${h2.length}・図解 ${figs.length}・外部リンク ${ext.length}・内部リンク ${topicLinks.length}`);
for (const m of ng) console.log('NG', m);
for (const m of warn) console.log('注意', m);
console.log(ng.length ? `不合格（NG ${ng.length}）` : `合格（注意 ${warn.length}）`);
process.exitCode = ng.length ? 1 : 0;
