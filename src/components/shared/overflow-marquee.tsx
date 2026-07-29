"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  HORIZONTAL_MARQUEE_PIXELS_PER_SECOND,
  horizontalMarqueeStartOffsetPixels,
  marqueeDistancePixels,
  marqueeDurationSeconds,
  nonScrollingMarqueeDelayMs,
  onePassMarqueeStartOffsetPixels,
  postScrollMarqueeDelayMs,
} from "@/lib/marquee";
import { cn } from "@/lib/utils";

type MarqueeAxis = "horizontal" | "vertical";

type MarqueeMetrics = {
  active: boolean;
  distance: number;
  duration: number;
  entryDuration: number;
  measured: boolean;
  startOffset: number;
};

const restingMetrics: MarqueeMetrics = {
  active: false,
  distance: 0,
  duration: 0,
  entryDuration: 0,
  measured: false,
  startOffset: 0,
};

export function OverflowMarquee({
  axis = "horizontal",
  children,
  className,
  contentClassName,
  gap = 32,
  nonScrollingDelayMs = 0,
  onComplete,
  postScrollDelayMs = 0,
  preserveNewlines = false,
  repeat = true,
}: {
  axis?: MarqueeAxis;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  gap?: number;
  nonScrollingDelayMs?: number;
  onComplete?: (didScroll: boolean) => void;
  postScrollDelayMs?: number;
  preserveNewlines?: boolean;
  repeat?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const completionReportedRef = useRef(false);
  const completionTimerRef = useRef<number | null>(null);
  const [metrics, setMetrics] =
    useState<MarqueeMetrics>(restingMetrics);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    completionReportedRef.current = false;

    const measure = () => {
      const viewportSize =
        axis === "horizontal"
          ? viewport.clientWidth
          : viewport.clientHeight;
      const contentSize =
        axis === "horizontal"
          ? content.scrollWidth
          : content.scrollHeight;
      const distance = marqueeDistancePixels({
        contentSize,
        exitViewport: axis === "horizontal" && !repeat,
        gap,
        repeat,
        viewportSize,
      });
      const active = distance > 0;
      const startOffset =
        axis === "vertical"
          ? onePassMarqueeStartOffsetPixels({
              active,
              repeat,
              viewportSize,
            })
          : horizontalMarqueeStartOffsetPixels({
              active,
              viewportSize,
            });
      const pixelsPerSecond =
        axis === "horizontal"
          ? HORIZONTAL_MARQUEE_PIXELS_PER_SECOND
          : undefined;
      const duration = marqueeDurationSeconds(
        distance +
          (axis === "vertical" || !repeat ? startOffset : 0),
        pixelsPerSecond,
      );
      const entryDuration =
        axis === "horizontal" && repeat
          ? marqueeDurationSeconds(startOffset, pixelsPerSecond)
          : 0;

      setMetrics((current) =>
        current.active === active &&
          current.distance === distance &&
          current.duration === duration &&
          current.entryDuration === entryDuration &&
          current.measured &&
          current.startOffset === startOffset
          ? current
          : {
              active,
              distance,
              duration,
              entryDuration,
              measured: true,
              startOffset,
            },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    return () => {
      observer.disconnect();
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [axis, children, gap, repeat]);

  const reportComplete = useCallback((didScroll: boolean) => {
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    const delay = postScrollMarqueeDelayMs(
      didScroll,
      postScrollDelayMs,
    );
    if (!delay) {
      onComplete?.(didScroll);
      return;
    }
    completionTimerRef.current = window.setTimeout(() => {
      completionTimerRef.current = null;
      onComplete?.(didScroll);
    }, delay);
  }, [onComplete, postScrollDelayMs]);

  useEffect(() => {
    if (repeat || !metrics.measured) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const timer = window.setTimeout(
        () => reportComplete(false),
        Math.max(0, nonScrollingDelayMs),
      );
      return () => window.clearTimeout(timer);
    }

    const delay = nonScrollingMarqueeDelayMs(
      metrics.active,
      nonScrollingDelayMs,
    );
    if (delay === null) return;
    const timer = window.setTimeout(() => reportComplete(false), delay);
    return () => window.clearTimeout(timer);
  }, [
    metrics.active,
    metrics.measured,
    nonScrollingDelayMs,
    repeat,
    reportComplete,
  ]);

  const style = {
    "--overflow-marquee-distance": `${metrics.distance}px`,
    "--overflow-marquee-duration": `${metrics.duration}s`,
    "--overflow-marquee-entry-duration": `${metrics.entryDuration}s`,
    "--overflow-marquee-gap": `${gap}px`,
    "--overflow-marquee-start-offset": `${metrics.startOffset}px`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "overflow-marquee-viewport min-h-0 min-w-0 overflow-hidden",
        className,
      )}
      ref={viewportRef}
    >
      <div
        className="overflow-marquee-track"
        data-active={metrics.active}
        data-axis={axis}
        data-post-scroll-delay-ms={postScrollDelayMs}
        data-repeat={repeat}
        onAnimationEnd={
          repeat || !metrics.active
            ? undefined
            : () => reportComplete(true)
        }
        style={style}
      >
        <div
          className={cn(
            "overflow-marquee-content",
            axis === "horizontal" &&
              !preserveNewlines &&
              "whitespace-nowrap",
            preserveNewlines && "whitespace-pre-line",
            contentClassName,
          )}
          ref={contentRef}
        >
          {children}
        </div>
        {metrics.active && repeat && (
          <div
            aria-hidden="true"
            className={cn(
              "overflow-marquee-content overflow-marquee-copy",
              axis === "horizontal" &&
                !preserveNewlines &&
                "whitespace-nowrap",
              preserveNewlines && "whitespace-pre-line",
              contentClassName,
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
