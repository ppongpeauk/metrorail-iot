"use client";

import { m, useReducedMotion } from "motion/react";
import { AnimatedArrivalRows } from "@/components/arrivals/animated-arrival-rows";
import { ArrivalHead } from "@/components/arrivals/arrival-head";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { OverflowMarquee } from "@/components/shared/overflow-marquee";
import type { DisplayState } from "@/lib/display-data";
import { cn } from "@/lib/utils";

export function AlertDisplay({
  display,
  showHeader = true,
}: {
  display: Extract<DisplayState, { kind: "alert" }>;
  showHeader?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {showHeader && <Header alert title={display.stationName} />}
      <m.section
        animate={{ opacity: 1, scale: 1, y: "0cqh" }}
        className={cn(
          "my-[var(--sign-space)] flex min-h-[31cqh] flex-none items-start gap-[3.1cqw] rounded-[var(--radius-panel)] px-[4cqw] py-[2cqh] text-[4.35cqw] leading-[1.06]",
          display.alertType === "facility"
            ? "bg-[var(--panel)] text-white"
            : "bg-[#fff6c9] text-[#111]",
        )}
        initial={
          reduceMotion
            ? false
            : { opacity: 0, scale: 0.94, y: "1.4cqh" }
        }
        transition={{
          delay: reduceMotion ? 0 : 0.08,
          duration: reduceMotion ? 0 : 0.55,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[8cqw] flex-none place-items-center rounded-full text-[5.4cqw]",
            display.alertType === "facility"
              ? "bg-white text-[#111]"
              : "bg-[#111] text-white",
          )}
        >
          !
        </span>
        <OverflowMarquee
          axis="vertical"
          className="min-h-0 flex-1 self-stretch"
          contentClassName="whitespace-pre-line font-bold"
          gap={28}
          preserveNewlines
        >
          {display.alert}
        </OverflowMarquee>
      </m.section>
      <ArrivalHead />
      <AnimatedArrivalRows
        arrivals={display.arrivals.slice(0, 4)}
        className="min-h-0 flex-none gap-[var(--sign-space)] overflow-hidden"
        motionStyle="alert"
        rowClassName="min-h-[6.45cqh]"
      />
      <Footer />
    </>
  );
}
