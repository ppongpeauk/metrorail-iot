"use client";

import { LineBadge } from "@/components/shared/line-badge";
import { useSyncedNowBlink } from "@/components/shared/use-synced-now-blink";
import type { Arrival } from "@/lib/display-data";
import { cn } from "@/lib/utils";

const ARRIVAL_DESTINATION_TEXT_CLASS = "text-[3.15cqw]";

export function ArrivalRow({
  arrival,
  className,
}: {
  arrival: Arrival;
  className?: string;
}) {
  const rowRef = useSyncedNowBlink(arrival.now);

  return (
    <div
      className={cn(
        "grid min-h-[6.35cqh] flex-none grid-cols-[var(--content-after-panel-inset)_minmax(0,1fr)_var(--trailing-column-width)] items-center rounded-[var(--radius-panel)] bg-[var(--panel)] px-[var(--panel-inline-inset)] py-[var(--panel-padding-block)] text-[var(--white)]",
        arrival.now &&
          "motion-reduce:animate-none motion-reduce:bg-white motion-reduce:text-[#181818] animate-[now-blink_1.5s_infinite]",
        className,
      )}
      ref={rowRef}
    >
      <LineBadge line={arrival.line} />
      <div className="flex min-w-0 flex-col">
        <strong className="overflow-hidden text-[4.5cqw] text-ellipsis whitespace-nowrap">
          {arrival.direction}
        </strong>
        <span
          className={cn(
            "overflow-hidden leading-[1.2] text-ellipsis whitespace-nowrap",
            ARRIVAL_DESTINATION_TEXT_CLASS,
          )}
        >
          to {arrival.destination}
        </span>
      </div>
      <strong className="self-start justify-self-start text-[4.5cqw] leading-[1.2] whitespace-nowrap">
        {arrival.arrival}
      </strong>
    </div>
  );
}
