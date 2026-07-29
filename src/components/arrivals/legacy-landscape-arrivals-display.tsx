"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineBadge } from "@/components/shared/line-badge";
import { OccupancyIndicator } from "@/components/arrivals/occupancy-indicator";
import { OverflowMarquee } from "@/components/shared/overflow-marquee";
import {
  abbreviateLegacyLandscapeDestination,
} from "@/lib/arrival-contract";
import {
  ALERT_SCROLL_HOLD_MS,
  ALERT_VISIBLE_MS,
  type TransitAlert,
} from "@/lib/alert-contract";
import type { Arrival } from "@/lib/display-data";
import {
  advanceLegacyBannerRotation,
  createLegacyBannerRotation,
  LEGACY_BANNER_GAP_MS,
} from "@/lib/legacy-banner-rotation";
import { cn } from "@/lib/utils";

const DESTINATION_TEXT_CLASS = "text-[8cqw]";

type AnnouncementPhase = "playing" | "holding" | "hidden";

export function LegacyLandscapeArrivalsDisplay({
  alerts = [],
  arrivals,
}: {
  alerts?: TransitAlert[];
  arrivals: Arrival[];
}) {
  const alertsRef = useRef(alerts);
  const [rotation, setRotation] = useState(() =>
    createLegacyBannerRotation(alerts),
  );
  const [announcementPhase, setAnnouncementPhase] =
    useState<AnnouncementPhase>("playing");

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    if (announcementPhase === "playing") return;
    const delay =
      announcementPhase === "holding"
        ? ALERT_SCROLL_HOLD_MS
        : LEGACY_BANNER_GAP_MS;
    const timer = window.setTimeout(() => {
      if (announcementPhase === "holding") {
        setAnnouncementPhase("hidden");
        return;
      }
      setRotation((current) =>
        advanceLegacyBannerRotation(current, alertsRef.current),
      );
      setAnnouncementPhase("playing");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [announcementPhase]);

  const handleAnnouncementComplete = useCallback((didScroll: boolean) => {
    setAnnouncementPhase((current) =>
      current === "playing"
        ? didScroll
          ? "holding"
          : "hidden"
        : current,
    );
  }, []);

  const currentAnnouncement = rotation.banner;

  return (
    <div className="font-condensed-medium flex min-h-0 flex-1 flex-col overflow-hidden bg-black font-normal text-white">
      <header className="grid h-[15cqh] flex-none grid-cols-[10cqw_17cqw_minmax(0,1fr)_15cqw] items-center gap-x-[2cqw] bg-[var(--header)] text-[7.8cqw] leading-[0.85]">
        <span>LN</span>
        <span>CAR</span>
        <span>DESTINATION</span>
        <span className="justify-self-end">MIN</span>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col"
          aria-live="polite"
        >
          {arrivals.slice(0, 5).map((arrival) => (
            <LegacyLandscapeArrivalRow
              arrival={arrival}
              key={arrival.id}
            />
          ))}
        </div>
        {announcementPhase !== "hidden" && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-[34cqh] overflow-hidden bg-[var(--header)] px-[5cqw] text-center leading-[1]",
              DESTINATION_TEXT_CLASS,
            )}
          >
            <OverflowMarquee
              axis="vertical"
              className="h-full"
              contentClassName="flex min-h-[34cqh] items-center justify-center whitespace-pre-line py-[2cqh] font-normal"
              gap={28}
              key={currentAnnouncement.id}
              nonScrollingDelayMs={ALERT_VISIBLE_MS}
              onComplete={handleAnnouncementComplete}
              repeat={false}
            >
              {currentAnnouncement.text}
            </OverflowMarquee>
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyLandscapeArrivalRow({
  arrival,
}: {
  arrival: Arrival;
}) {
  const minutes = arrival.arrival.match(/^(\d+)\s+min$/i);

  return (
    <div
      className={cn(
        "grid h-[17cqh] flex-none grid-cols-[10cqw_17cqw_minmax(0,1fr)_15cqw] items-center gap-x-[2cqw] bg-black leading-[0.82]",
        DESTINATION_TEXT_CLASS,
      )}
    >
      <LineBadge
        className="size-[8cqw] text-[4.7cqw] font-normal"
        line={arrival.line}
      />
      <span className="inline-flex min-w-0 items-center gap-[0.5cqw]">
        <span
          className={cn(arrival.cars === 8 && `text-[#00FF00]`)}
        >
          {arrival.cars ?? "-"}
        </span>
        <OccupancyIndicator
          className="gap-[0.25cqw] [&>img]:h-[7.2cqw]"
          status={arrival.occupancyStatus}
          symbol="legacy"
        />
      </span>
      <span className="min-w-0 text-ellipsis whitespace-nowrap overflow-x-hidden">
        {abbreviateLegacyLandscapeDestination(arrival.destination)}
      </span>
      <span className="justify-self-end">
        {minutes ? minutes[1] : arrival.arrival}
      </span>
    </div>
  );
}
