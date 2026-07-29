"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { AnimatedArrivalSlot } from "@/components/arrivals/animated-arrival-slot";
import { ArrivalHead } from "@/components/arrivals/arrival-head";
import { Header } from "@/components/layout/header";
import { LineProgressArrivalStack } from "@/components/stations/line-progress-arrival-stack";
import { LineProgressRoute } from "@/components/stations/line-progress-route";
import type { DisplayState } from "@/lib/display-data";

type StationDisplayState = Extract<DisplayState, { kind: "station" }>;

const departureDurationMs = 1_000;

function usePresentedDisplay(display: StationDisplayState) {
  const reduceMotion = useReducedMotion();
  const [presentedDisplay, setPresentedDisplay] = useState(display);
  const [departingLeadId, setDepartingLeadId] = useState<string | null>(null);
  const [promotedLeadId, setPromotedLeadId] = useState<string | null>(null);
  const presentedRef = useRef(display);
  const pendingRef = useRef<StationDisplayState | null>(null);
  const departureTimerRef = useRef<number | null>(null);
  const promotionFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const presentedLeadId = presentedRef.current.lead?.id ?? null;
    const presentedLeadStillExists = presentedLeadId
      ? display.arrivals.some((arrival) => arrival.id === presentedLeadId)
      : false;

    if (departureTimerRef.current !== null) {
      if (!presentedLeadStillExists) {
        pendingRef.current = display;
        return;
      }

      window.clearTimeout(departureTimerRef.current);
      departureTimerRef.current = null;
      pendingRef.current = null;
      setDepartingLeadId(null);
    }

    const leadWasRemoved =
      presentedLeadId !== null &&
      display.lead?.id !== presentedLeadId &&
      !presentedLeadStillExists;

    if (leadWasRemoved && !reduceMotion) {
      pendingRef.current = display;
      setDepartingLeadId(presentedLeadId);
      departureTimerRef.current = window.setTimeout(() => {
        const pendingDisplay = pendingRef.current;
        if (pendingDisplay) {
          const nextLeadId = pendingDisplay.lead?.id ?? null;
          const promoted = presentedRef.current.later.some(
            (arrival) => arrival.id === nextLeadId,
          );
          presentedRef.current = pendingDisplay;
          setPromotedLeadId(promoted ? nextLeadId : null);
          setPresentedDisplay(pendingDisplay);
          promotionFrameRef.current = window.requestAnimationFrame(() => {
            setPromotedLeadId(null);
            promotionFrameRef.current = null;
          });
        }
        pendingRef.current = null;
        departureTimerRef.current = null;
        setDepartingLeadId(null);
      }, departureDurationMs);
      return;
    }

    presentedRef.current = display;
    setPresentedDisplay(display);
    setDepartingLeadId(null);
  }, [display, reduceMotion]);

  useEffect(
    () => () => {
      if (departureTimerRef.current !== null) {
        window.clearTimeout(departureTimerRef.current);
      }
      if (promotionFrameRef.current !== null) {
        window.cancelAnimationFrame(promotionFrameRef.current);
      }
    },
    [],
  );

  return {
    departing: presentedDisplay.lead?.id === departingLeadId,
    display: presentedDisplay,
    promotedLeadId,
  };
}

export function StationDisplay({
  display,
  showHeader = true,
}: {
  display: StationDisplayState;
  showHeader?: boolean;
}) {
  const [routeExpanded, setRouteExpanded] = useState(false);
  const presented = usePresentedDisplay(display);
  const visibleDisplay = presented.display;
  const route =
    visibleDisplay.lead &&
    visibleDisplay.routeLine &&
    visibleDisplay.stations.length
      ? {
          tripId: visibleDisplay.lead.tripId,
          routeLine: visibleDisplay.routeLine,
          stations: visibleDisplay.stations,
        }
      : null;

  return (
    <>
      {showHeader && <Header title={visibleDisplay.stationName} />}
      <ArrivalHead />
      <AnimatedArrivalSlot
        announce
        arrival={visibleDisplay.lead}
        departing={presented.departing}
        promoted={visibleDisplay.lead?.id === presented.promotedLeadId}
      />
      <LineProgressRoute
        collapsedSpacer={visibleDisplay.later.length > 0}
        onExpandedChange={setRouteExpanded}
        route={route}
      />
      <LineProgressArrivalStack
        arrivals={visibleDisplay.later}
        expanded={routeExpanded}
        promotedArrivalId={presented.promotedLeadId}
      />
    </>
  );
}
