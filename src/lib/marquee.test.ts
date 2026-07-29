import assert from "node:assert/strict";
import test from "node:test";
import {
  HORIZONTAL_MARQUEE_PIXELS_PER_SECOND,
  horizontalMarqueeStartOffsetPixels,
  marqueeDistancePixels,
  marqueeDurationSeconds,
  nonScrollingMarqueeDelayMs,
  onePassMarqueeStartOffsetPixels,
  postScrollMarqueeDelayMs,
} from "@/lib/marquee";

test("keeps short marquee loops readable", () => {
  assert.equal(marqueeDurationSeconds(84), 8);
});

test("scales marquee duration with the complete overflow distance", () => {
  assert.equal(marqueeDurationSeconds(840), 20);
});

test("runs horizontal marquees faster than vertical marquees", () => {
  assert.equal(
    marqueeDurationSeconds(
      1_280,
      HORIZONTAL_MARQUEE_PIXELS_PER_SECOND,
    ),
    10,
  );
});

test("disables invalid or empty marquee distances", () => {
  assert.equal(marqueeDurationSeconds(0), 0);
  assert.equal(marqueeDurationSeconds(Number.NaN), 0);
});

test("holds non-scrolling marquees for their configured delay", () => {
  assert.equal(nonScrollingMarqueeDelayMs(false, 10_000), 10_000);
  assert.equal(nonScrollingMarqueeDelayMs(false, -1), 0);
  assert.equal(nonScrollingMarqueeDelayMs(true, 10_000), null);
});

test("holds only marquees that completed a scroll", () => {
  assert.equal(postScrollMarqueeDelayMs(true, 3_000), 3_000);
  assert.equal(postScrollMarqueeDelayMs(false, 3_000), 0);
  assert.equal(postScrollMarqueeDelayMs(true, -1), 0);
});

test("starts active one-pass marquees just beyond the viewport edge", () => {
  assert.equal(
    onePassMarqueeStartOffsetPixels({
      active: true,
      repeat: false,
      viewportSize: 300,
    }),
    300,
  );
  assert.equal(
    onePassMarqueeStartOffsetPixels({
      active: false,
      repeat: false,
      viewportSize: 300,
    }),
    0,
  );
  assert.equal(
    onePassMarqueeStartOffsetPixels({
      active: true,
      repeat: true,
      viewportSize: 300,
    }),
    0,
  );
});

test("starts active horizontal marquees just beyond the right edge", () => {
  assert.equal(
    horizontalMarqueeStartOffsetPixels({
      active: true,
      viewportSize: 800,
    }),
    800,
  );
  assert.equal(
    horizontalMarqueeStartOffsetPixels({
      active: false,
      viewportSize: 800,
    }),
    0,
  );
});

test("stops one-pass marquees at the bottom of their content", () => {
  assert.equal(
    marqueeDistancePixels({
      contentSize: 520,
      gap: 28,
      repeat: false,
      viewportSize: 300,
    }),
    220,
  );
});

test("moves one-pass horizontal marquees completely past the viewport", () => {
  assert.equal(
    marqueeDistancePixels({
      contentSize: 520,
      exitViewport: true,
      gap: 28,
      repeat: false,
      viewportSize: 300,
    }),
    520,
  );
});

test("keeps the copy gap in repeating marquee loops", () => {
  assert.equal(
    marqueeDistancePixels({
      contentSize: 520,
      gap: 28,
      repeat: true,
      viewportSize: 300,
    }),
    548,
  );
});
