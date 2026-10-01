(() => {
  "use strict";
  const platform = new URL(location.href).searchParams.get("site") === "kick" ? "kick" : "twitch";
  globalThis.XAmbientStreaming = Object.freeze({ ...globalThis.XAmbientStreaming, platformForHostname: () => platform });
  let settings = { ...globalThis.XAmbientSettings.DEFAULTS };
  const player = document.querySelector(".player");
  const video = () => player.querySelector("video");
  function bindVideo(element) {
    for (const type of ["play", "pause", "loadeddata"]) element.addEventListener(type, () => {
      document.getElementById("pause").textContent = element.paused ? "Play" : "Pause";
    });
  }
  bindVideo(video());
  const apply = () => document.dispatchEvent(new CustomEvent("xambient:settings", { detail: settings }));
  let clicks = 0;
  document.getElementById("chat").addEventListener("click", () => {
    document.getElementById("chat-count").textContent = `${++clicks} clicks`;
  });
  document.getElementById("pause").addEventListener("click", () => {
    if (video().paused) video().play().catch(console.error);
    else video().pause();
  });
  document.getElementById("replace").addEventListener("click", () => {
    const replacement = video().cloneNode(true);
    replacement.src = "../../demo/assets/portrait.webm";
    bindVideo(replacement);
    video().replaceWith(replacement);
  });
  document.getElementById("hide").addEventListener("click", event => {
    player.hidden = !player.hidden;
    event.target.textContent = player.hidden ? "Show player" : "Hide player";
  });
  document.getElementById("resize").addEventListener("click", () => player.classList.toggle("small"));
  document.getElementById("enabled").addEventListener("click", event => {
    settings.enabled = !settings.enabled;
    event.target.textContent = settings.enabled ? "Disable light" : "Enable light";
    apply();
  });
  document.getElementById("scope").addEventListener("change", event => {
    settings.scope = event.target.value;
    apply();
  });
})();
