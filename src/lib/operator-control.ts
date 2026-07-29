import type { DisplayState } from "@/lib/display-data";
import type { TransitAlert } from "@/lib/alert-contract";
import { LEGACY_PIDS_ROTATION_ANNOUNCEMENTS } from "@/lib/arrival-contract";

export type OperatingScenario =
  | "normal"
  | "service-alert"
  | "facility-alert"
  | "emergency";

export type OverrideScope = "screen" | "station" | "line" | "system";

export type ScreenLocation = "entrance" | "mezzanine" | "platform";

export type OperatorSettings = {
  scenario: OperatingScenario;
  scope: OverrideScope;
  location: ScreenLocation;
  serviceMessage: string;
  facilityMessage: string;
  emergencyMessage: string;
  exitDirection: "left" | "right";
};

export const defaultOperatorSettings: OperatorSettings = {
  scenario: "normal",
  scope: "screen",
  location: "platform",
  serviceMessage:
    "Trains are operating every 12 minutes due to scheduled track work.",
  facilityMessage:
    "Elevator outage at YL GR U St, for elevator access stop at Columbia Heights or Shaw-Howard U.",
  emergencyMessage: "Please exit\nthe station.",
  exitDirection: "left",
};

export const operatingScenarios: Array<{
  id: OperatingScenario;
  title: string;
  priority: number;
}> = [
  { id: "normal", title: "Automatic", priority: 0 },
  { id: "service-alert", title: "Service change", priority: 1 },
  { id: "facility-alert", title: "Facility outage", priority: 2 },
  { id: "emergency", title: "Emergency takeover", priority: 3 },
];

export const screenLocations: Array<{
  id: ScreenLocation;
  title: string;
}> = [
  { id: "entrance", title: "Entrance" },
  { id: "mezzanine", title: "Mezzanine" },
  { id: "platform", title: "Platform" },
];

export const overrideScopes: Array<{
  id: OverrideScope;
  title: string;
}> = [
  { id: "screen", title: "This screen" },
  { id: "station", title: "Entire station" },
  { id: "line", title: "Affected line" },
  { id: "system", title: "Systemwide" },
];

export const exitDirections: Array<{
  id: OperatorSettings["exitDirection"];
  title: string;
}> = [
  { id: "left", title: "Left" },
  { id: "right", title: "Right" },
];

function isOperatingScenario(
  value: unknown,
): value is OperatingScenario {
  return operatingScenarios.some(({ id }) => id === value);
}

function isOverrideScope(value: unknown): value is OverrideScope {
  return overrideScopes.some(({ id }) => id === value);
}

function isScreenLocation(value: unknown): value is ScreenLocation {
  return screenLocations.some(({ id }) => id === value);
}

export function parseOperatorSettings(value: string | null): OperatorSettings {
  if (!value) return defaultOperatorSettings;
  try {
    const saved = JSON.parse(value) as Partial<OperatorSettings>;
    return {
      scenario: isOperatingScenario(saved.scenario)
        ? saved.scenario
        : defaultOperatorSettings.scenario,
      scope: isOverrideScope(saved.scope)
        ? saved.scope
        : defaultOperatorSettings.scope,
      location: isScreenLocation(saved.location)
        ? saved.location
        : defaultOperatorSettings.location,
      serviceMessage:
        typeof saved.serviceMessage === "string"
          ? saved.serviceMessage
          : defaultOperatorSettings.serviceMessage,
      facilityMessage:
        typeof saved.facilityMessage === "string"
          ? saved.facilityMessage
          : defaultOperatorSettings.facilityMessage,
      emergencyMessage:
        typeof saved.emergencyMessage === "string"
          ? saved.emergencyMessage
          : defaultOperatorSettings.emergencyMessage,
      exitDirection:
        saved.exitDirection === "left" || saved.exitDirection === "right"
          ? saved.exitDirection
          : defaultOperatorSettings.exitDirection,
    };
  } catch {
    return defaultOperatorSettings;
  }
}

export function messageForScenario(settings: OperatorSettings): string {
  if (settings.scenario === "service-alert") {
    return settings.serviceMessage;
  }
  if (settings.scenario === "facility-alert") {
    return settings.facilityMessage;
  }
  if (settings.scenario === "emergency") {
    return settings.emergencyMessage;
  }
  return LEGACY_PIDS_ROTATION_ANNOUNCEMENTS[0];
}

export function resolveOperatorDisplay(
  displays: DisplayState[],
  settings: OperatorSettings,
  alertOverride?: TransitAlert | null,
): DisplayState | null {
  const stationDisplay = displays.find(
    (display): display is Extract<DisplayState, { kind: "station" }> =>
      display.kind === "station",
  );
  if (settings.scenario === "emergency") {
    const emergencyDisplay = displays.find(
      (display): display is Extract<DisplayState, { kind: "emergency" }> =>
        display.kind === "emergency",
    );
    if (!emergencyDisplay) return null;
    return {
      ...emergencyDisplay,
      message: settings.emergencyMessage,
      direction: settings.exitDirection,
    };
  }

  if (alertOverride) {
    const alertTemplate = displays.find(
      (display): display is Extract<DisplayState, { kind: "alert" }> =>
        display.kind === "alert",
    );
    if (!stationDisplay && !alertTemplate) return null;
    return {
      id: `alert:${alertOverride.id}`,
      kind: "alert",
      stationName: stationDisplay?.stationName ?? alertTemplate!.stationName,
      alert: alertOverride.text,
      alertType: alertOverride.type,
      arrivals: stationDisplay?.arrivals ?? alertTemplate!.arrivals,
    };
  }

  if (alertOverride === null || settings.scenario === "normal") {
    return stationDisplay ?? null;
  }

  const alertDisplay = displays.find(
    (display): display is Extract<DisplayState, { kind: "alert" }> =>
      display.kind === "alert",
  );
  if (!alertDisplay) return null;
  return {
    ...alertDisplay,
    alert:
      settings.scenario === "facility-alert"
        ? settings.facilityMessage
        : settings.serviceMessage,
    alertType: settings.scenario === "facility-alert" ? "facility" : "service",
  };
}
