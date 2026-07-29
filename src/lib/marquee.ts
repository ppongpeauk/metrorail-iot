export const HORIZONTAL_MARQUEE_PIXELS_PER_SECOND = 128;

export function marqueeDurationSeconds(
  distancePixels: number,
  pixelsPerSecond = 42,
): number {
  if (!Number.isFinite(distancePixels) || distancePixels <= 0) return 0;
  return Math.max(8, distancePixels / pixelsPerSecond);
}

export function nonScrollingMarqueeDelayMs(
  active: boolean,
  delayMs: number,
): number | null {
  if (active) return null;
  return Math.max(0, delayMs);
}

export function postScrollMarqueeDelayMs(
  didScroll: boolean,
  delayMs: number,
): number {
  return didScroll ? Math.max(0, delayMs) : 0;
}

export function onePassMarqueeStartOffsetPixels({
  active,
  repeat,
  viewportSize,
}: {
  active: boolean;
  repeat: boolean;
  viewportSize: number;
}): number {
  if (
    !active ||
    repeat ||
    !Number.isFinite(viewportSize) ||
    viewportSize <= 0
  ) {
    return 0;
  }
  return viewportSize;
}

export function horizontalMarqueeStartOffsetPixels({
  active,
  viewportSize,
}: {
  active: boolean;
  viewportSize: number;
}): number {
  if (!active || !Number.isFinite(viewportSize) || viewportSize <= 0) {
    return 0;
  }
  return viewportSize;
}

export function marqueeDistancePixels({
  contentSize,
  exitViewport = false,
  gap,
  repeat,
  viewportSize,
}: {
  contentSize: number;
  exitViewport?: boolean;
  gap: number;
  repeat: boolean;
  viewportSize: number;
}): number {
  if (
    !Number.isFinite(contentSize) ||
    !Number.isFinite(viewportSize) ||
    contentSize <= viewportSize + 1
  ) {
    return 0;
  }
  if (repeat) return contentSize + Math.max(0, gap);
  return exitViewport ? contentSize : contentSize - viewportSize;
}
