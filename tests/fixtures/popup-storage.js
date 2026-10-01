(() => {
  "use strict";
  const uiLanguage = window.frameElement.dataset.uiLanguage;
  const key = `popup-fixture:${uiLanguage}`;
  globalThis.chrome = {
    i18n: { getUILanguage: () => uiLanguage },
    storage: {
      local: {
        get: async () => JSON.parse(sessionStorage.getItem(key) || "{}"),
        set: async value => {
          const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
          sessionStorage.setItem(key, JSON.stringify({ ...saved, ...value }));
        },
      },
    },
  };
})();
