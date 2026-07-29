import type { OccupancyStatus } from "@/lib/arrival-contract";
import { APP_CONFIG } from "@/lib/config";

export type Line = "RD" | "YL" | "GR" | "BL" | "OR" | "SV";

export type Arrival = {
  id: string;
  tripId: string;
  line: Line;
  direction: string;
  destination: string;
  arrival: string;
  now: boolean;
  cars: number | null;
  occupancyStatus: OccupancyStatus | null;
};

export type Station = {
  id?: string;
  name: string;
  lines?: Line[];
  facility?: "H" | "P";
  selected?: boolean;
  muted?: boolean;
};

export const ROUTE_VISIBLE_ROWS = APP_CONFIG.display.routeVisibleRows;
export const LINE_PROGRESS_ARRIVAL_SLOTS =
  APP_CONFIG.display.lineProgressArrivalSlots;

type StationDisplay = {
  id: string;
  kind: "station";
  stationName: string;
  arrivals: Arrival[];
  lead: Arrival | null;
  routeLine: Line | null;
  stations: Station[];
  later: Arrival[];
  routesByTrip: Record<
    string,
    {
      routeLine: Line;
      stations: Station[];
    }
  >;
};

type AlertDisplay = {
  id: string;
  kind: "alert";
  stationName: string;
  alert: string;
  alertType: "service" | "facility";
  arrivals: Arrival[];
};

type EmergencyDisplay = {
  id: "emergency";
  kind: "emergency";
  stationName: string;
  message: string;
  direction: "left" | "right";
};

export type DisplayState =
  | StationDisplay
  | AlertDisplay
  | EmergencyDisplay;

export type DisplayConfig =
  | {
      id: "columbia" | "lenfant";
      kind: "station";
      stationName: string;
      stopId: string;
    }
  | {
      id: "elevator";
      kind: "alert";
      stationName: string;
      stopId: string;
      alert: string;
    };

type ApiStation = {
  id: string;
  code: string;
  name: string;
};

export type StationOption = ApiStation;

export type GtfsArrival = {
  tripId: string;
  stopId: string;
  routeId: string;
  route: string;
  destination: string;
  directionId: string | null;
  scheduledTime: string;
  predictedTime: string;
  minutesText: string;
  vehicleLicensePlate: string | null;
  occupancyStatus: OccupancyStatus | null;
  isRealtime: boolean;
  delaySeconds: number | null;
  upcomingStops: Array<{
    id: string;
    name: string;
    routeIds: string[];
  }>;
};

type ArrivalsResponse = {
  station: ApiStation;
  arrivals: GtfsArrival[];
  fetchedAt: string;
};

export const defaultDisplayConfigs: DisplayConfig[] = [
  {
    id: "columbia",
    kind: "station",
    stationName: "Columbia Heights",
    stopId: "STN_E04",
  },
  {
    id: "elevator",
    kind: "alert",
    stationName: "College Park-U of Md",
    stopId: "STN_E09",
    alert:
      "Elevator outage at YL GR U St, for elevator access stop at Columbia Heights or Shaw-Howard U",
  },
  {
    id: "lenfant",
    kind: "station",
    stationName: "L’Enfant Plaza",
    stopId: "STN_D03_F03",
  },
];

const emergencyDisplay: EmergencyDisplay = {
  id: "emergency",
  kind: "emergency",
  stationName: "Emergency",
  message: "Please exit\nthe station.",
  direction: "left",
};

export function applyStationToDisplays(
  displayConfigs: DisplayConfig[],
  station: { stationName: string; stopId: string },
): DisplayConfig[] {
  return displayConfigs.map((config) => ({ ...config, ...station }));
}

function linesForRouteText(value: string): Line[] {
  const route = value.toUpperCase();
  const patterns: Array<[Line, RegExp]> = [
    ["RD", /\bRED\b|\bRD\b/],
    ["YL", /\bYELLOW\b|\bYL\b/],
    ["GR", /\bGREEN\b|\bGR\b/],
    ["BL", /\bBLUE\b|\bBL\b/],
    ["OR", /\bORANGE\b|\bOR\b/],
    ["SV", /\bSILVER\b|\bSV\b/],
  ];
  return patterns.flatMap(([line, pattern]) =>
    pattern.test(route) ? [line] : [],
  );
}

