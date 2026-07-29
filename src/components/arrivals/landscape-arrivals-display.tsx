"use client";

import {
  AnimatePresence,
  LayoutGroup,
  m,
  useReducedMotion,
} from "motion/react";
import { LineBadge } from "@/components/shared/line-badge";
import { MetroLogo } from "@/components/layout/metro-logo";
import { OverflowMarquee } from "@/components/shared/overflow-marquee";
import { SignArrivalTime } from "@/components/arrivals/sign-arrival-time";
import { useSyncedNowBlink } from "@/components/shared/use-synced-now-blink";
import {
  ALERT_SCROLL_HOLD_MS,
  ALERT_VISIBLE_MS,
} from "@/lib/alert-contract";
import type { Arrival } from "@/lib/display-data";
import { cn } from "@/lib/utils";

const enterDurationSeconds = 0.18;
const layoutDurationSeconds = 0.35;
const easeOut = [0.22, 1, 0.36, 1] as const;

function destinationTextClass(rowCount: 4 | 5): string {
  return rowCount === 5 ? "text-[4.3cqw]" : "text-[5.35cqw]";
}

export function LandscapeArrivalsDisplay({
  alert,
  alertType,
  arrivals,
  onAlertComplete,
  rowCount,
}: {
  alert?: string | null;
  alertType?: "service" | "facility";
  arrivals: Arrival[];
  onAlertComplete?: () => void;
  rowCount: 4 | 5;
}) {
  const reduceMotion = useReducedMotion();
  const multilineAlert = Boolean(alert?.includes("\n"));
  const visibleArrivals = arrivals.slice(
    0,
    alert ? rowCount - 2 : rowCount,
  );

  return (
    <>
      <header
        className={cn(
          "grid min-h-[17.5cqh] flex-none grid-cols-[8.6cqw_minmax(0,1fr)_16cqw_17cqw] items-center gap-x-[1cqw] rounded-[var(--radius-panel)] bg-[var(--header)] px-[2.4cqw] text-[5.2cqw] text-[var(--white)]",
          rowCount === 5 && "min-h-[14cqh] text-[4.2cqw]",
        )}
      >
        <MetroLogo
          className={rowCount === 5 ? "h-[7cqw] w-[4cqw]" : "h-[8.8cqw] w-[5cqw]"}
        />
        <strong>Destination</strong>
        <strong>Car</strong>
        <strong>Arrival</strong>
      </header>
      <LayoutGroup>
        <div
          className="mt-[var(--sign-space)] flex min-h-0 flex-1 flex-col gap-[var(--sign-space)] overflow-hidden"
          aria-live="polite"
        >
          <AnimatePresence initial mode="popLayout">
            {visibleArrivals.map((arrival) => (
              <LandscapeArrivalRow
                arrival={arrival}
                key={arrival.id}
                reduceMotion={reduceMotion}
                rowCount={rowCount}
              />
            ))}
          </AnimatePresence>
          {alert && (
            <div
              className={cn(
                "mt-auto flex min-h-0 flex-[0_0_calc(37.35cqh+var(--sign-space))] items-center gap-[2.2cqw] rounded-[var(--radius-panel)] px-[2.4cqw] leading-[1.04]",
                destinationTextClass(rowCount),
                rowCount === 5 &&
                  "basis-[calc(30.5cqh+var(--sign-space))]",
                multilineAlert && "leading-[0.98]",
                alertType === "facility"
                  ? "bg-[var(--panel)] text-white"
                  : "bg-[#fff6c9] text-[#111]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-[5.2cqw] flex-none place-items-center rounded-full text-[3.5cqw]",
                  alertType === "facility"
                    ? "bg-white text-[#111]"
                    : "bg-[#111] text-white",
                )}
              >
                !
              </span>
              <OverflowMarquee
                axis="vertical"
                className="min-h-0 min-w-0 flex-1 self-stretch"
                contentClassName="font-bold"
                gap={40}
                nonScrollingDelayMs={ALERT_VISIBLE_MS}
                onComplete={onAlertComplete}
                postScrollDelayMs={ALERT_SCROLL_HOLD_MS}
                preserveNewlines
                repeat={!onAlertComplete}
              >
                {alert}
              </OverflowMarquee>
            </div>
          )}
        </div>
      </LayoutGroup>
    </>
  );
}

function LandscapeArrivalRow({
  arrival,
  reduceMotion,
  rowCount,
}: {
  arrival: Arrival;
  reduceMotion: boolean | null;
  rowCount: 4 | 5;
}) {
  const rowRef = useSyncedNowBlink(arrival.now);

  return (
    <m.div
      animate={{ opacity: 1 }}
      className={cn(
        "grid min-h-0 flex-[0_0_18.675cqh] grid-cols-[8.6cqw_minmax(0,1fr)_16cqw_17cqw] items-center gap-x-[1cqw] rounded-[var(--radius-panel)] bg-[var(--panel)] px-[2.4cqw] text-[var(--white)]",
        destinationTextClass(rowCount),
        rowCount === 5 && "basis-[15.25cqh]",
        arrival.now &&
        "motion-reduce:animate-none motion-reduce:bg-white motion-reduce:text-[#181818] animate-[now-blink_1.5s_infinite]",
      )}
      data-arrival-id={arrival.id}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      layout={reduceMotion ? false : "position"}
      ref={rowRef}
      transition={{
        opacity: {
          duration: reduceMotion ? 0 : enterDurationSeconds,
          ease: easeOut,
        },
        layout: {
          duration: reduceMotion ? 0 : layoutDurationSeconds,
          ease: easeOut,
        },
      }}
    >
      <LineBadge line={arrival.line} />
      <strong className="text-ellipsis whitespace-nowrap overflow-x-hidden">
        {arrival.destination}
      </strong>
      <strong className="justify-self-start">{arrival.cars ?? "—"}</strong>
      <SignArrivalTime
        className={cn(
          "justify-self-start [&>span:last-child]:text-[2.2cqw]",
          rowCount === 5 && "[&>span:last-child]:text-[1.8cqw]",
        )}
        value={arrival.arrival}
      />
    </m.div>
  );
}
