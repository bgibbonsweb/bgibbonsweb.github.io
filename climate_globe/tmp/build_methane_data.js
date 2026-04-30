/**
 * Downloads OWID CO2 data and extracts:
 *   - methane emissions (methane column, MtCO2e)
 *   - co2 per capita (co2_per_capita column, tonnes/person)
 *   - land-use change CO2 as deforestation proxy (land_use_change_co2, MtCO2)
 * Outputs in OWID Entity/Code/Year format compatible with loadMetricFromCsv().
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';
const BASE = path.join(__dirname, '../public/data');

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

(async () => {
  console.log('Downloading OWID CO2 data (may take a moment ~20 MB)...');
  const raw = await get(URL);
  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');

  const ci = (name) => { const i = header.indexOf(name); if (i === -1) throw new Error(`Column not found: ${name}`); return i; };
  const colCountry  = ci('country');
  const colCode     = ci('iso_code');
  const colYear     = ci('year');
  const colMethane  = ci('methane');
  const colCo2Cap   = ci('co2_per_capita');
  const colLUC      = ci('land_use_change_co2');

  const methaneRows = [];
  const co2capRows  = [];
  const lucRows     = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const entity = cols[colCountry]?.trim();
    const code   = cols[colCode]?.trim();
    const year   = parseInt(cols[colYear], 10);
    if (!entity || !code || isNaN(year)) continue;

    const methane = parseFloat(cols[colMethane]);
    const co2cap  = parseFloat(cols[colCo2Cap]);
    const luc     = parseFloat(cols[colLUC]);

    if (!isNaN(methane) && methane > 0)   methaneRows.push({ entity, code, year, val: methane });
    if (!isNaN(co2cap)  && co2cap > 0)    co2capRows.push({ entity, code, year, val: co2cap });
    if (!isNaN(luc))                       lucRows.push({ entity, code, year, val: luc });
  }

  function writeCSV(filename, valueCol, rows) {
    const lines = [`Entity,Code,Year,${valueCol}`];
    rows.forEach((r) => lines.push(`${r.entity},${r.code},${r.year},${r.val}`));
    fs.writeFileSync(path.join(BASE, filename), lines.join('\n') + '\n');
    console.log(`Wrote ${rows.length} rows → ${filename}`);
  }

  writeCSV('methane_by_country_owid.csv', 'Methane emissions (MtCO2e)', methaneRows);
  writeCSV('co2_per_capita_by_country_owid.csv', 'CO2 per capita (t)', co2capRows);
  writeCSV('land_use_change_co2_by_country_owid.csv', 'Land-use change CO2 (MtCO2)', lucRows);
})();
