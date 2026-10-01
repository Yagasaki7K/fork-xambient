const { test } = require("node:test");
const assert = require("node:assert/strict");
const Streaming = require("../src/streaming.js");
const manifest = require("../manifest.json");

test("Twitch and Kick use automatic player mode only on their exact supported hosts", () => {
  for (const host of ["twitch.tv", "www.twitch.tv"]) assert.equal(Streaming.platformForHostname(host), "twitch");
  for (const host of ["kick.com", "www.kick.com"]) assert.equal(Streaming.platformForHostname(host), "kick");
  for (const host of ["x.com", "localhost", "not-twitch.tv", "kick.com.example.org"]) assert.equal(Streaming.platformForHostname(host), "x");
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.ok(!JSON.stringify(manifest).includes("<all_urls>"));
  const content = manifest.content_scripts[0];
  for (const host of ["www.twitch.tv", "twitch.tv", "kick.com", "www.kick.com"]) assert.ok(content.matches.includes(`https://${host}/*`));
  assert.ok(content.js.indexOf("src/streaming.js") < content.js.indexOf("src/content.js"));
});

test("the main visible player wins over small previews and ended videos", () => {
  const preview = { ended: false };
  const main = { ended: false, paused: true };
  const ended = { ended: true };
  assert.equal(Streaming.pickVideo([
    { video: preview, rect: { width: 220, height: 124 } },
    { video: main, rect: { width: 960, height: 540 } },
    { video: ended, rect: { width: 1920, height: 1080 } },
  ]), main);
  assert.equal(Streaming.pickVideo([{ video: main, rect: null }]), null);
  assert.equal(Streaming.pickVideo([{ video: preview, rect: { width: 120, height: 60 } }]), null);
});
