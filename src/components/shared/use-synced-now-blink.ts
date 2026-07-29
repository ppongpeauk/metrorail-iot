"use client";

import { useEffect, useRef } from "react";

export function useSyncedNowBlink(now: boolean) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!now || !rowRef.current) return;

    const blinkAnimation = rowRef.current
      .getAnimations()
      .find(
        (animation) =>
          "animationName" in animation &&
          animation.animationName === "now-blink",
      );
    const duration = blinkAnimation?.effect?.getTiming().duration;
    const timelineTime = document.timeline.currentTime;

    if (
      blinkAnimation &&
      typeof duration === "number" &&
      duration > 0 &&
      typeof timelineTime === "number"
    ) {
      blinkAnimation.currentTime = timelineTime % duration;
    }
  }, [now]);

  return rowRef;
}
