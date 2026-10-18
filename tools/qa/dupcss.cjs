const postcss = require('../../node_modules/postcss');
const fs = require('fs');
const files = ['src/index.css','src/solution.css','src/illustrations.css','src/chat/chat.css'];
const map = new Map();
for (const f of files) {
  const root = postcss.parse(fs.readFileSync(__dirname + '/../../' + f, 'utf8'));
  root.walkRules((r) => {
    let ctx = []; let p = r.parent; while (p && p.type !== 'root') { if (p.type === 'atrule') ctx.unshift('@' + p.name + ' ' + p.params); p = p.parent; }
    if (ctx.some((c) => /keyframes/.test(c))) return;
    for (const sel of r.selectors) {
      r.walkDecls((d) => { if (d.parent !== r) return; const key = ctx.join(' | ') + ' :: ' + sel.trim() + ' :: ' + d.prop; if (!map.has(key)) map.set(key, []); map.get(key).push({ v: d.value + (d.important ? ' !important' : ''), at: f + ':' + d.source.start.line }); });
    }
  });
}
let n = 0;
for (const [k, list] of map) { if (list.length > 1 && new Set(list.map((x) => x.v)).size > 1) { n++; console.log(k, '\n   ', list.map((x) => x.v + ' @' + x.at).join('  |  ')); } }
console.log('conflicting duplicates:', n);
