const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inflateRawSync } = require("node:zlib");
const { crc32, buildZip } = require("../scripts/zip.cjs");

test("dependency-free ZIP preserves UTF-8 file names, contents, and checksums", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  const payload = Buffer.from('Español: iluminación y extensión. 日本語', "utf8");
  const zip = buildZip([{ name: "_locales/es/messages.json", data: payload }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  const nameLength = zip.readUInt16LE(26);
  const compressedLength = zip.readUInt32LE(18);
  assert.equal(zip.subarray(30, 30 + nameLength).toString("utf8"), "_locales/es/messages.json");
  const decoded = inflateRawSync(zip.subarray(30 + nameLength, 30 + nameLength + compressedLength));
  assert.deepEqual(decoded, payload);
  assert.equal(zip.readUInt32LE(14), crc32(decoded));
  assert.deepEqual(buildZip([{ name: "_locales/es/messages.json", data: payload }]), zip);
});

test("ZIP rejects paths that could escape the extension folder", () => {
  for (const name of ["../secret", "/absolute", "C:/file", "a\\file", "a/./file"]) {
    assert.throws(() => buildZip([{ name, data: "test" }]), /Invalid archive path/);
  }
});
