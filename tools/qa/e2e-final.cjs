const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const D = __dirname + '/e2e-final';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + ' ' + (typeof x === 'string' ? x : JSON.stringify(x)));
const lastBot = (p) => p.evaluate(() => { const rows = [...document.querySelectorAll('.chat-row:not(.chat-row-user)')]; return rows[rows.length - 1]?.innerText || ''; });
async function ask(p, text) {
  await p.fill('#chat-input', text); await p.press('#chat-input', 'Enter');
  await p.waitForFunction(() => !document.querySelector('.chat-typing'), null, { timeout: 25000 });
  await p.waitForTimeout(300);
  return lastBot(p);
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  // ── 1. PC：AI（ローカルの代用）あり ──
  let ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  let p = await ctx.newPage();
  const requests = []; p.on('request', (r) => requests.push(r.url()));
  await p.goto('http://localhost:8788/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  ok('最初の表示では チャット本体・知識データを読み込まない', !requests.some((u) => /ChatPanel|chat-knowledge/.test(u)));
  await p.screenshot({ path: D + '/pc-launcher.png', clip: { x: 1280 - 260, y: 860 - 200, width: 260, height: 200 } });
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(700); await p.click('.chat-launcher'); await p.waitForSelector('.chat-panel'); await p.waitForTimeout(700);
  ok('開くとチャット本体を読み込む', requests.some((u) => /ChatPanel/.test(u)));
  ok('開いたら入力欄にフォーカス', await p.evaluate(() => document.activeElement?.id === 'chat-input'));
  await p.screenshot({ path: D + '/pc-open.png' });
  await p.click('.chat-chip >> text=経理を任せたい'); await p.waitForTimeout(400);
  ok('メニュー：経理を任せたい → 案内＋関連ページ', /記帳/.test(await lastBot(p)) && await p.locator('.chat-links a >> text=経理代行・経理業務の改善').count() > 0);
  let a = await ask(p, '経理の一部だけ依頼できますか？'); ok('自由入力 → AI の回答＋関連ページ', /必要な範囲/.test(a), a.slice(0, 60));
  ok('メニュー「経理を任せたい」（任せたい＝サイン）で相談の提案が出ている', await p.locator('.chat-consult').count() === 1);
  a = await ask(p, '料金はいくらですか？'); ok('料金の質問 → 料金の情報（直前に提案済みなので、続けて提案はしない）', /お見積もり|料金/.test(a) && !/無料相談もご用意/.test(a), a.replace(/\n/g, ' ').slice(0, 120));
  a = await ask(p, '始めるまでの流れは？'); ok('3往復あけて、次のサインで再び提案', /無料相談もご用意/.test(a), a.replace(/\n/g, ' ').slice(0, 140));
  await p.screenshot({ path: D + '/pc-qa.png' });
  a = await ask(p, '私のメールは taro@example.com です'); ok('個人情報（メール） → 送らず注意', await p.locator('.chat-warn').count() === 1);
  await p.fill('#chat-input', '');
  // 診断
  await p.click('.chat-restart'); await p.waitForTimeout(300);
  await p.click('.chat-menu-diag'); await p.waitForTimeout(300);
  ok('診断：進捗 1/5', /1 \/ 5/.test(await p.locator('.chat-diag-progress').last().innerText()));
  await p.click('.chat-option >> nth=1'); await p.waitForTimeout(200); // 創業3年以内
  await p.click('.chat-option >> nth=1'); await p.waitForTimeout(200); // 2〜10人
  await p.screenshot({ path: D + '/pc-diag-q3.png' });
  await p.click('text=← ひとつ戻る'); await p.waitForTimeout(200);
  ok('診断：ひとつ戻る → 2/5 に戻る', /2 \/ 5/.test(await p.locator('.chat-diag-progress').last().innerText()));
  await p.click('.chat-option >> nth=1'); await p.waitForTimeout(200);
  await p.click('.chat-option >> nth=0'); await p.waitForTimeout(200); // 経理・事務に時間
  await p.click('.chat-option >> nth=1'); await p.waitForTimeout(200); // 実務ごと任せたい
  await p.click('.chat-option >> nth=1'); await p.waitForTimeout(600); // 1〜3か月
  const result = await p.locator('.chat-result').innerText();
  ok('診断結果：おすすめ＋理由＋組み合わせ', /経理代行/.test(result) && /バックオフィス代行/.test(result) && /とのことなので/.test(result), result.replace(/\n/g, ' ').slice(0, 160));
  await p.locator('.chat-result').scrollIntoViewIfNeeded();
  await p.screenshot({ path: D + '/pc-diag-result.png' });
  await p.click('.chat-result .chat-cta-main'); await p.waitForURL('**/contact'); await p.waitForTimeout(600);
  const form = await p.evaluate(() => ({ type: document.querySelector('select').value, message: document.querySelector('textarea').value }));
  ok('「この内容で無料相談する」→ 相談種別と本文を引き継ぐ', form.type === '経理代行・経理業務の改善' && /チャットでのサービス診断/.test(form.message) && /困っていること：経理・事務/.test(form.message), form);
  ok('引き継ぎの注記', await p.locator('.field-hint >> text=チャットの内容を引き継いでいます').count() === 1);
  await p.check('.meeting-check input'); await p.waitForTimeout(200);
  ok('オンライン面談を希望 → 第1〜第3希望の欄', await p.locator('.meeting-date input').count() === 3);
  await p.fill('.meeting-date input >> nth=0', '10月20日（月）14時〜');
  const fieldBox = await p.locator('.form-wrap').boundingBox();
  await p.locator('.meeting-fieldset').scrollIntoViewIfNeeded();
  await p.screenshot({ path: D + '/pc-contact.png', clip: { x: fieldBox.x, y: Math.max(0, (await p.locator('label.field >> nth=3').boundingBox()).y - 10), width: fieldBox.width, height: 760 } });
  // 送信の内容（確認画面）
  await p.fill('input[placeholder="例）山田 太郎"]', 'テスト'); await p.fill('input[type=email]', 'test@example.com'); await p.check('.consent:not(.meeting-check) input');
  await p.click('button[type=submit]'); await p.waitForTimeout(500);
  const confirm = await p.locator('.confirm-list').innerText();
  ok('確認画面にオンライン面談と日時', /オンライン面談\s*希望する/.test(confirm) && /第1希望：10月20日/.test(confirm));
  // キーボード操作
  await p.goto('http://localhost:8788/services', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(700); await p.focus('.chat-launcher'); await p.keyboard.press('Enter'); await p.waitForSelector('.chat-panel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok('キーボード：Enter で開き、Esc で閉じてボタンへフォーカスが戻る', (await p.locator('.chat-panel').count()) === 0 && await p.evaluate(() => document.activeElement?.classList.contains('chat-launcher')));
  // サービス一覧の導線 → 診断で開く
  await p.click('.diagnose-banner button'); await p.waitForSelector('.chat-diag'); await p.waitForTimeout(400);
  ok('サービス一覧の「診断」導線 → 診断から開く', /1 \/ 5/.test(await p.locator('.chat-diag-progress').last().innerText()));
  await p.screenshot({ path: D + '/pc-services-diag.png' });
  await ctx.close();

  // ── 2. AI なし（無料枠切れ・未設定と同じ）：サイト内の検索に切り替わる ──
  ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  p = await ctx.newPage(); await p.goto('http://localhost:8789/', { waitUntil: 'networkidle' });
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(700); await p.click('.chat-launcher'); await p.waitForSelector('.chat-panel');
  a = await ask(p, '税理士とは何が違うのですか？'); ok('AIなし：サイト内の情報で回答（画面には出さず data-engine に fallback）', /税理士/.test(a) && !/サイト内の情報からお探し/.test(a) && (await p.evaluate(() => [...document.querySelectorAll('.chat-row[data-engine]')].pop()?.dataset.engine)) === 'fallback:no_ai', a.replace(/\n/g, ' ').slice(0, 110));
  a = await ask(p, '営業時間は何時からですか？'); ok('AIなし：サイトにないこと → 担当者へ', /担当者から詳しくお答えします/.test(a) && /この質問を担当者に送る/.test(a));
  a = await ask(p, '今日の天気は？'); ok('AIなし：関係のない質問 → 本題に戻す', /サービスやご相談についてご案内/.test(a));
  // 公式の補足知識（AIなしのキーワード検索でも、読み方・聞かれたときのみの区別が守られる）
  a = await ask(p, '代表はどんな人？'); ok('補足知識：代表はどんな人 → いばと しょうた・サインタは出ない', /いばと しょうた/.test(a) && !/サインタ|ころも/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, '代表の名前の読み方は？'); ok('補足知識：読み方 → いばと しょうた', /いばと しょうた/.test(a) && !/サインタ/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, 'マニュアルが無くても頼める？'); ok('補足知識：マニュアルがなくても依頼できる', /マニュアルがなくても/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, 'セキュリティは？'); ok('補足知識：NDA・アクセス権限', /NDA|機密保持/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, 'インスタは？'); ok('補足知識：公式Instagram', /@coana_tokyo/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, '代表は他に会社をやっていますか？'); ok('補足知識（聞かれたときのみ）：他の会社 → サインタ', /サインタ/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, '代表の趣味は？'); ok('補足知識（聞かれたときのみ）：趣味', /ブレイクダンス/.test(a) && !/サインタ/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  a = await ask(p, 'どこで活動していますか？'); ok('補足知識（聞かれたときのみ）：活動拠点', /福岡/.test(a) && !/サインタ/.test(a), a.replace(/\n/g, ' ').slice(0, 90));
  await p.screenshot({ path: D + '/pc-fallback.png' });
  await p.click('.chat-cta-main >> text=この質問を担当者に送る'); await p.waitForURL('**/contact'); await p.waitForTimeout(500);
  const msg = await p.evaluate(() => document.querySelector('textarea').value);
  ok('「この質問を担当者に送る」→ 質問をそのまま本文へ', /営業時間は何時からですか/.test(msg), msg);
  await ctx.close();

  // ── 3. スマホ：LP（固定バーあり）で重ならない ──
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  p = await ctx.newPage(); await p.goto('http://localhost:8788/services/bookkeeping', { waitUntil: 'networkidle' });
  await p.evaluate(() => window.scrollTo(0, 1800)); await p.waitForTimeout(900);
  const boxes = await p.evaluate(() => ['.lp-sticky', '.back-to-top'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { s, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; }));
  const [st, bt] = boxes; const overlap = (x, y) => !(x.bottom <= y.top || y.bottom <= x.top || x.right <= y.left || y.right <= x.left);
  const launcherHidden = await p.evaluate(() => getComputedStyle(document.querySelector('.chat-launcher')).visibility === 'hidden');
  ok('スマホLP：チャットは固定バーの中（右下のボタンは隠れる）・固定バーとページ先頭へが重ならない', launcherHidden && !overlap(bt, st) && await p.isVisible('.lp-sticky-chat'), boxes);
  await p.screenshot({ path: D + '/sp-lp-launcher.png' });
  await p.tap('.lp-sticky-chat'); await p.waitForSelector('.chat-panel'); await p.waitForTimeout(700);
  await p.screenshot({ path: D + '/sp-open.png' });
  await p.tap('.chat-menu-diag'); await p.waitForTimeout(300);
  for (const n of [0, 0, 6, 2]) { await p.tap('.chat-option >> nth=' + n); await p.waitForTimeout(200); }
  await p.tap('.chat-option >> nth=0'); await p.waitForTimeout(500);
  await p.locator('.chat-result').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.screenshot({ path: D + '/sp-diag-result.png' });
  ok('スマホ：横はみ出しなし', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
  // ── 4. 動きを減らす設定 ──
  ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
  p = await ctx.newPage(); await p.goto('http://localhost:8788/', { waitUntil: 'networkidle' });
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(700); await p.click('.chat-launcher'); await p.waitForSelector('.chat-panel');
  ok('動きを減らす設定：パネルのアニメーションなし', await p.evaluate(() => getComputedStyle(document.querySelector('.chat-panel')).animationName === 'none'));
  await b.close();
  console.log(out.join('\n'));
})();
