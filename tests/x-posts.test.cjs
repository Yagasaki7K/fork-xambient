const { test } = require("node:test");
const assert = require("node:assert/strict");
const Posts = require("../src/content.js");
const manifest = require("../manifest.json");

test("post details identify the opened status, including media and legacy permalinks", () => {
  for (const path of ["/example/status/1234567890123456789", "/example/status/1234567890123456789/photo/1", "/example/status/1234567890123456789/video/1", "/i/web/status/1234567890123456789", "/i/status/1234567890123456789"]) {
    assert.equal(Posts.statusId(path), "1234567890123456789");
  }
});

test("timelines, profiles, searches, and invalid links never enable detail mode", () => {
  for (const path of ["/home", "/example", "/example/with_replies", "/search", "/i/bookmarks", "/example/status/not-a-number", "/example/status/123abc", "/other/example/status/123", "/"]) {
    assert.equal(Posts.statusId(path), null);
  }
});

test("the browser entry keeps post selection available with legacy manifest script lists", () => {
  const scripts = manifest.content_scripts[0].js;
  assert.ok(scripts.includes("src/content.js"));
  assert.equal(Posts.statusId("/example/status/123"), "123");
  assert.equal(require("../src/x-posts.js"), Posts);
});
