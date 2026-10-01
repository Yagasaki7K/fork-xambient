const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../src/i18n.js");
const root = path.resolve(__dirname, "..");
const catalogs = Object.fromEntries(I18n.LANGUAGES.map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, "_locales", locale, "messages.json"), "utf8"))]));

test("automatic language supports regional browser locales and manual overrides", () => {
  for (const locale of ["es-AR", "es-419", "es_ES"]) assert.equal(I18n.resolveLocale("auto", locale), "es");
  for (const [tag, locale] of [
    ["en-GB", "en"], ["ja-JP", "ja"], ["ko-KR", "ko"], ["th-TH", "th"],
    ["vi-VN", "vi"], ["id-ID", "id"], ["fr-CA", "fr"], ["de-AT", "de"],
    ["it-CH", "it"], ["ru-RU", "ru"], ["ar-EG", "ar"], ["hi-IN", "hi"],
  ]) {
    assert.equal(I18n.resolveLocale("auto", tag), locale, tag);
    assert.equal(I18n.normalizeLanguage(tag), locale, tag);
  }
  assert.equal(I18n.resolveLocale("auto", "nl-NL"), "en");
  assert.equal(I18n.resolveLocale("en", "es-AR"), "en");
  assert.equal(I18n.normalizeLanguage("../../other"), "auto");
});

test("Portuguese browser regions choose the Brazilian or European catalog", () => {
  for (const tag of ["pt", "pt-BR", "pt_BR", "pt-Latn-BR"]) {
    assert.equal(I18n.resolveLocale("auto", tag), "pt_BR", tag);
  }
  for (const tag of ["pt-PT", "pt_PT", "pt-AO", "pt-MZ", "pt-Latn-PT"]) {
    assert.equal(I18n.resolveLocale("auto", tag), "pt_PT", tag);
  }
  assert.equal(I18n.resolveLocale("pt_BR", "pt-PT"), "pt_BR");
  assert.equal(I18n.resolveLocale("pt_PT", "pt-BR"), "pt_PT");
  assert.notEqual(catalogs.pt_BR.statusSaveError.message, catalogs.pt_PT.statusSaveError.message);
});

test("Chinese scripts and regions resolve to the matching bundled catalog", () => {
  for (const locale of ["zh", "zh-CN", "zh_SG", "zh-Hans", "zh-Hans-HK", "ZH-hans-TW"]) {
    assert.equal(I18n.resolveLocale("auto", locale), "zh_CN", locale);
  }
  for (const locale of ["zh-TW", "zh_HK", "zh-MO", "zh-Hant", "zh-Hant-CN"]) {
    assert.equal(I18n.resolveLocale("auto", locale), "zh_TW", locale);
  }
  assert.equal(I18n.resolveLocale("zh_TW", "zh-CN"), "zh_TW");
  assert.equal(I18n.resolveLocale("zh_CN", "zh-TW"), "zh_CN");
  assert.equal(I18n.normalizeLanguage("zh-CN"), "zh_CN");
  assert.equal(I18n.normalizeLanguage("zh-Hant"), "zh_TW");
  assert.equal(I18n.normalizeLanguage("KO-kr"), "ko");
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
    assert.ok(catalog.extensionDescription.message.length <= 132, `${locale}: manifest description`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.default_locale, "en");
  for (const key of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) assert.ok(catalogs.en[key[1]]);
  for (const file of ["src/popup.html", "demo/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    for (const key of html.matchAll(/data-i18n(?:-(?:title|aria-label|alt))?="([^"]+)"/g)) {
      assert.ok(catalogs.en[key[1]], `${file}:${key[1]}`);
    }
    assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9fff]/g);
  }
});

test("missing translations fall back to English and native Chrome messages are supported", () => {
  const fallback = { ready: { message: "Ready" } };
  assert.equal(I18n.createTranslator("es", {}, fallback).getMessage("ready"), "Ready");
  assert.equal(I18n.createTranslator("es", {}, fallback, () => "Listo").getMessage("ready"), "Listo");
  assert.equal(I18n.createTranslator("zh_TW", { ready: { message: "已就緒" } }, fallback, () => "Ready").getMessage("ready"), "已就緒");
  assert.equal(I18n.createTranslator("en", {}, {}).getMessage("missing"), "");
});

test("HTML language tags use BCP 47 while catalog paths use Chrome locale codes", async () => {
  const requested = [];
  const translator = await I18n.load("auto", { uiLanguage: "zh-Hant-HK", readCatalog: async locale => {
    requested.push(locale);
    return catalogs[locale];
  } });
  assert.deepEqual(requested, ["en", "zh_TW"]);
  const document = { querySelectorAll: () => [], documentElement: {} };
  translator.apply(document);
  assert.equal(document.documentElement.lang, "zh-TW");
  assert.equal(document.documentElement.dir, "ltr");
  assert.equal(translator.getMessage("languageLabel"), "語言");
});

test("Arabic selection sets RTL and switching languages restores LTR", async () => {
  const document = { querySelectorAll: () => [], documentElement: {} };
  const arabic = await I18n.load("ar", {
    uiLanguage: "en-US", readCatalog: async locale => catalogs[locale],
  });
  arabic.apply(document);
  assert.equal(document.documentElement.lang, "ar");
  assert.equal(document.documentElement.dir, "rtl");
  assert.equal(arabic.getMessage("languageLabel"), "اللغة");
  const french = await I18n.load("fr", {
    uiLanguage: "ar-SA", readCatalog: async locale => catalogs[locale],
  });
  french.apply(document);
  assert.equal(document.documentElement.lang, "fr");
  assert.equal(document.documentElement.dir, "ltr");
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
