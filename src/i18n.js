(() => {
  "use strict";

  const LANGUAGES = Object.freeze(["en", "es", "ja"]);
  const LANGUAGE_STORAGE_KEY = "xAmbientLanguage";
  const catalogBase = typeof document !== "undefined" && document.currentScript?.src
    ? new URL("../_locales/", document.currentScript.src) : null;
  const catalogs = new Map();

  function normalizeLanguage(value) {
    return LANGUAGES.includes(value) ? value : "auto";
  }

  function resolveLocale(language, uiLanguage = "en") {
    const selected = normalizeLanguage(language);
    if (selected !== "auto") return selected;
    const base = String(uiLanguage).toLowerCase().split(/[-_]/)[0];
    return LANGUAGES.includes(base) ? base : "en";
  }

  function createTranslator(locale, messages, fallback = {}, nativeGetMessage) {
    function getMessage(key) {
      const native = nativeGetMessage?.(key);
      if (native) return native;
      return messages[key]?.message || fallback[key]?.message || "";
    }

    function apply(root) {
      const attributes = ["title", "aria-label", "alt"];
      const selector = ["[data-i18n]", ...attributes.map(name => `[data-i18n-${name}]`)].join(",");
      for (const element of root.querySelectorAll(selector)) {
        if (element.dataset.i18n) {
          const text = getMessage(element.dataset.i18n);
          if (text) element.textContent = text;
        }
        for (const attribute of attributes) {
          const key = element.getAttribute(`data-i18n-${attribute}`);
          if (key) {
            const text = getMessage(key);
            if (text) element.setAttribute(attribute, text);
          }
        }
      }
      if (root.documentElement) root.documentElement.lang = locale;
    }

    return Object.freeze({ locale, getMessage, apply });
  }

  async function readCatalog(locale) {
    if (!catalogs.has(locale)) {
      const url = typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL(`_locales/${locale}/messages.json`)
        : new URL(`${locale}/messages.json`, catalogBase).href;
      const request = fetch(url).then(response => {
        if (!response.ok) throw new Error(`Unable to load locale: ${locale}`);
        return response.json();
      }).catch(error => {
        catalogs.delete(locale);
        throw error;
      });
      catalogs.set(locale, request);
    }
    return catalogs.get(locale);
  }

  async function load(language = "auto", options = {}) {
    const native = typeof chrome !== "undefined" ? chrome.i18n : undefined;
    const uiLanguage = options.uiLanguage ?? native?.getUILanguage?.()
      ?? (typeof navigator !== "undefined" ? navigator.language : "en");
    const locale = resolveLocale(language, uiLanguage);
    const loader = options.readCatalog || readCatalog;
    const fallback = await loader("en");
    const messages = locale === "en" ? fallback : await loader(locale);
    const nativeGetMessage = normalizeLanguage(language) === "auto" && native?.getMessage
      ? key => native.getMessage(key) : undefined;
    return createTranslator(locale, messages, fallback, nativeGetMessage);
  }

  const api = Object.freeze({ LANGUAGES, LANGUAGE_STORAGE_KEY, normalizeLanguage, resolveLocale, createTranslator, load });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.XAmbientI18n = api;
})();
