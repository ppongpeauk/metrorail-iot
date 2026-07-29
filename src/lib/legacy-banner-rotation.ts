import type { TransitAlert } from "@/lib/alert-contract";
import { LEGACY_PIDS_ROTATION_ANNOUNCEMENTS } from "@/lib/arrival-contract";
import { APP_CONFIG } from "@/lib/config";

export const LEGACY_BANNER_GAP_MS = APP_CONFIG.alerts.legacyBannerGapMs;

type LegacyBanner = {
  id: string;
  kind: "alert" | "information";
  text: string;
};

export type LegacyBannerRotation = {
  banner: LegacyBanner;
  lastAlertId: string | null;
  lastInformationIndex: number | null;
};

function alertBanner(alert: TransitAlert): LegacyBanner {
  return {
    id: `alert:${alert.id}:${alert.sourceHash}`,
    kind: "alert",
    text: alert.text,
  };
}

function informationBanner(index: number): LegacyBanner {
  return {
    id: `information:${index}`,
    kind: "information",
    text: LEGACY_PIDS_ROTATION_ANNOUNCEMENTS[index],
  };
}

function nextAlert(
  alerts: TransitAlert[],
  lastAlertId: string | null,
): TransitAlert {
  const previousIndex = alerts.findIndex(
    (alert) => alert.id === lastAlertId,
  );
  return alerts[(previousIndex + 1) % alerts.length];
}

function nextInformationIndex(lastInformationIndex: number | null): number {
  return (
    ((lastInformationIndex ?? -1) + 1) %
    LEGACY_PIDS_ROTATION_ANNOUNCEMENTS.length
  );
}

export function createLegacyBannerRotation(
  alerts: TransitAlert[],
): LegacyBannerRotation {
  const alert = alerts[0];
  if (alert) {
    return {
      banner: alertBanner(alert),
      lastAlertId: alert.id,
      lastInformationIndex: null,
    };
  }

  return {
    banner: informationBanner(0),
    lastAlertId: null,
    lastInformationIndex: 0,
  };
}

export function advanceLegacyBannerRotation(
  current: LegacyBannerRotation,
  alerts: TransitAlert[],
): LegacyBannerRotation {
  if (current.banner.kind === "information" && alerts.length) {
    const alert = nextAlert(alerts, current.lastAlertId);
    return {
      banner: alertBanner(alert),
      lastAlertId: alert.id,
      lastInformationIndex: current.lastInformationIndex,
    };
  }

  const informationIndex = nextInformationIndex(
    current.lastInformationIndex,
  );
  return {
    banner: informationBanner(informationIndex),
    lastAlertId: current.lastAlertId,
    lastInformationIndex: informationIndex,
  };
}
