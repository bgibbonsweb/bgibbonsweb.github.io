const https = require('https');
const fs = require('fs');

const url = 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_ref_90.csv';

function pickValue(cols) {
  for (let i = 1; i < cols.length; i += 1) {
    const raw = String(cols[i] ?? '').trim();
    if (!raw) continue;
    const v = Number(raw);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

https.get(url, (res) => {
  let raw = '';
  res.on('data', (chunk) => {
    raw += chunk;
  });
  res.on('end', () => {
    const rows = raw.split(/\r?\n/).filter(Boolean);
    const samples = [];

    rows.forEach((line) => {
      if (line.startsWith('#') || line.startsWith('year,')) return;
      const cols = line.split(',');
      const t = Number(cols[0]);
      const v = pickValue(cols);
      if (!Number.isFinite(t) || !Number.isFinite(v)) return;
      samples.push({ t, year: Math.floor(t), mm: v });
    });

    const byYear = new Map();
    samples.forEach((s) => {
      if (!byYear.has(s.year)) byYear.set(s.year, []);
      byYear.get(s.year).push(s.mm);
    });

    const annual = Array.from(byYear.keys())
      .sort((a, b) => a - b)
      .filter((year) => year >= 1993)
      .map((year) => {
        const arr = byYear.get(year);
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return { year, mm: Number(avg.toFixed(3)), source: 'observed' };
      });

    const last = samples[samples.length - 1];
    const trendPerYear = 3.11;
    const mm2026 = Number((last.mm + trendPerYear * (2026 - last.t)).toFixed(3));
    if (!annual.some((r) => r.year === 2026)) {
      annual.push({ year: 2026, mm: mm2026, source: 'estimated_from_trend_3p11_mm_per_year' });
    }

    annual.sort((a, b) => a.year - b.year);

    const output = [
      'year,sea_level_anomaly_mm,source_type',
      ...annual.map((r) => `${r.year},${r.mm.toFixed(3)},${r.source}`),
    ].join('\n') + '\n';

    fs.writeFileSync('public/data/ocean_sea_level_global_annual_2026_proxy.csv', output, 'utf8');

    const latestObservedYear = annual.filter((r) => r.source === 'observed').slice(-1)[0]?.year;
    console.log(`Wrote ${annual.length} rows. Observed through ${latestObservedYear}; added 2026 estimate ${mm2026} mm.`);
  });
}).on('error', (err) => {
  console.error('Download failed:', err.message);
  process.exit(1);
});
