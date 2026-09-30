(() => {
  const { DEFAULTS, normalize } = globalThis.XAmbientSettings;
  let settings = { ...DEFAULTS };
  for (const id of Object.keys(DEFAULTS)) {
    const input = document.getElementById(id);
    input.addEventListener(input.type === "range" ? "input" : "change", () => {
      settings = normalize({ ...settings, [id]: input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value });
      for (const name of ["intensity", "blur", "spread"]) document.getElementById(`${name}-value`).value = `${settings[name]}${name === "blur" ? "px" : "%"}`;
      document.dispatchEvent(new CustomEvent("xambient:settings", { detail: settings }));
    });
  }
  document.getElementById("theme").addEventListener("click", (event) => {
    const light = document.body.classList.toggle("light");
    event.target.textContent = light ? "ダークに切替" : "ライトに切替";
  });
  document.getElementById("add-post").addEventListener("click", () => {
    const post = document.querySelector('article[data-testid="tweet"]').cloneNode(true);
    post.setAttribute("aria-label", "追加した画像投稿");
    post.querySelector(".author b").textContent = "New post";
    post.querySelector(".post-body p").textContent = "あとから追加された投稿にも、光が追従します。";
    post.querySelector("img").src = "assets/coast.svg";
    post.querySelector("img").alt = "追加したターコイズ色の海岸";
    document.getElementById("timeline").prepend(post);
  });
})();
