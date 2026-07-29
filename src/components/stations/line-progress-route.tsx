"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrivalHead } from "@/components/arrivals/arrival-head";
import { RouteDiagram } from "@/components/stations/route-diagram";
import type { Line, Station } from "@/lib/display-data";
import { cn } from "@/lib/utils";

type LineProgressRouteState = {
  tripId: string;
  routeLine: Line;
  stations: Station[];
};

const resizeDurationMs = 2000;

export function LineProgressRoute({
  collapsedSpacer,
  onExpandedChange,
  route,
}: {
  collapsedSpacer: boolean;
  onExpandedChange: (expanded: boolean) => void;
  route: LineProgressRouteState | null;
}) {
  const reduceMotion = useReducedMotion();
  const [visibleRoute, setVisibleRoute] =
    useState<LineProgressRouteState | null>(route);
  const [expanded, setExpanded] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearScheduledUpdate() {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    clearScheduledUpdate();

    if (reduceMotion) {
      frameRef.current = window.requestAnimationFrame(() => {
        setVisibleRoute(route);
        setExpanded(Boolean(route));
        onExpandedChange(Boolean(route));
        frameRef.current = null;
      });
    } else if (route?.tripId === visibleRoute?.tripId) {
      frameRef.current = window.requestAnimationFrame(() => {
        setVisibleRoute(route);
        setExpanded(Boolean(route));
        onExpandedChange(Boolean(route));
        frameRef.current = null;
      });
    } else {
      frameRef.current = window.requestAnimationFrame(() => {
        setExpanded(false);
        onExpandedChange(false);
        frameRef.current = null;
        timerRef.current = window.setTimeout(() => {
          setVisibleRoute(route);
          timerRef.current = null;
          frameRef.current = window.requestAnimationFrame(() => {
            setExpanded(Boolean(route));
            onExpandedChange(Boolean(route));
            frameRef.current = null;
          });
        }, resizeDurationMs);
      });
    }

    return clearScheduledUpdate;
  }, [onExpandedChange, reduceMotion, route, visibleRoute?.tripId]);

  return (
    <div
      aria-hidden={!expanded}
      className={cn(
        "t-resize flex flex-none flex-col overflow-hidden",
        expanded
          ? "h-[calc(61.2cqh+var(--column-head-height))]"
          : collapsedSpacer
            ? "h-[var(--sign-space)]"
            : "h-0",
      )}
    >
      {visibleRoute && (
        <div className="flex h-[calc(61.2cqh+var(--column-head-height))] flex-none flex-col">
          <RouteDiagram
            key={visibleRoute.tripId}
            routeLine={visibleRoute.routeLine}
            stations={visibleRoute.stations}
          />
          <ArrivalHead />
        </div>
      )}
    </div>
  );
}
