// 公式の補足知識が、質問ごとに AI への参考情報（と、AI なしのキーワード検索）に正しく入るか／入らないかを確かめる
import fs from 'node:fs';
import { pickContext, systemPrompt, postProcess } from './chat-bundle.mjs';
const knowledge = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cases = [
  // [質問, 参考情報に含まれるべき言葉, 含まれてはいけない言葉]
  ['代表はどんな人？', ['いばと しょうた', '仕組み化', 'freee会計などを活用'], ['サインタ', 'ブレイクダンス', '福岡（博多']],
  ['代表の名前の読み方は？', ['いばと しょうた', 'ころもぐも」などの読み方は誤り'], ['サインタ']],
  ['代表の名前は何と読みますか', ['いばと しょうた'], ['サインタ']],
  ['マニュアルが無くても頼める？', ['業務マニュアルがなくても依頼できる'], ['サインタ']],
  ['セキュリティは大丈夫？', ['機密保持契約（NDA）', 'アクセス権限'], ['サインタ']],
  ['インスタはありますか？', ['@coana_tokyo', 'DM'], ['サインタ']],
  ['月末月初だけ忙しいのですが', ['作業量の波'], []],
  ['弥生会計でも対応できますか', ['弥生会計'], []],
  ['税理士を紹介してもらえますか', ['税理士を紹介できる'], []],
  ['代表は他に会社をやっていますか？', ['株式会社サインタの代表取締役'], []],
  ['サインタとは？', ['株式会社サインタ'], []],
  ['代表の趣味は？', ['ブレイクダンス'], ['サインタ']],
  ['どこで活動していますか？', ['福岡（博多・天神）と東京', '全国オンライン'], ['サインタ']],
  ['会社の所在地は？', ['港区北青山'], ['サインタ', 'ブレイクダンス']],
  ['経理代行の料金は？', [], ['サインタ', 'ブレイクダンス', '福岡（博多']],
];
let ng = 0;
for (const [q, must, mustNot] of cases) {
  const { hits, context } = pickContext(knowledge, q);
  const miss = must.filter((w) => !context.includes(w));
  const bad = mustNot.filter((w) => context.includes(w));
  const ok = !miss.length && !bad.length;
  if (!ok) ng++;
  console.log(ok ? 'OK ' : 'NG ', q.padEnd(22), '→', hits.slice(0, 4).map((h) => h.chunk.t.slice(0, 22)).join(' / '), miss.length ? ' 不足:' + miss : '', bad.length ? ' 混入:' + bad : '');
}
// AI への指示
const sp = systemPrompt('（テスト）');
for (const w of ['読み方や表記は、参考情報に書かれたものだけ', 'いばと しょうた', '参考情報に明記されたものだけを使い', '【聞かれたときのみ】']) {
  console.log(sp.includes(w) ? 'OK ' : 'NG ', '指示に含む：' + w); if (!sp.includes(w)) ng++;
}
// 誤った読み方の後処理
const fixed = postProcess('代表の衣鳩（ころもぐも）翔太です。', '').text;
console.log(fixed.includes('いばと') && !fixed.includes('ころも') ? 'OK ' : 'NG ', '誤読の修正：' + fixed); if (fixed.includes('ころも')) ng++;
console.log(ng ? 'NG ' + ng : 'ALL OK');
