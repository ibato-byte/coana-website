const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PAGES = ['/', '/about', '/services', '/topics', '/topics/20260804-outsourcing-checklist', '/contact', '/privacy', ...['backoffice-dx','bookkeeping','cloud-accounting','sales-support','seminar-event','sns-management','startup-support','startup-support-en','web-production'].map((s) => '/services/' + s)];
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined }); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); let bad = 0;
 for (const u of PAGES) { await p.goto('http://localhost:4173' + u, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
   const out = [];
   const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || e.textContent || e.querySelector('img[alt]')?.getAttribute('alt') || e.getAttribute('title') || '').trim();
   document.querySelectorAll('img').forEach((i) => { if (!i.hasAttribute('alt')) out.push('img alt なし ' + i.src.slice(-40)); });
   document.querySelectorAll('a[href], button').forEach((e) => { if (e.closest('[aria-hidden="true"]')) return; if (!name(e)) out.push('名前のないリンク/ボタン ' + e.outerHTML.slice(0, 80)); });
   const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => !h.closest('[aria-hidden="true"]')).map((h) => +h.tagName[1]);
   if (hs.filter((x) => x === 1).length !== 1) out.push('h1 の数 ' + hs.filter((x) => x === 1).length);
   for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) out.push(`見出しの飛び h${hs[i - 1]}→h${hs[i]}`);
   document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((e) => { if (e.closest('[aria-hidden="true"]')) return; const id = e.id; const lab = e.closest('label') || (id && document.querySelector(`label[for="${id}"]`)) || e.getAttribute('aria-label'); if (!lab) out.push('ラベルのない入力 ' + (e.name || e.type)); });
   const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; }); Object.entries(ids).filter(([, n]) => n > 1).forEach(([k]) => out.push('id の重複 ' + k));
   if (!document.querySelector('main')) out.push('main なし'); if (!document.querySelector('header, [role=banner]')) out.push('header なし'); if (!document.querySelector('footer')) out.push('footer なし');
   if (!document.documentElement.lang) out.push('lang なし');
   return [...new Set(out)]; });
  if (r.length) bad++; console.log(u, r.length ? r.join(' | ') : 'OK'); }
 console.log(bad ? 'NG ' + bad : 'ALL OK'); await b.close(); })();