function lineForArrival(arrival: GtfsArrival): Line | null {
  return (
    linesForRouteText(`${arrival.routeId} ${arrival.route}`)[0] ?? null
  );
}

function directionFor(
  line: Line,
  directionId: string | null,
): string {
  const northSouth = line === "RD" || line === "YL" || line === "GR";
  if (directionId === "1") {
    return northSouth ? "Southbound" : "Westbound";
  }
  return northSouth ? "Northbound" : "Eastbound";
}

function carCountFromLicensePlate(
  licensePlate: string | null,
): number | null {
  const match = licensePlate?.match(/^(\d+)_/);
  if (!match) return null;

  const carCount = Number(match[1]);
  return Number.isSafeInteger(carCount) && carCount > 0
    ? carCount
    : null;
}

function arrivalStatusPriority(arrival: string): number {
  if (arrival === "BRD") return 0;
  if (arrival === "ARR" || arrival === "Now") return 1;
  return 2;
}

export function adaptGtfsArrivals(
  rawArrivals: GtfsArrival[],
): Arrival[] {
  const arrivals = new Map<string, Arrival>();
  for (const raw of rawArrivals) {
    if (!raw.isRealtime) continue;
    const line = lineForArrival(raw);
    if (!line) continue;
    const now =
      raw.minutesText === "Now" ||
      raw.minutesText === "ARR" ||
      raw.minutesText === "BRD";
    const arrival: Arrival = {
      id: raw.tripId,
      tripId: raw.tripId,
      line,
      direction: directionFor(line, raw.directionId),
      destination: raw.destination || "Unknown",
      arrival: raw.minutesText,
      now,
      cars: carCountFromLicensePlate(raw.vehicleLicensePlate),
      occupancyStatus: raw.occupancyStatus,
    };
    const previous = arrivals.get(raw.tripId);
    if (!previous || (arrival.now && !previous.now)) {
      arrivals.set(raw.tripId, arrival);
    }
  }
  return [...arrivals.values()].sort(
    (left, right) =>
      arrivalStatusPriority(left.arrival) -
      arrivalStatusPriority(right.arrival),
  );
}

export function transferLines(
  routeIds: string[],
  routeLine: Line,
): Line[] {
  const candidates = routeIds.flatMap(linesForRouteText);
  return [...new Set(candidates)].filter((line) => line !== routeLine);
}

export function arrivalsForDisplay(display: DisplayState): Arrival[] {
  if (display.kind === "station") return display.arrivals;
  if (display.kind === "alert") return display.arrivals;
  return [];
}

export function stationDisplayWithArrivals(
  display: Extract<DisplayState, { kind: "station" }>,
  arrivals: Arrival[],
): Extract<DisplayState, { kind: "station" }> {
  const lead = arrivals[0] ?? null;
  const route = lead ? display.routesByTrip[lead.tripId] : null;
  return {
    ...display,
    arrivals,
    lead,
    later: arrivals.slice(1),
    routeLine: route?.routeLine ?? null,
    stations: route?.stations ?? [],
  };
}

export function filterDisplayByDirection(
  display: DisplayState,
  direction: string | null,
): DisplayState {
  if (!direction || display.kind === "emergency") return display;
  const arrivals = arrivalsForDisplay(display).filter(
    (arrival) => arrival.direction === direction,
  );
  if (display.kind === "station") {
    return stationDisplayWithArrivals(display, arrivals);
  }
  return { ...display, arrivals };
}

export function upcomingStations(
  rawStops: GtfsArrival["upcomingStops"],
  selectedStopId: string,
  routeLine: Line,
): Station[] {
  const unique = new Map<string, Station>();
  for (const stop of rawStops) {
    if (unique.has(stop.id)) continue;
    unique.set(stop.id, {
      id: stop.id,
      name: stop.name.split(",")[0],
      lines: transferLines(stop.routeIds, routeLine),
      selected: isSameStation(stop.id, selectedStopId),
    });
  }

  const stations = [...unique.values()];
  const selectedIndex = stations.findIndex((station) => station.selected);
  stations.forEach((station, index) => {
    station.muted = selectedIndex >= 0 && index < selectedIndex;
  });
  return stations;
}

