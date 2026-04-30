const cp = require('child_process');

const xml = cp.execSync('unzip -p tmp/cmo/forecasts.xlsx xl/worksheets/sheet1.xml', { encoding: 'utf8' });
const rowMatches = [...xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
const targetIds = new Set([4, 7, 54, 61, 62]);

function parseCells(body) {
  const out = {};
  const cellMatches = [...body.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?: t="(\w)")?[^>]*>([\s\S]*?)<\/c>/g)];
  for (const m of cellMatches) {
    const ref = m[1];
    const t = m[2] || '';
    const inner = m[3];
    const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
    const v = vMatch ? vMatch[1].trim() : '';
    if (!v) continue;
    out[ref] = { t, v };
  }
  return out;
}

for (const m of rowMatches) {
  const r = Number(m[1]);
  const cells = parseCells(m[2]);
  let hit = false;
  for (const cell of Object.values(cells)) {
    if (cell.t === 's' && targetIds.has(Number(cell.v))) {
      hit = true;
      break;
    }
  }
  if (!hit) continue;

  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'O', 'P', 'Q', 'S', 'T'];
  const parts = [];
  for (const col of cols) {
    const c = cells[`${col}${r}`];
    if (!c) continue;
    parts.push(`${col}${r}:${c.v}${c.t === 's' ? '(s)' : ''}`);
  }
  console.log(`row ${r} -> ${parts.join(' | ')}`);
}
