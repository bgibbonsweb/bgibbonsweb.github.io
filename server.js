const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const rootDir = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=UTF-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function safeJoin(base, target) {
  const targetPath = path.resolve(base, target);
  const relative = path.relative(base, targetPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return targetPath;
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const rawPath = decodeURIComponent(req.url.split("?")[0]);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const requestedPath = safeJoin(rootDir, relativePath);

  if (!requestedPath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Bad request");
    return;
  }

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      sendFile(path.join(requestedPath, "index.html"), res);
      return;
    }

    if (!err && stats.isFile()) {
      sendFile(requestedPath, res);
      return;
    }

    // Allow extensionless routes like /work -> /work.html.
    if (!path.extname(relativePath)) {
      const htmlFallbackPath = safeJoin(rootDir, `${relativePath}.html`);
      if (!htmlFallbackPath) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end("Bad request");
        return;
      }

      fs.stat(htmlFallbackPath, (htmlErr, htmlStats) => {
        if (!htmlErr && htmlStats.isFile()) {
          sendFile(htmlFallbackPath, res);
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end("Not found");
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Not found");
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});