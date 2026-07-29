"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrivalRow } from "@/components/arrivals/arrival-row";
import type { Arrival } from "@/lib/display-data";

const easeOut = [0.22, 1, 0.36, 1] as const;

function AnimatedArrivalContent({
  arrival,
  departing,
  promoted,
  reduceMotion,
}: {
  arrival: Arrival;
  departing: boolean;
  promoted: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <m.div
      animate={{ opacity: departing ? 0 : 1 }}
      className="col-start-1 row-start-1"
      data-lead-arrival-id={arrival.id}
      data-lead-departing={departing || undefined}
      exit={{
        opacity: 0,
        transition: { duration: 0 },
      }}
      initial={{ opacity: promoted ? 1 : 0 }}
      transition={{
        duration: reduceMotion || departing ? 0 : 0.18,
        ease: easeOut,
      }}
    >
      <ArrivalRow arrival={arrival} />
    </m.div>
  );
}

export function AnimatedArrivalSlot({
  arrival,
  announce = false,
  departing = false,
  promoted = false,
}: {
  arrival: Arrival | null;
  announce?: boolean;
  departing?: boolean;
  promoted?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="grid h-[var(--arrival-slot-height)] min-h-[var(--arrival-slot-height)] flex-none overflow-hidden [&>div]:h-full [&>div]:min-h-[var(--arrival-slot-height)] [&>div]:w-full"
      aria-live={announce ? "polite" : undefined}
    >
      <AnimatePresence initial={false} mode="wait">
        {arrival && (
          <AnimatedArrivalContent
            arrival={arrival}
            departing={departing}
            key={arrival.id}
            promoted={promoted}
            reduceMotion={reduceMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
