const { test } = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/ambient-core.js");
const Settings = require("../src/settings.js");

test("settings recover safely from corrupt storage and clamp numeric sliders", () => {
  assert.deepEqual(Settings.normalize(null), Settings.DEFAULTS);
  assert.deepEqual(Settings.normalize({ enabled: "false", intensity: Infinity, blur: "80", spread: NaN, scope: "other" }), Settings.DEFAULTS);
  assert.deepEqual(Settings.normalize({ intensity: 200, blur: -10, spread: 51.6, enabled: false, animateVideo: false, scope: "post" }), {
    enabled: false, intensity: 100, blur: 24, spread: 52, scope: "post", animateVideo: false, fitCards: false,
  });
  assert.equal(Settings.normalize({ fitCards: false }).fitCards, false);
  assert.equal(Settings.normalize({ enabled: false }).fitCards, false);
  assert.equal(Settings.normalize({ doubleCards: false }).fitCards, false);
  assert.equal(Settings.normalize({ fitCards: true, doubleCards: false }).fitCards, true);
});

test("media mosaic preserves relative placement of multiple photos", () => {
  const bounds = Core.unionRects([
    { left: 100, top: 200, right: 300, bottom: 350 },
    { left: 304, top: 200, right: 504, bottom: 350 },
  ]);
  assert.deepEqual(bounds, { left: 100, top: 200, right: 504, bottom: 350, width: 404, height: 150 });
  assert.equal(Core.unionRects([]), null);
});

test("hidden, tiny, and offscreen media are excluded but partially visible photos work", () => {
  const view = { width: 1440, height: 900 };
  assert.equal(Core.isVisibleRect({ left: 500, top: 850, right: 900, bottom: 1100, width: 400, height: 250 }, view), true);
  assert.equal(Core.isVisibleRect({ left: 500, top: 895, right: 900, bottom: 1100, width: 400, height: 205 }, view), false);
  assert.equal(Core.isVisibleRect({ left: 10, top: 10, right: 40, bottom: 40, width: 30, height: 30 }, view), false);
});

test("video frame excludes an overlapping poster without excluding neighboring photos", () => {
  const video = { left: 100, top: 100, right: 500, bottom: 350, width: 400, height: 250 };
  assert.equal(Core.overlapFraction(video, video), 1);
  assert.equal(Core.overlapFraction({ ...video, left: 600, right: 1000 }, video), 0);
});

test("horizontal carousel clipping excludes hidden photos and retains the visible crop", () => {
  const clip = { left: 400, top: 100, right: 1000, bottom: 500 };
  assert.equal(Core.intersectRect({ left: 1050, top: 150, right: 1350, bottom: 400 }, clip), null);
  assert.deepEqual(Core.intersectRect({ left: 850, top: 150, right: 1150, bottom: 400 }, clip), {
    left: 850, right: 1000, top: 150, bottom: 400, width: 150, height: 250,
  });
});

test("cover crops rather than stretching a portrait into a wide photo", () => {
  const crop = Core.fitImage(400, 800, { left: 0, top: 0, width: 100, height: 50 });
  assert.deepEqual(crop, { sx: 0, sy: 300, sw: 400, sh: 200, dx: 0, dy: 0, dw: 100, dh: 50 });
  const leftCrop = Core.fitImage(800, 400, { left: 0, top: 0, width: 50, height: 100 }, "cover", [0, 0]);
  assert.equal(leftCrop.sx, 0);
  assert.equal(leftCrop.sw, 200);
});

test("contain preserves video aspect ratio and rejects unready sources", () => {
  assert.deepEqual(Core.fitImage(800, 400, { left: 10, top: 20, width: 100, height: 100 }, "contain"), {
    sx: 0, sy: 0, sw: 800, sh: 400, dx: 10, dy: 45, dw: 100, dh: 50,
  });
  assert.equal(Core.fitImage(0, 0, { left: 0, top: 0, width: 100, height: 100 }), null);
});

test("portrait video edges exclude the letterbox so light can spread sideways", () => {
  const box = { left: 100, top: 200, width: 600, height: 500, right: 700, bottom: 700 };
  const picture = Core.contentRect(1080, 1920, box, "contain");
  assert.equal(picture.width, 281.25);
  assert.equal(picture.left, 259.375);
  assert.ok(Math.abs(picture.height - 500) < 1e-9);
  assert.equal(Core.contentRect(1080, 1920, box, "contain", [0, .5]).left, 100);
});

test("light theme, dark theme, and transparent backgrounds are distinguished", () => {
  assert.equal(Core.isDarkColor("rgb(0, 0, 0)"), true);
  assert.equal(Core.isDarkColor("rgb(255, 255, 255)"), false);
  assert.equal(Core.isDarkColor("rgb(21, 32, 43)"), true);
  assert.equal(Core.isDarkColor("rgba(0, 0, 0, 0)", false), false);
});

test("native theme color resolves transparent roots and partial backgrounds", () => {
  assert.equal(Core.resolveBackgroundColor(["rgb(21, 32, 43)", "rgba(0, 0, 0, 0)"]), "rgb(21, 32, 43)");
  assert.equal(Core.resolveBackgroundColor(["rgb(0, 0, 0)", "rgba(200, 240, 160, 0.5)"]), "rgb(100, 120, 80)");
  assert.equal(Core.resolveBackgroundColor(["transparent", "invalid"], false), "rgb(255, 255, 255)");
  assert.equal(Core.resolveBackgroundColor(["transparent", "invalid"], true), "rgb(0, 0, 0)");
});

test("full X intensity extends opaque edge colors instead of fading them toward the theme", () => {
  const args = [{ width: 144, height: 90 }, { left: 80, top: 60, width: 80, height: 50 }, { width: 256, height: 192 }, 60];
  const low = Core.buildRayProjection(...args);
  const middle = Core.buildRayProjection(...args, 0.5);
  const full = Core.buildRayProjection(...args, 1);
  assert.ok(low.some(strip => strip.alpha < 0.5));
  assert.ok(full.length > 0 && full.every(strip => strip.alpha === 1));
  for (let i = 0; i < low.length; i++) assert.ok(low[i].alpha <= middle[i].alpha && middle[i].alpha <= full[i].alpha);
});

test("local mode protects the hovered post horizontally and vertically", () => {
  const rect = { left: 400, right: 1000, top: 100, bottom: 600 };
  const view = { width: 1440, height: 900 };
  assert.ok(Core.buildPostMask(rect, view).startsWith("linear-gradient(to right, #000 368px, transparent 400px, transparent 1000px, #000 1032px)"));
  assert.ok(Core.buildPostMask(rect, view).includes("to bottom"));
  assert.doesNotMatch(Core.buildPostMask({ ...rect, left: -50, right: 1500 }, view), /(?:#000|transparent) -/);
});

test("full-page mask protects media rectangles while leaving the entire background exposed", () => {
  const result = Core.buildMediaMask([{ left: 400, top: 300, width: 500, height: 280, radius: 16 }], { width: 1440, height: 900 });
  const svg = decodeURIComponent(result.match(/^url\("data:image\/svg\+xml,(.*)"\)$/)[1]);
  assert.match(svg, /width="1440" height="900"/);
  assert.match(svg, /x="400" y="300" width="500" height="280" rx="16" fill="black"/);
  assert.doesNotMatch(svg, /image|foreignObject|script|https:/);
});
