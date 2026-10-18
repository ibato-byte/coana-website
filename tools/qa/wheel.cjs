// マウスを一切動かさず（最初に1回置くだけ）、ホイールだけでセクションまで来て、数秒以内に進むか
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const SLUGS = ['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'];
const ROOT = '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const slug of SLUGS) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await p.goto(`${BASE}/services/${slug}`, { waitUntil: 'networkidle' });
    await p.mouse.move(640, 500); // 画面の中央付近にカーソルを置いたまま（以後マウスは動かさない）
    const target = await p.evaluate((R) => { const e = document.querySelector(R); return e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 450; }, ROOT);
    let y = 0; while (y < target) { await p.mouse.wheel(0, 100); y += 100; await p.waitForTimeout(40); }
    const under = await p.evaluate((R) => !!document.elementFromPoint(640, 500)?.closest(R), ROOT);
    const done = async () => p.evaluate((R) => new Set([...document.querySelector(R).querySelectorAll('.is-done')].map((e) => e.getAttribute('data-story') || e.querySelector('[data-story]')?.getAttribute('data-story'))).size, ROOT);
    const d0 = await done(); await p.waitForTimeout(4000); const d1 = await done();
    ok(`${slug} ホイールだけ（カーソルは図の上：${under}）→ 4秒で進む`, d1 > d0 && d1 >= 2, `${d0}→${d1}`);
    // 読むためにカードの上でカーソルを動かすと止まり、動かさずに約2.5秒で再開
    const card = p.locator(`:is(${ROOT}) [data-story]`).nth(1);
    const bb = await card.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 6 });
    await p.mouse.move(bb.x + bb.width / 2 + 6, bb.y + bb.height / 2 + 3, { steps: 4 });
    await p.waitForTimeout(400);
    const r = await p.evaluate((R) => document.querySelector(R).querySelectorAll('.story-chip').length, ROOT);
    const snap = () => p.evaluate((R) => [...document.querySelector(R).querySelectorAll('.story-chip')].map((c) => c.style.transform + c.textContent).join('|') + '/' + document.querySelector(R).querySelectorAll('.is-done').length, ROOT);
    await p.waitForTimeout(1200); const a = await snap(); await p.waitForTimeout(800); const c = await snap();
    ok(`${slug} カードの上でカーソルを動かすと止まる`, a === c, '');
    await p.waitForTimeout(4500); const e = await snap();
    ok(`${slug} カーソルを止めて約2.5秒で再開`, e !== c, '');
    void r;
    await p.context().close();
  }
  await b.close();
  console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('NG')) ? 'NG' : 'ALL OK');
})();
