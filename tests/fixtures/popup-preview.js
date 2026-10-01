(() => {
  "use strict";
  fetch("../../src/popup.html").then(response => response.text()).then(html => {
    const preview = html.replace("<head>", '<head><base href="../../src/"><script src="../tests/fixtures/popup-storage.js"></script>');
    for (const frame of document.querySelectorAll("iframe")) frame.srcdoc = preview;
  }).catch(console.error);
})();