export function routeWindowStart(
  stations: Station[],
  visibleRows = ROUTE_VISIBLE_ROWS,
): number {
  const selectedIndex = stations.findIndex((station) => station.selected);
  const preferredStart = Math.max(0, selectedIndex - 1);
  const latestFullWindowStart = Math.max(0, stations.length - visibleRows);
  return Math.min(preferredStart, latestFullWindowStart);
}

function stationCodes(stopId: string): string[] {
  return stopId.match(/[A-Z]\d{2}/g) ?? [];
}

export function stationOptionCode(
  station: StationOption,
  activeCode: string,
): string {
  const codes = [...new Set(
    [station.code, station.id].flatMap(stationCodes),
  )];
  const normalizedActiveCode = activeCode.trim().toUpperCase();
  return codes.includes(normalizedActiveCode)
    ? normalizedActiveCode
    : (codes[0] ?? station.code);
}

function isSameStation(leftStopId: string, rightStopId: string): boolean {
  if (leftStopId === rightStopId) return true;
  const rightCodes = new Set(stationCodes(rightStopId));
  return stationCodes(leftStopId).some((code) => rightCodes.has(code));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request returned ${response.status}`);
  }
  return payload;
}

async function fetchArrivals(stopId: string): Promise<ArrivalsResponse> {
  return fetchJson<ArrivalsResponse>(
    `/api/arrivals?station=${encodeURIComponent(stopId)}`,
  );
}

export async function listStationOptions(): Promise<StationOption[]> {
  const { stations } = await fetchJson<{ stations: StationOption[] }>(
    "/api/stations",
  );
  return stations;
}

export async function resolveStationCode(
  value: string,
): Promise<{ stationName: string; stopId: string }> {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]\d{2}$/.test(code)) {
    throw new Error("Enter a three-character station code such as D03.");
  }

  const { stations } = await fetchJson<{ stations: ApiStation[] }>(
    "/api/stations",
  );
  const station = stations.find(
    (candidate) =>
      [candidate.code, candidate.id]
        .flatMap(stationCodes)
        .some((candidateCode) => candidateCode === code),
  );
  if (!station) {
    throw new Error(`No WMATA station was found for code ${code}.`);
  }
  return {
    stopId: station.id,
    stationName: station.name.split(",")[0],
  };
}

export async function getDisplayStates(
  displayConfigs: DisplayConfig[] = defaultDisplayConfigs,
): Promise<DisplayState[]> {
  const responses = new Map<string, Promise<ArrivalsResponse>>();
  for (const config of displayConfigs) {
    if (!responses.has(config.stopId)) {
      responses.set(config.stopId, fetchArrivals(config.stopId));
    }
  }

  const displays = await Promise.all(
    displayConfigs.map(async (config): Promise<DisplayState> => {
      const response = await responses.get(config.stopId)!;
      const arrivals = adaptGtfsArrivals(response.arrivals);
      if (config.kind === "alert") {
        return {
          id: config.id,
          kind: config.kind,
          stationName: response.station.name,
          alert: config.alert,
          alertType: "facility",
          arrivals: arrivals.slice(0, 9),
        };
      }

      const routesByTrip: Extract<
        DisplayState,
        { kind: "station" }
      >["routesByTrip"] = {};
      for (const arrival of arrivals) {
        const raw = response.arrivals.find(
          (candidate) =>
            candidate.tripId === arrival.tripId &&
            candidate.upcomingStops.length > 0,
        );
        if (!raw) continue;
        routesByTrip[arrival.tripId] = {
          routeLine: arrival.line,
          stations: upcomingStations(
            raw.upcomingStops,
            response.station.id,
            arrival.line,
          ),
        };
      }
      const stationDisplay: Extract<
        DisplayState,
        { kind: "station" }
      > = {
        id: config.id,
        kind: config.kind,
        stationName: response.station.name,
        arrivals: arrivals.slice(0, 10),
        lead: null,
        routeLine: null,
        stations: [],
        later: [],
        routesByTrip,
      };
      return stationDisplayWithArrivals(
        stationDisplay,
        stationDisplay.arrivals,
      );
    }),
  );
  return [...displays, emergencyDisplay];
}
