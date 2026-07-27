const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3005;
const publicDir = path.join(__dirname, 'public');

// BASE_PATH lets the app be hosted under a subdirectory (e.g. BASE_PATH=/energy_grid_map).
// Normalize: leading slash, no trailing slash, default ''.
let BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');
if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = '/' + BASE_PATH;

// Serve index.html with an injected <base> tag so all relative asset paths
// resolve correctly under the configured subdirectory.
const indexRoutes = BASE_PATH
  ? [BASE_PATH, BASE_PATH + '/']
  : ['/'];

app.get(indexRoutes, (_req, res) => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const baseHref = BASE_PATH ? BASE_PATH + '/' : '/';
  const injected = html.replace('<head>', `<head>\n    <base href="${baseHref}">`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(injected);
});

app.use(BASE_PATH || '/', express.static(publicDir, { index: false }));

app.get((BASE_PATH || '') + '/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  const base = BASE_PATH || '/';
  console.log(`Server running at http://localhost:${PORT}${base}`);
});
