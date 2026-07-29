"use client";

import {
  AnimatePresence,
  LayoutGroup,
  m,
  useReducedMotion,
} from "motion/react";
import { ArrivalRow } from "@/components/arrivals/arrival-row";
import type { Arrival } from "@/lib/display-data";
import { cn } from "@/lib/utils";

const enterDurationSeconds = 0.18;
const layoutDurationSeconds = 0.35;
const easeOut = [0.22, 1, 0.36, 1] as const;

function AnimatedArrivalRowShell({
  arrival,
  index,
  motionStyle,
  rowClassName,
  reduceMotion,
}: {
  arrival: Arrival;
  index: number;
  motionStyle: "fade" | "alert";
  rowClassName?: string;
  reduceMotion: boolean | null;
}) {
  const alertMotion = motionStyle === "alert" && !reduceMotion;
  const horizontalDirection = index % 2 === 0 ? -1 : 1;

  return (
    <m.div
      animate={{ opacity: 1, scale: 1, x: "0cqw" }}
      className="w-full min-h-[6.35cqh] flex-none overflow-hidden"
      exit={{
        opacity: 0,
        scale: alertMotion ? 0.96 : 1,
        x: alertMotion ? `${horizontalDirection * -3.2}cqw` : "0cqw",
      }}
      initial={{
        opacity: 0,
        scale: alertMotion ? 0.96 : 1,
        x: alertMotion ? `${horizontalDirection * 3.2}cqw` : "0cqw",
      }}
      layout={reduceMotion ? false : "position"}
      transition={{
        opacity: {
          delay: alertMotion ? 0.18 + index * 0.07 : 0,
          duration: reduceMotion ? 0 : enterDurationSeconds,
          ease: easeOut,
        },
        scale: {
          delay: alertMotion ? 0.18 + index * 0.07 : 0,
          duration: reduceMotion ? 0 : 0.42,
          ease: easeOut,
        },
        x: {
          delay: alertMotion ? 0.18 + index * 0.07 : 0,
          duration: reduceMotion ? 0 : 0.5,
          ease: easeOut,
        },
        layout: {
          duration: reduceMotion ? 0 : layoutDurationSeconds,
          ease: easeOut,
        },
      }}
    >
      <ArrivalRow arrival={arrival} className={rowClassName} />
    </m.div>
  );
}

export function AnimatedArrivalRows({
  arrivals,
  className,
  motionStyle = "fade",
  rowClassName,
}: {
  arrivals: Arrival[];
  className?: string;
  motionStyle?: "fade" | "alert";
  rowClassName?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup>
      <div aria-live="polite" className={cn("flex flex-col", className)}>
        <AnimatePresence initial mode="popLayout">
          {arrivals.map((arrival, index) => (
            <AnimatedArrivalRowShell
              arrival={arrival}
              index={index}
              key={arrival.id}
              motionStyle={motionStyle}
              rowClassName={rowClassName}
              reduceMotion={reduceMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
