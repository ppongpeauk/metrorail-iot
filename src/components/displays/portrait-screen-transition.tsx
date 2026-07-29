"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { AlertDisplay } from "@/components/alerts/alert-display";
import { FullArrivalsDisplay } from "@/components/arrivals/full-arrivals-display";
import { Header } from "@/components/layout/header";
import { NetworkMapDisplay } from "@/components/displays/network-map-display";
import { StationDisplay } from "@/components/stations/station-display";
import { arrivalsForDisplay, type DisplayState } from "@/lib/display-data";
import type { DisplayMode } from "@/lib/display-mode";

type PortraitDisplayState = Exclude<
  DisplayState,
  { kind: "emergency" }
>;

const pageDurationSeconds = 0.65;
const pageEase = [0.22, 1, 0.36, 1] as const;

const pageVariants = {
  center: {
    filter: "blur(0px)",
    opacity: 1,
    scale: 1,
    x: "0cqw",
  },
  exit: (direction: number) => ({
    filter: "blur(2px)",
    opacity: 0,
    scale: 0.975,
    x: `${direction * -4.5}cqw`,
  }),
};

function PortraitPage({
  display,
  mode,
}: {
  display: PortraitDisplayState;
  mode: DisplayMode;
}) {
  if (display.kind === "alert") {
    return <AlertDisplay display={display} showHeader={false} />;
  }

  const arrivals = arrivalsForDisplay(display);
  if (mode === "network-map") {
    return (
      <NetworkMapDisplay
        arrivals={arrivals}
        showHeader={false}
        stationName={display.stationName}
      />
    );
  }
  if (mode === "full-arrivals") {
    return (
      <FullArrivalsDisplay
        arrivals={arrivals}
        showHeader={false}
        stationName={display.stationName}
      />
    );
  }
  return <StationDisplay display={display} showHeader={false} />;
}

export function PortraitScreenTransition({
  display,
  mode,
}: {
  display: PortraitDisplayState;
  mode: DisplayMode;
}) {
  const reduceMotion = useReducedMotion();
  const direction = display.kind === "alert" ? 1 : -1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title={display.stationName} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence
          custom={direction}
          initial={false}
          mode="sync"
        >
          <m.div
            animate="center"
            className="absolute inset-0 flex min-h-0 flex-col"
            data-portrait-page={display.kind}
            exit={reduceMotion ? { opacity: 0 } : "exit"}
            initial={
              reduceMotion
                ? false
                : {
                    filter: "blur(2px)",
                    opacity: 0,
                    scale: 0.975,
                    x: `${direction * 4.5}cqw`,
                  }
            }
            key={`${display.kind}:${display.id}`}
            transition={{
              duration: reduceMotion ? 0 : pageDurationSeconds,
              ease: pageEase,
            }}
            variants={pageVariants}
          >
            <PortraitPage display={display} mode={mode} />
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
