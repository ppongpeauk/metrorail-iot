"use client";

import { LineBadge } from "@/components/shared/line-badge";
import { OverflowMarquee } from "@/components/shared/overflow-marquee";
import { SignArrivalTime } from "@/components/arrivals/sign-arrival-time";
import { useSyncedNowBlink } from "@/components/shared/use-synced-now-blink";
import { useWideArrivalScroll } from "@/components/arrivals/use-wide-arrival-scroll";
import { ALERT_VISIBLE_MS } from "@/lib/alert-contract";
import type { Arrival } from "@/lib/display-data";
import { cn } from "@/lib/utils";

const DESTINATION_TEXT_CLASS = "text-[24cqh]";

export function WideArrivalsDisplay({
  alert,
  alertType,
  arrivals,
  onAlertComplete,
}: {
  alert?: string | null;
  alertType?: "service" | "facility";
  arrivals: Arrival[];
  onAlertComplete?: () => void;
}) {
  const {
    atEnd,
    endTransform,
    instant,
    leadArrival,
    scrollDurationMs,
    scrollingArrivals,
  } = useWideArrivalScroll(arrivals, Boolean(alert));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--sign-space)]" aria-live="polite">
      {leadArrival && <WideArrivalRow arrival={leadArrival} lead />}
      {alert && (
        <div
          className={cn(
            "flex min-h-0 flex-1 items-center gap-[7cqh] rounded-[var(--radius-panel)] px-[2.4cqw] leading-none",
            DESTINATION_TEXT_CLASS,
            alertType === "facility"
              ? "bg-[var(--panel)] text-white"
              : "bg-[#fff6c9] text-[#111]",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-[25cqh] flex-none place-items-center rounded-full text-[17cqh]",
              alertType === "facility"
                ? "bg-white text-[#111]"
                : "bg-[#111] text-white",
            )}
          >
            !
          </span>
          <OverflowMarquee
            className="min-w-0 flex-1"
            contentClassName="font-bold"
            gap={48}
            nonScrollingDelayMs={ALERT_VISIBLE_MS}
            onComplete={onAlertComplete}
            repeat={!onAlertComplete}
          >
            {alert.replace(/\s*\n+\s*/g, " ")}
          </OverflowMarquee>
        </div>
      )}
      {!alert && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "flex h-full flex-col gap-[var(--sign-space)] transition-transform ease-linear motion-reduce:transition-none",
              instant && "!transition-none",
            )}
            style={{
              transform: atEnd ? endTransform : undefined,
              transitionDuration: `${scrollDurationMs}ms`,
            }}
          >
            {scrollingArrivals.map((arrival) => (
              <WideArrivalRow arrival={arrival} key={arrival.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WideArrivalRow({
  arrival,
  lead = false,
}: {
  arrival: Arrival;
  lead?: boolean;
}) {
  const rowRef = useSyncedNowBlink(arrival.now);

  return (
    <div
      className={cn(
        "grid min-h-full grid-cols-[30cqh_minmax(0,1fr)_55cqh] items-center gap-x-[7cqh] rounded-[var(--radius-panel)] bg-[var(--panel)] px-[2.4cqw] text-[var(--white)]",
        lead ? "min-h-0 flex-[1_1_0]" : "flex-[0_0_100%]",
        arrival.now &&
        "motion-reduce:animate-none motion-reduce:bg-white motion-reduce:text-[#181818] animate-[now-blink_1.5s_infinite]",
      )}
      ref={rowRef}
    >
      <LineBadge className="size-[28cqh] text-[13cqh]" line={arrival.line} />
      <strong
        className={cn(
          "overflow-hidden text-ellipsis whitespace-nowrap overflow-x-hidden",
          DESTINATION_TEXT_CLASS,
        )}
      >
        {arrival.destination}
      </strong>
      <SignArrivalTime
        className="justify-self-end gap-[2.5cqh] text-[24cqh] [&>span:last-child]:text-[9cqh]"
        value={arrival.arrival}
      />
    </div>
  );
}
