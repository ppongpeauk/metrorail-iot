"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { StationTransfers } from "@/components/stations/station-transfers";
import {
  type Line,
  ROUTE_VISIBLE_ROWS,
  routeWindowStart,
  type Station,
} from "@/lib/display-data";
import { cn } from "@/lib/utils";

const routeTrackClassNames: Record<Line, string> = {
  RD: "bg-[var(--red)]",
  YL: "bg-[var(--yellow)]",
  GR: "bg-[var(--green)]",
  BL: "bg-[var(--blue)]",
  OR: "bg-[var(--orange)]",
  SV: "bg-[var(--silver)]",
};

export function RouteDiagram({
  stations,
  routeLine,
}: {
  stations: Station[];
  routeLine: Line;
}) {
  const currentIndex = stations.findIndex((station) => station.selected);
  const windowStart = routeWindowStart(stations);
  const windowEnd = Math.min(
    stations.length - 1,
    windowStart + ROUTE_VISIBLE_ROWS - 1,
  );
  const hasVisibleTrack = windowStart !== windowEnd;
  const viewportRef = useRef<HTMLDivElement>(null);
  const windowStartRef = useRef<HTMLDivElement>(null);
  const positionedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const windowStartId =
    stations[windowStart]?.id ?? stations[windowStart]?.name;

  useEffect(() => {
    const viewport = viewportRef.current;
    const firstVisibleStation = windowStartRef.current;
    if (!viewport || !firstVisibleStation) return;

    viewport.scrollTo({
      behavior:
        positionedRef.current && !reduceMotion ? "smooth" : "auto",
      top: firstVisibleStation.offsetTop,
    });
    positionedRef.current = true;
  }, [reduceMotion, windowStart, windowStartId]);

  return (
    <section className="-mx-[var(--sign-space)] flex min-h-0 flex-[0_0_61.2cqh] flex-col">
      <div className="grid min-h-[var(--column-head-height)] flex-none grid-cols-[calc(var(--content-inline-start)+var(--sign-space))_minmax(0,1fr)_var(--trailing-column-width)] items-end px-0 pb-[0.35cqh] pr-[calc(var(--panel-inline-inset)+var(--sign-space))] text-[length:var(--column-head-font-size)] font-normal leading-[1.25] text-[var(--white)]">
        <span className="col-start-2">Station</span>
        <span className="col-start-3">Transfers</span>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        data-route-viewport
        ref={viewportRef}
      >
        <div
          className="relative grid h-full grid-flow-row"
          style={{
            gridAutoRows: `calc(100% / ${ROUTE_VISIBLE_ROWS})`,
          }}
        >
          {stations.map((station, index) => {
            const isFirstVisible = index === windowStart;
            const isLastVisible = index === windowEnd;

            return (
              <div
                className={cn(
                  "relative z-[1] grid min-h-0 grid-cols-[calc(var(--content-inline-start)+var(--sign-space))_minmax(0,1fr)_var(--trailing-column-width)] items-center pr-[calc(var(--panel-inline-inset)+var(--sign-space))] text-[3.05cqw] leading-[1.2]",
                  station.selected &&
                    "text-[#181818] before:absolute before:inset-y-[20%] before:left-[11.1cqw] before:z-[-1] before:w-[2.1cqw] before:bg-white before:[clip-path:polygon(100%_0,100%_100%,0_50%)] before:content-[''] after:absolute after:inset-y-[20%] after:right-[2.8cqw] after:left-[13.2cqw] after:z-[-1] after:bg-white after:content-['']",
                )}
                data-route-station-index={index}
                data-selected={station.selected || undefined}
                key={station.id ?? station.name}
                ref={index === windowStart ? windowStartRef : undefined}
              >
                {hasVisibleTrack && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-0 left-[var(--route-track-inline-start)] z-[-2] h-full w-[var(--route-track-width)]",
                      routeTrackClassNames[routeLine],
                      isFirstVisible && "top-1/2 h-1/2",
                      isLastVisible && "h-1/2",
                    )}
                  />
                )}
                {hasVisibleTrack && index <= currentIndex && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-0 left-[var(--route-track-inline-start)] z-[-1] h-full w-[var(--route-track-width)] bg-[var(--muted)]",
                      isFirstVisible && "top-1/2 h-1/2",
                      station.selected && "h-1/2",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "absolute left-[6.43cqw] size-[3cqw] rounded-full border-[0.75cqw] border-black bg-white",
                    station.muted && "bg-[var(--muted)]",
                  )}
                  aria-hidden="true"
                />
                <strong
                  className={cn(
                    "col-start-2 overflow-hidden py-[0.12em] text-ellipsis whitespace-nowrap",
                    station.selected && "relative z-[1]",
                    station.muted && "text-[#969696]",
                  )}
                >
                  {station.name}
                </strong>
                <StationTransfers station={station} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
