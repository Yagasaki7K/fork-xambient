(() => {
  "use strict";
  const { DEFAULTS, normalize } = globalThis.XAmbientSettings;
  const I18n = globalThis.XAmbientI18n;
  const languageInput = document.getElementById("language");
  I18n.populateLanguageSelect(languageInput);
  const themeButton = document.getElementById("theme");
  let settings = { ...DEFAULTS };
  let languageRequest = 0;
  let previewPost = null;
  const sidebar = document.querySelector(".sidebar");
  document.getElementById("timeline").addEventListener("pointerover", event => {
    const post = event.target.closest('article[data-testid="tweet"]');
    if (post) previewPost = post;
  });
  // Keep the selected post visible while the mouse moves to the demo's controls.
  sidebar.addEventListener("pointerenter", () => document.dispatchEvent(new CustomEvent("xambient:preview", { detail: previewPost })));
  sidebar.addEventListener("pointerleave", () => document.dispatchEvent(new CustomEvent("xambient:preview", { detail: null })));
  for (const id of Object.keys(DEFAULTS)) {
    const input = document.getElementById(id);
    input.addEventListener(input.type === "range" ? "input" : "change", () => {
      settings = normalize({ ...settings, [id]: input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value });
      for (const name of ["intensity", "blur", "spread"]) document.getElementById(`${name}-value`).value = `${settings[name]}${name === "blur" ? " px" : "%"}`;
      document.dispatchEvent(new CustomEvent("xambient:settings", { detail: settings }));
    });
  }
  async function setLanguage(value) {
    const language = I18n.normalizeLanguage(value);
    const request = ++languageRequest;
    const translator = await I18n.load(language);
    if (request !== languageRequest) return;
    translator.apply(document);
    languageInput.value = language;
    languageInput.disabled = false;
  }

  languageInput.addEventListener("change", () => setLanguage(languageInput.value).catch(console.error));
  themeButton.addEventListener("click", () => {
    const light = document.body.classList.toggle("light");
    themeButton.dataset.i18n = light ? "themeSwitchDark" : "themeSwitchLight";
    setLanguage(languageInput.value).catch(console.error);
  });
  document.getElementById("add-post").addEventListener("click", () => {
    const post = document.querySelector('article[data-testid="tweet"]').cloneNode(true);
    post.setAttribute("data-i18n-aria-label", "postNewLabel");
    post.querySelector(".author b").setAttribute("data-i18n", "postNewAuthor");
    post.querySelector(".post-body p").setAttribute("data-i18n", "postNewText");
    post.querySelector("img").src = "assets/coast.svg";
    post.querySelector("img").setAttribute("data-i18n-alt", "postNewImageAlt");
    document.getElementById("timeline").prepend(post);
    setLanguage(languageInput.value).catch(console.error);
  });

  const initialLanguage = new URL(location.href).searchParams.get("lang") || "auto";
  setLanguage(initialLanguage).catch(console.error);
})();
