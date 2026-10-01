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

test("TikTok and Niconico use their exact hosts without requesting access to other sites", () => {
  for (const [platform, hosts] of [
    ["tiktok", ["tiktok.com", "www.tiktok.com"]],
    ["niconico", ["nicovideo.jp", "www.nicovideo.jp"]],
  ]) for (const host of hosts) {
    assert.equal(Streaming.platformForHostname(host), platform);
    assert.ok(manifest.content_scripts[0].matches.includes(`https://${host}/*`));
  }
  for (const host of ["tiktok.com.example.org", "not-tiktok.com", "nicovideo.jp.example.org", "live.nicovideo.jp"]) {
    assert.equal(Streaming.platformForHostname(host), "x");
  }
  assert.deepEqual(manifest.permissions, ["storage"]);
});

test("new platforms only select videos on recommendations and watch routes", () => {
  const video = {};
  const root = { querySelectorAll: () => [video] };
  for (const route of ["/", "/foryou", "/foryou/"]) assert.deepEqual(Streaming.findVideos(root, "tiktok", route), [video]);
  for (const route of ["/following", "/explore", "/search", "/@profile", "/@profile/video/123", "/foryou/other"]) {
    assert.deepEqual(Streaming.findVideos(root, "tiktok", route), []);
  }
  for (const route of ["/watch/sm46858847", "/watch/so12345/", "/watch/nm12345", "/watch/12345"]) {
    assert.deepEqual(Streaming.findVideos(root, "niconico", route), [video]);
  }
  for (const route of ["/", "/search", "/video_top", "/user/123", "/watch/", "/watch/sm123/other"]) {
    assert.deepEqual(Streaming.findVideos(root, "niconico", route), []);
  }
  assert.deepEqual(Streaming.findVideos(root, "twitch", "/example"), [video]);
});

test("Niconico falls back to the main player while excluding its advertisement container", () => {
  const main = { closest: () => null }, ad = { closest: () => ({}) };
  const root = { querySelectorAll: selector => selector.includes("video-content") ? [] : [ad, main] };
  assert.deepEqual(Streaming.findVideos(root, "niconico", "/watch/sm12345"), [main]);
});

const viewport = { width: 1440, height: 960 };
const feedRect = (top, height = 620) => ({ left: 500, top, width: 350, height, right: 850, bottom: top + height });
const feedCandidate = (video, top, extra = {}) => ({ video, rect: feedRect(top), fullRect: feedRect(top), ...extra });
const feedOptions = { platform: "tiktok", viewport };

test("TikTok follows centered and mostly visible playback instead of preloaded neighbors", () => {
  const first = { paused: true }, second = { paused: true }, preloaded = { paused: false };
  assert.equal(Streaming.pickVideo([feedCandidate(first, 0), feedCandidate(second, 170)], feedOptions), second);
  assert.equal(Streaming.pickVideo([feedCandidate(first, 0, { video: preloaded }), feedCandidate(second, 170)], feedOptions), preloaded);
  assert.equal(Streaming.pickVideo([
    feedCandidate(second, 170),
    feedCandidate(preloaded, 0, { rect: feedRect(0, 120), fullRect: feedRect(-500) }),
  ], feedOptions), second);
  assert.equal(Streaming.pickVideo([feedCandidate(preloaded, 0, { rect: null })], feedOptions), null);
});

test("TikTok retains paused frames through small layout shifts and switches when scrolled", () => {
  const first = { paused: true }, second = { paused: true };
  const close = [feedCandidate(first, 150), feedCandidate(second, 170)];
  assert.equal(Streaming.pickVideo(close, feedOptions), second);
  assert.equal(Streaming.pickVideo(close, { ...feedOptions, previous: first }), first);
  assert.equal(Streaming.pickVideo([
    feedCandidate(first, 0, { rect: feedRect(0, 220), fullRect: feedRect(-400) }), feedCandidate(second, 170),
  ], { ...feedOptions, previous: first }), second);
});

test("TikTok and Niconico retain a visible final frame after a video ends", () => {
  const video = { ended: true, paused: true };
  const candidates = [feedCandidate(video, 170)];
  assert.equal(Streaming.pickVideo(candidates, feedOptions), video);
  assert.equal(Streaming.pickVideo(candidates, { platform: "niconico" }), video);
  assert.equal(Streaming.pickVideo(candidates), null);
});
