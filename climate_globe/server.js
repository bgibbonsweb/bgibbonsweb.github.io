const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return '/';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);

if (BASE_PATH !== '/') {
  // Ensure relative asset URLs resolve inside the app folder.
  app.get(BASE_PATH, (req, res) => {
    res.redirect(301, `${BASE_PATH}/`);
  });
}

// serve static assets from public directory
app.use(BASE_PATH, express.static(PUBLIC_DIR));

// catch-all to send index.html for any route (in case of client-side routing)
if (BASE_PATH === '/') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
} else {
  app.get(`${BASE_PATH}/*`, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}${BASE_PATH === '/' ? '' : BASE_PATH + '/'}`);
});
