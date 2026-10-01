(() => {
  "use strict";
  const site = document.body.dataset.site;
  const primary = () => document.querySelector("#first-video");
  const canvas = document.querySelector("tt-vod-sr-wrap canvas");
  if (canvas) {
    const context = canvas.getContext("2d");
    const draw = () => {
      const video = primary();
      if (video.readyState >= 2) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(draw);
    };
    draw();
  }
  const comments = document.getElementById("comments");
  if (comments) {
    const context = comments.getContext("2d");
    context.font = "bold 30px sans-serif";
    context.fillStyle = "white";
    context.shadowColor = "black";
    context.shadowBlur = 3;
    context.fillText("Native comments stay sharp", 55, 80);
  }
  document.getElementById("pause").addEventListener("click", () => {
    if (primary().paused) primary().play().catch(console.error);
    else primary().pause();
  });
  document.getElementById("replace").addEventListener("click", () => {
    const video = primary();
    const replacement = video.cloneNode(true);
    replacement.src = "../../demo/assets/portrait.webm";
    video.replaceWith(replacement);
    replacement.play().catch(console.error);
  });
  document.getElementById("presentation")?.addEventListener("click", () => {
    primary().parentElement.classList.toggle("use-canvas");
  });
  let clicks = 0;
  document.getElementById("click-test").addEventListener("click", event => {
    event.target.textContent = `Control clicks: ${++clicks}`;
  });
  if (!["127.0.0.1", "localhost"].includes(location.hostname)) return;
  let settings;
  async function loadRenderer() {
    const load = name => new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `../../src/${name}.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    for (const name of ["settings", "ambient-core", "streaming"]) await load(name);
    const streaming = globalThis.XAmbientStreaming;
    globalThis.XAmbientStreaming = Object.freeze({
      ...streaming,
      platformForHostname: () => site,
      findVideos: (root, platform, pathname) => streaming.findVideos(root, platform,
        pathname.startsWith("/tests/fixtures/") ? document.body.dataset.initialPath : pathname),
    });
    settings = { ...globalThis.XAmbientSettings.DEFAULTS };
    await load("content");
  }
  document.getElementById("enabled").addEventListener("click", event => {
    if (!settings) return;
    settings.enabled = !settings.enabled;
    event.target.textContent = settings.enabled ? "Disable light" : "Enable light";
    document.dispatchEvent(new CustomEvent("xambient:settings", { detail: settings }));
  });
  loadRenderer().catch(console.error);
})();
