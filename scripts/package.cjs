const fs = require("node:fs");
const path = require("node:path");
const { buildZip } = require("./zip.cjs");
const root = path.resolve(__dirname, "..");
const outputRoot = path.resolve(process.env.X_AMBIENT_OUTPUT_DIR || path.join(root, "output"));
const destination = path.join(outputRoot, "x-ambient");
const archive = path.join(outputRoot, "x-ambient.zip");
const files = ["manifest.json", "LICENSE", "INSTALL.md", "src/settings.js", "src/i18n.js", "src/streaming.js", "src/x-posts.js", "src/ambient-core.js", "src/card-layout.js", "src/content.js", "src/popup.html", "src/popup.css", "src/popup.js", ...["en", "es", "ja"].map(locale => `_locales/${locale}/messages.json`), ...[16, 32, 48, 128].map(size => `icons/icon-${size}.png`)];
const entries = files.map(name => ({ name, data: fs.readFileSync(path.join(root, name)) }));
const zip = buildZip(entries);
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const entry of entries) {
  const target = path.join(destination, entry.name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, entry.data);
}
fs.writeFileSync(archive, zip);
console.log(`Extension folder: ${destination}\nZIP: ${archive}`);
