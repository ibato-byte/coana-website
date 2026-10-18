// WCAG AA のコントラスト確認：文字の色と、実際に後ろにある背景色（祖先をたどって最初の不透明な背景。グラデーションは最も明るい/暗い端で判定）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PAGES = ['/', '/about', '/services', '/topics', '/contact', '/privacy', '/topics/20260804-outsourcing-checklist', ...['backoffice-dx','bookkeeping','cloud-accounting','sales-support','seminar-event','sns-management','startup-support','startup-support-en','web-production'].map((s) => '/services/' + s)];
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
 const all = new Map();
 for (const [w, h] of [[1280, 800], [390, 844]]) { const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  for (const u of PAGES) { await p.goto((process.env.BASE || 'http://localhost:4173') + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
   const r = await p.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, c) => { const l1 = lum(a), l2 = lum(c); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const mix = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const bgsOf = (el) => { // 後ろの背景の候補（グラデーションは色の端それぞれ）
      for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e);
        if (cs.backgroundImage && cs.backgroundImage.includes('url(')) return null; // 写真の上は判定しない
        const grads = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter((c) => c && c.a > 0.5);
        const bc = parse(cs.backgroundColor);
        if (bc && bc.a >= 0.95) return [bc, ...grads.filter((c) => c.a >= 0.95)];
        if (grads.length && cs.backgroundImage.includes('linear-gradient') && !cs.backgroundImage.includes('radial')) return grads;
      }
      return [{ r: 255, g: 255, b: 255, a: 1 }];
    };
    const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (!['P','SPAN','A','LI','H1','H2','H3','H4','SMALL','STRONG','B','BUTTON','LABEL','DT','DD','TD','TH','EM','I','LEGEND','SUMMARY','TIME'].includes(el.tagName)) return;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (el.closest('.visually-hidden, .form-honeypot, [aria-hidden="true"], .solve-measure, svg')) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity); if (op < 0.05) return;
      const fg0 = parse(cs.color); if (!fg0) return; const bgs = bgsOf(el); if (!bgs) return;
      const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold); const need = large ? 3 : 4.5;
      for (const bg of bgs) { const fg = mix({ ...fg0, a: fg0.a * op }, bg); const cr = ratio(fg, bg);
        if (cr < need) { out.push(`${cr.toFixed(2)}<${need} ${el.tagName}.${(typeof el.className === 'string' ? el.className : '').split(' ')[0]} "${el.textContent.trim().slice(0, 16)}" fg=${cs.color} bg=rgb(${bg.r},${bg.g},${bg.b}) ${size}px`); break; } }
    });
    return out; });
   r.forEach((x) => { const k = x.replace(/^[\d.]+</, '').replace(/ "[^"]*"/, ''); if (!all.has(k)) all.set(k, `${w} ${u} ${x}`); }); }
  await p.close(); }
 console.log([...all.values()].join('\n') || 'ALL AA'); await b.close(); })();
