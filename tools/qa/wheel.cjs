// マウスを一切動かさず（最初に1回置くだけ）、ホイールだけで仕組みの図まで来て、数秒以内に図が読める状態で表示されるか。
// （以前は鳩のアニメーションが進むかを見ていた。鳩は 2026-10-26 にオーナー指示で廃止し、図は完成形で静止。
//   カーソルの下に図が来ても表示が止まらないこと＝「画面に入ったら表示」がホイールだけで働くことを確かめる）
// 対象の LP は content/solutions から自動で読む。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://localhost:4173';
const SLUGS = fs.readdirSync(path.join(__dirname, '../../content/solutions')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const ROOT = '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap, .relay';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'OK ' : 'NG ') + n + (x ? ' ' + x : ''));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const slug of SLUGS) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await p.goto(`${BASE}/services/${slug}`, { waitUntil: 'networkidle' });
    if (!(await p.locator(ROOT).count())) { ok(`${slug} 仕組みの図なし（対象外）`, true); await p.context().close(); continue; }
    await p.mouse.move(640, 500); // 画面の中央付近にカーソルを置いたまま（以後マウスは動かさない）
    const target = await p.evaluate((R) => { const e = document.querySelector(R); return e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 450; }, ROOT);
    let y = 0; while (y < target) { await p.mouse.wheel(0, 100); y += 100; await p.waitForTimeout(40); }
    const under = await p.evaluate((R) => !!document.elementFromPoint(640, 500)?.closest(R), ROOT);
    await p.waitForTimeout(3000);
    // 図と、その中の工程のカードが見えている（どの祖先も透明・非表示でない）
    const shown = await p.evaluate((R) => {
      const vis = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.9) return false; } return true; };
      const root = document.querySelector(R); const r = root.getBoundingClientRect();
      const cards = [...root.querySelectorAll('[data-story]')].filter((e) => e.getBoundingClientRect().height > 0);
      const hiddenReveal = [...document.querySelectorAll('[data-reveal]')].filter((e) => { const b = e.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 && !e.classList.contains('in'); }).length;
      return { inView: r.top < innerHeight && r.bottom > 0, rootVisible: vis(root), cards: cards.length, cardsVisible: cards.filter(vis).length, hiddenReveal };
    }, ROOT);
    ok(`${slug} ホイールだけ（カーソルは図の上：${under}）→ 3秒で図が表示される`, shown.inView && shown.rootVisible && shown.cards > 0 && shown.cardsVisible === shown.cards && shown.hiddenReveal === 0, JSON.stringify(shown));
    await p.context().close();
  }
  await b.close();
  console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('NG')) ? 'NG' : 'ALL OK');
})();
