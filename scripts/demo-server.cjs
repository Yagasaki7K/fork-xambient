const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webm": "video/webm", ".json": "application/json" };
const port = Number(process.env.X_AMBIENT_DEMO_PORT || 4318);

http.createServer((request, response) => {
  let name;
  try { name = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (name === "/" || name === "/demo/") {
    response.writeHead(302, { Location: "/demo/index.html" }).end(); return;
  }
  const file = path.resolve(root, `.${name}`);
  if (!file.startsWith(`${root}${path.sep}`) || name.split("/").some((part) => part.startsWith("."))) {
    response.writeHead(403).end(); return;
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) { response.writeHead(416).end(); return; }
    response.writeHead(range ? 206 : 200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` } : {}),
    });
    fs.createReadStream(file, { start, end }).pipe(response);
  });
}).listen(port, "127.0.0.1", () => console.log(`X Ambient demo: http://127.0.0.1:${port}`));
