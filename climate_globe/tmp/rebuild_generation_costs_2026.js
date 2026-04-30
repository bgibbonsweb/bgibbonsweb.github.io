const fs = require('fs');

const inputPath = 'public/data/oecd_nea_lcoe_2020_country_source_usd_per_mwh.csv';
const outputPath = 'public/data/generation_cost_country_source_usd_per_mwh_2026_proxy.csv';

const MULT = {
  Coal: 100.0 / 107.0,
  Gas: ((10.8 / 12.1) + (3.9 / 3.5) + (11.5 / 12.5)) / 3,
  Oil: 60.0 / 68.0,
};

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toCsvLine(cols) {
  return cols.map((v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',');
}

const lines = fs.readFileSync(inputPath, 'utf8').trimEnd().split(/\r?\n/);
const headers = parseCsvLine(lines[0]);
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

const out = [toCsvLine(headers)];
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  cols[idx.Year] = '2026';

  for (const [k, m] of Object.entries(MULT)) {
    const j = idx[k];
    if (j == null) continue;
    const v = parseFloat(cols[j]);
    if (!Number.isFinite(v)) continue;
    cols[j] = (v * m).toFixed(3);
  }

  out.push(toCsvLine(cols));
}

fs.writeFileSync(outputPath, out.join('\n') + '\n');
console.log('Wrote', out.length - 1, 'rows to', outputPath);
