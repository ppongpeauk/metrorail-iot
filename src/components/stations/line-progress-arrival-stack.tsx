"use client";

import {
  AnimatePresence,
  LayoutGroup,
  m,
  useReducedMotion,
} from "motion/react";
import { ArrivalRow } from "@/components/arrivals/arrival-row";
import {
  type Arrival,
  LINE_PROGRESS_ARRIVAL_SLOTS,
} from "@/lib/display-data";
import { cn } from "@/lib/utils";

const layoutDurationSeconds = 0.35;
const exitDurationSeconds = 0.18;
const easeOut = [0.22, 1, 0.36, 1] as const;

function LineProgressArrival({
  arrival,
  reduceMotion,
}: {
  arrival: Arrival;
  reduceMotion: boolean | null;
}) {
  const variants = {
    exit: (promotedArrivalId: string | null) => ({
      opacity: 0,
      transition: {
        opacity: {
          duration:
            reduceMotion || arrival.id === promotedArrivalId
              ? 0
              : exitDurationSeconds,
        },
      },
    }),
  };

  return (
    <m.div
      className="h-[var(--arrival-slot-height)] min-h-[var(--arrival-slot-height)] w-full flex-none overflow-hidden"
      data-arrival-id={arrival.id}
      exit="exit"
      layout={reduceMotion ? false : "position"}
      transition={{
        opacity: {
          duration: reduceMotion ? 0 : exitDurationSeconds,
        },
        layout: {
          duration: reduceMotion ? 0 : layoutDurationSeconds,
          ease: easeOut,
        },
      }}
      variants={variants}
    >
      <ArrivalRow
        arrival={arrival}
        className="h-full min-h-0"
      />
    </m.div>
  );
}

export function LineProgressArrivalStack({
  arrivals,
  expanded,
  promotedArrivalId,
}: {
  arrivals: Arrival[];
  expanded: boolean;
  promotedArrivalId: string | null;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup>
      <div
        aria-label="Following arrivals"
        className={cn(
          "t-resize flex flex-none flex-col overflow-hidden",
          expanded
            ? "h-[var(--line-progress-expanded-list-height)]"
            : "h-[var(--line-progress-collapsed-list-height)]",
        )}
        data-visible-arrival-slots={LINE_PROGRESS_ARRIVAL_SLOTS}
      >
        <div className="flex flex-none flex-col gap-[var(--sign-space)]">
          <AnimatePresence
            custom={promotedArrivalId}
            initial={false}
            mode="popLayout"
          >
            {arrivals.map((arrival) => (
              <LineProgressArrival
                arrival={arrival}
                key={arrival.id}
                reduceMotion={reduceMotion}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}
