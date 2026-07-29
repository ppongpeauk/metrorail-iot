"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alertRotationDelayMs,
  type TransitAlert,
} from "@/lib/alert-contract";

type RotationState = {
  index: number;
  signature: string;
  visible: boolean;
};

export function useAlertRotation(
  alerts: TransitAlert[],
  { completionDriven = false }: { completionDriven?: boolean } = {},
): {
  alert: TransitAlert | null;
  completeAlert: () => void;
} {
  const signature = useMemo(
    () => alerts.map(({ id, sourceHash }) => `${id}:${sourceHash}`).join("|"),
    [alerts],
  );
  const [rotation, setRotation] = useState<RotationState>({
    index: 0,
    signature,
    visible: true,
  });
  const currentRotation = useMemo(
    () =>
      rotation.signature === signature
        ? rotation
        : { index: 0, signature, visible: true },
    [rotation, signature],
  );

  useEffect(() => {
    if (!alerts.length) return;
    const delay = alertRotationDelayMs(
      currentRotation.visible,
      completionDriven,
    );
    if (delay === null) return;
    const timer = window.setTimeout(() => {
      setRotation((stored) => {
        const current =
          stored.signature === signature
            ? stored
            : { index: 0, signature, visible: true };
        return current.visible
          ? { ...current, visible: false }
          : {
              index: (current.index + 1) % alerts.length,
              signature,
              visible: true,
            };
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [alerts.length, completionDriven, currentRotation, signature]);

  const completeAlert = useCallback(() => {
    if (!completionDriven) return;
    setRotation((stored) => {
      const current =
        stored.signature === signature
          ? stored
          : { index: 0, signature, visible: true };
      return current.visible ? { ...current, visible: false } : current;
    });
  }, [completionDriven, signature]);

  return {
    alert:
      alerts.length && currentRotation.visible
        ? alerts[currentRotation.index % alerts.length]
        : null,
    completeAlert,
  };
}
