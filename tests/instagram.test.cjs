const { test } = require("node:test");
const assert = require("node:assert/strict");
const Instagram = require("../src/instagram.js");
const Streaming = require("../src/streaming.js");
const manifest = require("../manifest.json");
const viewport = { width: 1440, height: 960 };
const box = (top, height = 300) => ({ left: 500, top, width: 470, height, right: 970, bottom: top + height });
const candidate = (post, top, extra = {}) => ({ post, rect: box(top), fullRect: box(top), ...extra });

test("Instagram uses automatic selection on its exact hosts and bundles its adapter", () => {
  for (const host of ["instagram.com", "www.instagram.com"]) {
    assert.equal(Streaming.platformForHostname(host), "instagram");
    assert.ok(manifest.content_scripts[0].matches.includes(`https://${host}/*`));
  }
  for (const host of ["instagram.com.example.org", "not-instagram.com"]) assert.equal(Streaming.platformForHostname(host), "x");
  assert.deepEqual(manifest.permissions, ["storage"]);
  const scripts = manifest.content_scripts[0].js;
  assert.ok(scripts.indexOf("src/instagram.js") < scripts.indexOf("src/content.js"));
});

test("the centered feed post wins without pointer input", () => {
  const first = {}, second = {};
  assert.equal(Instagram.pickActive([candidate(first, 0), candidate(second, 350)], viewport), second);
  assert.equal(Instagram.pickActive([], viewport), null);
  assert.equal(Instagram.pickActive([candidate(first, 0, { rect: null })], viewport), null);
});

test("mostly visible playback takes priority but an offscreen playing reel cannot steal selection", () => {
  const photo = {}, video = {};
  assert.equal(Instagram.pickActive([candidate(photo, 350), candidate(video, 20, { playing: true })], viewport), video);
  assert.equal(Instagram.pickActive([
    candidate(photo, 350), candidate(video, 0, { playing: true, rect: box(0, 70), fullRect: box(-530, 600) }),
  ], viewport), photo);
  assert.equal(Instagram.pickActive([candidate(video, 300, { playing: false })], viewport), video);
});

test("an opened dialog takes priority over the feed behind it", () => {
  const feed = {}, modal = {};
  assert.equal(Instagram.pickActive([
    candidate(feed, 300, { playing: true }), candidate(modal, 100, { dialog: true }),
  ], viewport), modal);
  assert.equal(Instagram.pickActive([
    candidate(feed, 300), candidate(modal, 100, { dialog: true, rect: null }),
  ], viewport), feed);
});

test("small visibility changes keep the current post, while scrolling still switches it", () => {
  const first = {}, second = {};
  const close = [candidate(first, 310), candidate(second, 330)];
  assert.equal(Instagram.pickActive(close, viewport), second);
  assert.equal(Instagram.pickActive(close, viewport, first), first);
  assert.equal(Instagram.pickActive([candidate(first, 100), candidate(second, 350)], viewport, first), second);
});

test("profile links are excluded from post images", () => {
  const image = pathname => ({ closest: () => pathname && { pathname } });
  for (const path of ["/p/example/", "/reel/example/", "/reels/example/", null]) assert.equal(Instagram.isPostImage(image(path)), true);
  for (const path of ["/profile/", "/stories/profile/"]) assert.equal(Instagram.isPostImage(image(path)), false);
  assert.equal(Instagram.isPostImage({ closest: () => null, getAttribute: () => "true" }), false);
});

test("feed articles and article-less reels are discovered without obfuscated classes", () => {
  const article = {};
  const video = { closest: () => null };
  const inArticle = { closest: () => article };
  const root = { querySelectorAll: selector => selector.includes("article") ? [article] : [video, inArticle] };
  assert.deepEqual(Instagram.findPosts(root, "/"), [article]);
  assert.deepEqual(Instagram.findPosts(root, "/reels/"), [article, video]);
  assert.deepEqual(Instagram.findPosts(root, "/reel/example/"), [article, video]);
  for (const path of ["/direct/inbox/", "/stories/example/", "/profile/", "/explore/"]) {
    assert.deepEqual(Instagram.findPosts(root, path), []);
  }
});
