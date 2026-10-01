const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../src/i18n.js");
const root = path.resolve(__dirname, "..");
const catalogs = Object.fromEntries(I18n.LANGUAGES.map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, "_locales", locale, "messages.json"), "utf8"))]));

test("automatic language supports Spanish and English regional browser locales", () => {
  for (const locale of ["es-AR", "es-419", "es_ES"]) assert.equal(I18n.resolveLocale("auto", locale), "es");
  assert.equal(I18n.resolveLocale("auto", "en-GB"), "en");
  assert.equal(I18n.resolveLocale("auto", "ja-JP"), "ja");
  assert.equal(I18n.resolveLocale("auto", "de-DE"), "en");
  assert.equal(I18n.resolveLocale("en", "es-AR"), "en");
  assert.equal(I18n.normalizeLanguage("../../other"), "auto");
});

test("every locale covers all UI and manifest messages without empty translations", () => {
  const expected = Object.keys(catalogs.en).sort();
  for (const [locale, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), expected, locale);
    for (const [key, value] of Object.entries(catalog)) {
      assert.match(key, /^[a-zA-Z][a-zA-Z0-9_]*$/);
      assert.equal(typeof value.message, "string", `${locale}:${key}`);
      assert.ok(value.message.trim(), `${locale}:${key}`);
      assert.doesNotMatch(value.message, /\u2014|<script|__MSG_/);
    }
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.default_locale, "en");
  for (const key of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) assert.ok(catalogs.en[key[1]]);
  for (const file of ["src/popup.html", "demo/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    for (const key of html.matchAll(/data-i18n(?:-(?:title|aria-label|alt))?="([^"]+)"/g)) {
      assert.ok(catalogs.en[key[1]], `${file}:${key[1]}`);
    }
    assert.doesNotMatch(html.replace(/<option value="ja" lang="ja">日本語<\/option>/g, ""), /[\u3040-\u30ff\u4e00-\u9fff]/g);
  }
});

test("missing translations fall back to English and native Chrome messages are supported", () => {
  const fallback = { ready: { message: "Ready" } };
  assert.equal(I18n.createTranslator("es", {}, fallback).getMessage("ready"), "Ready");
  assert.equal(I18n.createTranslator("es", {}, fallback, () => "Listo").getMessage("ready"), "Listo");
  assert.equal(I18n.createTranslator("en", {}, {}).getMessage("missing"), "");
});

test("language override loads only bundled supported catalogs", async () => {
  const requested = [];
  const translator = await I18n.load("es", { uiLanguage: "en-US", readCatalog: async locale => {
    requested.push(locale);
    return catalogs[locale];
  } });
  assert.deepEqual(requested, ["en", "es"]);
  assert.equal(translator.getMessage("languageLabel"), "Idioma");
  assert.equal(translator.locale, "es");
});
