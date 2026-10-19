// 鳩（と荷物）が文字に重ならないか：HOW IT WORKS と FLOW、止まっている間も飛んでいる間も 100ms ごとに確認。
// あわせて、図の小さなラベル同士の間隔（12px 以上）とカードの枠との重なりも確かめる
// 使い方：node tools/qa/dove-overlap.cjs [幅]（省略すると 1280・390・768）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const SLUGS = ['bookkeeping', 'backoffice-dx', 'cloud-accounting', 'startup-support', 'startup-support-en', 'sales-support', 'seminar-event', 'sns-management', 'web-production'];
const ONLY = process.env.ONLY;
const TARGETS = [['/services', '.flowx'], ...SLUGS.flatMap((s) => [[`/services/${s}`, '.lanes, .lp-scheme-diagram, .lp-scheme-flow-wrap, .relay'], [`/services/${s}`, '.flowx']])].filter(([u, s]) => !ONLY || (u + ' ' + s).includes(ONLY));
const WIDTHS = process.argv[2] ? [+process.argv[2]] : [1280, 390, 768];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let bad = 0;
  for (const w of WIDTHS) {
    const mob = w < 1000;
    await Promise.all(TARGETS.map(async ([u, sel]) => {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 120000 });
      await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} .dove-layer, .dove-layer *{pointer-events:auto!important}' });
      await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); }, sel);
      await p.mouse.move(1, 1);
      // ラベル同士の間隔：カードの外に置く小さなラベル（矢印の言葉・パネルの見出し・役割の札・受け渡しの注記など）が、
      // ほかのラベルと 12px 以上離れ、カードの枠に重ならないこと（文字が詰まって読みづらくならないように）
      const LABELS = '.relay-step > span, .relay-team-head, .lanes-handoff, .lanes-tag, .lanes-label span, .lanes-cycle-label';
      const CARDS = '.relay-card, .relay-area, .lanes-card, .lp-scheme-flow li';
      const gaps = await p.evaluate(([s, L, C]) => {
        const root = document.querySelector(s);
        const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        // 文字そのものの箱（行の上下の余白は除く）
        const textBox = (e) => { const range = document.createRange(); range.selectNodeContents(e); const rs = [...range.getClientRects()].filter((r) => r.width && r.height); if (!rs.length) return null; const fs = parseFloat(getComputedStyle(e).fontSize); const t = Math.min(...rs.map((r) => (r.top + r.bottom) / 2 - Math.min(r.height, fs) / 2)), b = Math.max(...rs.map((r) => (r.top + r.bottom) / 2 + Math.min(r.height, fs) / 2)); return { l: Math.min(...rs.map((r) => r.left)), r: Math.max(...rs.map((r) => r.right)), t, b }; };
        const labels = [...root.querySelectorAll(L)].filter(shown).map((e) => ({ e, name: (e.className || e.parentElement.className).toString().split(' ')[0] + '「' + e.textContent.trim().slice(0, 12) + '」', box: textBox(e) })).filter((x) => x.box);
        const cards = [...root.querySelectorAll(C)].filter(shown).map((e) => ({ e, box: (() => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; })() }));
        const vgap = (a, b) => Math.max(a.t - b.b, b.t - a.b); const hov = (a, b) => a.l < b.r && b.l < a.r;
        const out = [];
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          if (a.e.contains(b.e) || b.e.contains(a.e) || !hov(a.box, b.box)) continue;
          const g = vgap(a.box, b.box); if (g < 12) out.push(`${a.name}↔${b.name} ${Math.round(g)}px`);
        }
        for (const a of labels) for (const c of cards) {
          if (c.e.contains(a.e) || !hov(a.box, c.box)) continue;
          const g = vgap(a.box, c.box); if (g < 4) out.push(`${a.name}↔カードの枠 ${Math.round(g)}px`);
        }
        return out;
      }, [sel, LABELS, CARDS]);
      const hits = new Set(gaps.map((g) => 'label-gap ' + g)); let seen = 0, maxX = 0;
      for (let i = 0; i < (+process.env.SAMPLES || 170); i++) {
        await p.waitForTimeout(100);
        const r = await p.evaluate(([s, dbg]) => {
          const root = document.querySelector(s);
          const layer = root.querySelector('.dove-layer');
          if (!layer) return { out: [], any: false, sw: document.documentElement.scrollWidth };
          const vis = (e, stop = root) => { let o = 1, n = e; while (n && n !== stop) { if (getComputedStyle(n).visibility === 'hidden') return false; o *= +getComputedStyle(n).opacity; n = n.parentElement; } return o > 0.2; };
          const movers = [...layer.querySelectorAll('.dove-shape, .cargo-card, .fx-bubble')].filter(vis);
          const sec = root.closest('section');
          const walk = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
          const rects = [];
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            if (!n.textContent.trim() || n.parentElement.closest('.dove-layer') || !vis(n.parentElement, document.body)) continue;
            const range = document.createRange(); range.selectNodeContents(n);
            // 行の高さ（上下の余白）ではなく、文字そのものの高さ（font-size）で判定する
            const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
            const svgText = n.parentElement.closest('text'); // SVG の文字は textLength で詰めているので、描かれた箱で測る
            for (const tr of svgText ? [svgText.getBoundingClientRect()] : range.getClientRects()) if (tr.width && tr.height) { const cy = (tr.top + tr.bottom) / 2, hh = Math.min(tr.height, fs) / 2; rects.push([{ left: tr.left, right: tr.right, top: cy - hh, bottom: cy + hh }, n.textContent.trim().slice(0, 12)]); }
          }
          const out = [];
          for (const m of movers) {
            const a = m.getBoundingClientRect(); const pad = 2;
            for (const [tr, label] of rects) {
              if (!(a.right - pad > tr.left && a.left + pad < tr.right && a.bottom - pad > tr.top && a.top + pad < tr.bottom)) continue;
              const cx = (Math.max(a.left, tr.left) + Math.min(a.right, tr.right)) / 2, cy = (Math.max(a.top, tr.top) + Math.min(a.bottom, tr.bottom)) / 2;
              const top = document.elementsFromPoint(cx, cy).find((e) => vis(e, document.body)); // 見えていない要素（透明の吹き出し・輪）は除く
              if (top && top.closest('.dove-layer')) out.push(dbg ? `${label}@${m.getAttribute('class')} ${layer.querySelector('.dove').className} t=${Math.round(performance.now())} ${Math.round(a.left)},${Math.round(a.top)}-${Math.round(a.right)},${Math.round(a.bottom)} text ${Math.round(tr.left)},${Math.round(tr.top)}-${Math.round(tr.right)},${Math.round(tr.bottom)}` : label);
            }
          }
          return { out, any: movers.length > 0, sw: document.documentElement.scrollWidth };
        }, [sel, !!process.env.DEBUG]);
        if (r.any) seen++;
        if (process.env.SHOT && r.out.length && !hits.size) {
          await p.screenshot({ path: process.env.SHOT });
          console.log(await p.evaluate(() => { const d = document.querySelector('.flowx .dove'); const n = document.querySelector('.flowx-node'); const s = (e) => { const c = getComputedStyle(e); return `z=${c.zIndex} pe=${c.pointerEvents} pos=${c.position}`; }; return 'dove ' + s(d) + ' node ' + s(n) + ' layer ' + s(d.parentElement); }));
        }
        r.out.forEach((x) => hits.add(x)); maxX = Math.max(maxX, r.sw);
      }
      const ok = hits.size === 0 && seen > 30 && maxX <= w && errs.length === 0;
      if (!ok) bad++;
      console.log(ok ? 'OK' : 'NG', w, u, sel.includes('flowx') ? 'FLOW' : 'HOW', `seen=${seen}`, hits.size ? 'overlap: ' + [...hits].join(' / ') : '', maxX > w ? 'overflow ' + maxX : '', errs.join(' / '));
      await ctx.close();
    }));
  }
  console.log(bad ? 'NG ' + bad : 'ALL OK'); await b.close();
})();
