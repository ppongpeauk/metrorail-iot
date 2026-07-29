import { APP_CONFIG } from "@/lib/config";

export type TransitAlert = {
  id: string;
  sourceHash: string;
  text: string;
  type: "service" | "facility";
};

export type AlertsResponse = {
  alerts: TransitAlert[];
  fetchedAt: string;
};

export const ALERT_VISIBLE_MS = APP_CONFIG.alerts.visibleMs;
export const ALERT_HIDDEN_MS = APP_CONFIG.alerts.hiddenMs;
export const ALERT_SCROLL_HOLD_MS = APP_CONFIG.alerts.scrollHoldMs;

export function alertRotationDelayMs(
  visible: boolean,
  completionDriven: boolean,
): number | null {
  if (visible && completionDriven) return null;
  return visible ? ALERT_VISIBLE_MS : ALERT_HIDDEN_MS;
}

export async function fetchTransitAlerts(
  station: string,
): Promise<AlertsResponse> {
  const response = await fetch(
    `/api/alerts?station=${encodeURIComponent(station)}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
    },
  );
  const payload = (await response.json()) as AlertsResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Request returned ${response.status}`);
  }
  return payload;
}

export function alertRotationAtElapsed(
  alerts: TransitAlert[],
  elapsedMs: number,
): TransitAlert | null {
  if (!alerts.length) return null;
  const cycleMs = ALERT_VISIBLE_MS + ALERT_HIDDEN_MS;
  const safeElapsedMs = Math.max(0, elapsedMs);
  const phaseMs = safeElapsedMs % cycleMs;
  if (phaseMs >= ALERT_VISIBLE_MS) return null;
  const index = Math.floor(safeElapsedMs / cycleMs) % alerts.length;
  return alerts[index];
}
