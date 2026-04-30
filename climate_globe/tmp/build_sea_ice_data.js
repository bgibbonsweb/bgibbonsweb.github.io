/**
 * Downloads NSIDC Sea Ice Index monthly extent data and builds annual
 * minimum extent CSVs for Arctic (September min) and Antarctic (February min).
 * Outputs:
 *   public/data/arctic_sea_ice_nsidc_annual.csv
 *   public/data/antarctic_sea_ice_nsidc_annual.csv
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// NSIDC G02135 monthly extent files
const URLS = {
  arctic:    'https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v3.0.csv',
  antarctic: 'https://noaadata.apps.nsidc.org/NOAA/G02135/south/monthly/data/S_02_extent_v3.0.csv',
};

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parse(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.startsWith('Year') || line.startsWith('#')) continue;
    const parts = line.split(',').map((s) => s.trim());
    const year = parseInt(parts[0], 10);
    const extent = parseFloat(parts[3]); // column: Extent (million km²)
    if (!isNaN(year) && !isNaN(extent) && extent > 0 && year >= 1979) {
      rows.push({ year, extent });
    }
  }
  return rows;
}

(async () => {
  for (const [key, url] of Object.entries(URLS)) {
    console.log(`Downloading ${key} sea ice data from NSIDC...`);
    try {
      const raw = await get(url);
      const rows = parse(raw);
      const outPath = path.join(
        __dirname,
        `../public/data/${key}_sea_ice_nsidc_annual.csv`
      );
      const csvLines = ['year,extent_million_km2'];
      rows.forEach((r) => csvLines.push(`${r.year},${r.extent}`));
      fs.writeFileSync(outPath, csvLines.join('\n') + '\n');
      console.log(`Wrote ${rows.length} rows to ${outPath}`);
      if (rows.length > 0) {
        console.log(`  Latest: ${rows[rows.length - 1].year} → ${rows[rows.length - 1].extent} M km²`);
      }
    } catch (e) {
      console.error(`Failed for ${key}:`, e.message);
    }
  }
})();
