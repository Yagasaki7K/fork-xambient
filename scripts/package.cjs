const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const destination = path.join(root, "output", "x-ambient");
const archive = path.join(root, "output", "x-ambient.zip");
const files = ["manifest.json", "LICENSE", "INSTALL.md", "src/settings.js", "src/ambient-core.js", "src/card-layout.js", "src/content.js", "src/popup.html", "src/popup.css", "src/popup.js", ...[16, 32, 48, 128].map((size) => `icons/icon-${size}.png`)];
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
fs.rmSync(archive, { force: true });
const result = spawnSync("zip", ["-q", archive, ...files], { cwd: destination, stdio: "inherit" });
if (result.status !== 0) {
  console.error(`ZIPを作成できませんでした。zipコマンドを確認してください。\n読み込み用フォルダ: ${destination}`);
  process.exitCode = 1;
} else {
  console.log(`読み込み用フォルダ: ${destination}\nZIP: ${archive}`);
}
