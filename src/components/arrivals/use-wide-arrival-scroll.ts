"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "@/lib/config";
import type { Arrival } from "@/lib/display-data";

const WIDE_SCROLL_TRANSFORMS = [
  "translateY(0px)",
  "translateY(calc(-100% - var(--sign-space)))",
  "translateY(calc(-200% - var(--sign-space) - var(--sign-space)))",
  "translateY(calc(-300% - var(--sign-space) - var(--sign-space) - var(--sign-space)))",
] as const;

export function wideScrollEndTransform(scrollingArrivalCount: number): string {
  const transformIndex = Math.min(
    Math.max(scrollingArrivalCount - 1, 0),
    WIDE_SCROLL_TRANSFORMS.length - 1,
  );
  return WIDE_SCROLL_TRANSFORMS[transformIndex];
}

export function wideScrollDurationMs(scrollingArrivalCount: number): number {
  return (
    Math.max(scrollingArrivalCount - 1, 0) *
    APP_CONFIG.display.wideScrollSecondsPerRow *
    1_000
  );
}

export function useWideArrivalScroll(
  arrivals: Arrival[],
  hasAlert: boolean,
) {
  const visibleArrivals = useMemo(
    () =>
      arrivals.slice(
        0,
        hasAlert ? 1 : APP_CONFIG.display.wideArrivalLimit,
      ),
    [arrivals, hasAlert],
  );
  const leadArrival = visibleArrivals[0];
  const scrollingArrivals = visibleArrivals.slice(1);
  const arrivalsSignature = scrollingArrivals
    .map((arrival) => arrival.id)
    .join(":");
  const secondRowNowId = scrollingArrivals[0]?.now
    ? scrollingArrivals[0].id
    : "";
  const endTransform = wideScrollEndTransform(scrollingArrivals.length);
  const scrollDurationMs = wideScrollDurationMs(scrollingArrivals.length);
  const [atEnd, setAtEnd] = useState(false);
  const [instant, setInstant] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    let cancelled = false;
    let resumeFrame: number | null = null;
    const moveToStart = () => {
      if (cancelled) return;
      setAtEnd(false);
      timer.current = window.setTimeout(
        moveToEnd,
        scrollDurationMs + APP_CONFIG.display.wideScrollStartPauseMs,
      );
    };
    const moveToEnd = () => {
      if (cancelled) return;
      setAtEnd(true);
      timer.current = window.setTimeout(
        moveToStart,
        scrollDurationMs + APP_CONFIG.display.wideScrollEndPauseMs,
      );
    };
    const resetFrame = window.requestAnimationFrame(() => {
      setInstant(true);
      setAtEnd(false);
      resumeFrame = window.requestAnimationFrame(() => {
        setInstant(false);
        if (scrollingArrivals.length < 2 || secondRowNowId) return;
        timer.current = window.setTimeout(moveToEnd, 0);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(resetFrame);
      if (resumeFrame !== null) {
        window.cancelAnimationFrame(resumeFrame);
      }
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [
    arrivalsSignature,
    secondRowNowId,
    scrollDurationMs,
    scrollingArrivals.length,
  ]);

  return {
    atEnd,
    endTransform,
    instant,
    leadArrival,
    scrollDurationMs,
    scrollingArrivals,
  };
}
