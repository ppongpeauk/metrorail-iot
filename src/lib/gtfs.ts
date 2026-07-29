import AdmZip from "adm-zip";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  occupancyStatuses,
  occupancySymbolCount,
  type OccupancyStatus,
} from "@/lib/arrival-contract";
import { APP_CONFIG } from "@/lib/config";
import { WMATA_CONFIG, wmataApiHeaders } from "@/lib/wmata";

const TIME_ZONE = "America/New_York";

type CsvRow = Record<string, string>;

export type GtfsStation = {
  id: string;
  code: string;
  name: string;
  stopIds: string[];
};

type StaticStopTime = {
  stopId: string;
  arrivalSeconds: number;
  departureSeconds: number;
  stopSequence: number;
};

type StaticTrip = {
  tripId: string;
  routeId: string;
  route: string;
  destination: string;
  directionId: string | null;
  serviceId: string;
  stopTimes: StaticStopTime[];
};

type StaticFeed = {
  loadedAt: string;
  stations: GtfsStation[];
  trips: StaticTrip[];
  activeServiceIds: Set<string>;
  serviceDate: string;
  calendarFileUsed: boolean;
  calendarDatesFileUsed: boolean;
  stationByStopId: Map<string, GtfsStation>;
  routeIdsByStationId: Map<string, string[]>;
};

type RealtimeUpdate = {
  predictedEpochSeconds: number | null;
  delaySeconds: number | null;
  canceled: boolean;
  timestampSeconds: number | null;
};

type RealtimeFeed = {
  fetchedAt: string;
  serviceDate: string;
  tripUpdatesTimestampSeconds: number | null;
  vehiclePositionsTimestampSeconds: number | null;
  updates: Map<string, RealtimeUpdate>;
  canceledTrips: Map<string, number | null>;
  statusByTripStop: Map<string, VehicleStopObservation>;
  vehicleLicensePlateByTrip: Map<string, string>;
  occupancyStatusByTrip: Map<string, OccupancyStatus>;
  vehiclePositionsAvailable: boolean;
  vehiclePositionsError: string | null;
};

export type VehicleStopStatus = "IN_TRANSIT_TO" | "ARR" | "BRD";

export type VehicleStopObservation = {
  status: VehicleStopStatus;
  timestampSeconds: number | null;
};

let staticCache: { expiresAt: number; value: StaticFeed } | null = null;
let staticLoad: Promise<StaticFeed> | null = null;
let realtimeCache: { expiresAt: number; value: RealtimeFeed } | null = null;
let realtimeLoad: Promise<RealtimeFeed> | null = null;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) =>
    headers.reduce<CsvRow>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
}

function parseSeconds(value: string): number | null {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestampSeconds(
  value: object | null | undefined,
  fallback: number | null,
): number | null {
  if (!value || !Object.hasOwn(value, "timestamp")) return fallback;
  const timestamp = toNumber((value as { timestamp?: unknown }).timestamp);
  return timestamp !== null && timestamp > 0 ? timestamp : fallback;
}

export function isFreshRealtimeTimestamp(
  timestamp: number | null,
  nowMs: number,
): boolean {
  if (timestamp === null) return false;
  const timestampMs = timestamp * 1000;
  return (
    timestampMs >= nowMs - APP_CONFIG.cache.maxRealtimeAgeMs &&
    timestampMs <= nowMs + APP_CONFIG.cache.maxRealtimeFutureSkewMs
  );
}

function occupancyStatus(value: unknown): OccupancyStatus | null {
  const numericValue = toNumber(value);
  if (
    numericValue !== null &&
    numericValue >= 0 &&
    numericValue < occupancyStatuses.length
  ) {
    return occupancyStatuses[numericValue];
  }
  const textValue = String(value ?? "").toUpperCase();
  return occupancyStatuses.find((status) => status === textValue) ?? null;
}

function dateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not determine WMATA service date.");
  }
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function localHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value || 0) % 24;
}

function currentServiceDate(date = new Date()): string {
  const today = dateString(date);
  return localHour(date) < 5 ? shiftDate(today, -1) : today;
}

function timezoneOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const offset =
    parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return match[1] === "-" ? -minutes : minutes;
}

function serviceMidnight(serviceDate: string): Date {
  const utcGuess = new Date(`${serviceDate}T00:00:00Z`);
  return new Date(
    utcGuess.getTime() - timezoneOffsetMinutes(utcGuess) * 60_000,
  );
}

function scheduledEpoch(serviceDate: string, seconds: number): number {
  return serviceMidnight(serviceDate).getTime() + seconds * 1000;
}

function activeServices(
  calendarRows: CsvRow[],
  exceptionRows: CsvRow[],
  serviceDate: string,
): Set<string> {
  const date = new Date(`${serviceDate}T12:00:00Z`);
  const weekday = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][date.getUTCDay()];
  const compactDate = serviceDate.replaceAll("-", "");
  const active = new Set<string>();

  for (const row of calendarRows) {
    if (
      row.start_date <= compactDate &&
      row.end_date >= compactDate &&
      row[weekday] === "1"
    ) {
      active.add(row.service_id);
    }
  }
  for (const row of exceptionRows) {
    if (row.date !== compactDate) continue;
    if (row.exception_type === "1") active.add(row.service_id);
    if (row.exception_type === "2") active.delete(row.service_id);
  }
  return active;
}

function extract(zip: AdmZip, filename: string): string {
  const entry = zip.getEntry(filename);
  if (!entry) return "";
  return entry
    .getData()
    .toString("utf8")
    .replace(/^\uFEFF/, "");
}

function publicStationCode(row: CsvRow): string {
  return (row.stop_code || row.stop_id).replace(/^STN_/i, "");
}

async function loadStaticFeed(): Promise<StaticFeed> {
  const response = await fetch(WMATA_CONFIG.staticFeedUrl, {
    headers: wmataApiHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`WMATA static feed returned HTTP ${response.status}.`);
  }
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const stops = parseCsv(extract(zip, "stops.txt"));
  const tripsRows = parseCsv(extract(zip, "trips.txt"));
  const stopTimesRows = parseCsv(extract(zip, "stop_times.txt"));
  const routesRows = parseCsv(extract(zip, "routes.txt"));
  const calendarRows = parseCsv(extract(zip, "calendar.txt"));
  const exceptionRows = parseCsv(extract(zip, "calendar_dates.txt"));

  const now = new Date();
  const serviceDate = currentServiceDate(now);
  const activeServiceIds =
    calendarRows.length || exceptionRows.length
      ? activeServices(calendarRows, exceptionRows, serviceDate)
      : new Set(tripsRows.map((row) => row.service_id));
  const routeById = new Map(
    routesRows.map((row) => [
      row.route_id,
      row.route_short_name || row.route_long_name || row.route_id,
    ]),
  );
  const stopById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const stationRows = stops.filter((stop) => stop.location_type === "1");
  const stations: GtfsStation[] = [];

  for (const station of stationRows) {
    const stopIds = stops
      .filter((stop) => stop.parent_station === station.stop_id)
      .map((stop) => stop.stop_id);
    stations.push({
      id: station.stop_id,
      code: publicStationCode(station),
      name: station.stop_name,
      stopIds: stopIds.length > 0 ? stopIds : [station.stop_id],
    });
  }

  if (stations.length === 0) {
    const grouped = new Map<string, CsvRow[]>();
    for (const stop of stops) {
      const key = stop.parent_station || stop.stop_name || stop.stop_id;
      grouped.set(key, [...(grouped.get(key) || []), stop]);
    }
    for (const [id, group] of grouped) {
      const first = group[0];
      stations.push({
        id,
        code: publicStationCode(first),
        name: first.stop_name || id,
        stopIds: group.map((stop) => stop.stop_id),
      });
    }
  }

  const stopTimesByTrip = new Map<string, StaticStopTime[]>();
  for (const row of stopTimesRows) {
    const arrivalSeconds = parseSeconds(row.arrival_time);
    const departureSeconds = parseSeconds(
      row.departure_time || row.arrival_time,
    );
    if (arrivalSeconds === null || departureSeconds === null) continue;
    const stopSequence = Number(row.stop_sequence);
    const stopTime = {
      stopId: row.stop_id,
      arrivalSeconds,
      departureSeconds,
      stopSequence: Number.isFinite(stopSequence) ? stopSequence : 0,
    };
    stopTimesByTrip.set(row.trip_id, [
      ...(stopTimesByTrip.get(row.trip_id) || []),
      stopTime,
    ]);
  }

  const trips = tripsRows
    .filter((row) => activeServiceIds.has(row.service_id))
    .map((row) => ({
      tripId: row.trip_id,
      routeId: row.route_id,
      route: routeById.get(row.route_id) || row.route_id,
      destination: row.trip_headsign || "",
      directionId: row.direction_id || null,
      serviceId: row.service_id,
      stopTimes: (stopTimesByTrip.get(row.trip_id) || []).sort(
        (left, right) => left.stopSequence - right.stopSequence,
      ),
    }))
    .filter((trip) => trip.stopTimes.length > 0);

  const knownStopIds = new Set(stations.flatMap((station) => station.stopIds));
  const filteredTrips = trips.filter((trip) =>
    trip.stopTimes.some((stopTime) => knownStopIds.has(stopTime.stopId)),
  );
  const stationByStopId = new Map<string, GtfsStation>();
  for (const station of stations) {
    stationByStopId.set(station.id, station);
    for (const stopId of station.stopIds) {
      stationByStopId.set(stopId, station);
    }
  }
  const routeSetsByStationId = new Map<string, Set<string>>();
  for (const trip of filteredTrips) {
    for (const stopTime of trip.stopTimes) {
      const station = stationByStopId.get(stopTime.stopId);
      if (!station) continue;
      const routes = routeSetsByStationId.get(station.id) ?? new Set<string>();
      routes.add(trip.route);
      routes.add(trip.routeId);
      routeSetsByStationId.set(station.id, routes);
    }
  }

  return {
    loadedAt: now.toISOString(),
    stations: stations
      .filter((station) =>
        station.stopIds.some((stopId) => stopById.has(stopId)),
      )
      .sort((left, right) => left.name.localeCompare(right.name)),
    trips: filteredTrips,
    activeServiceIds,
    serviceDate,
    calendarFileUsed: calendarRows.length > 0,
    calendarDatesFileUsed: exceptionRows.length > 0,
    stationByStopId,
    routeIdsByStationId: new Map(
      [...routeSetsByStationId].map(([stationId, routes]) => [
        stationId,
        [...routes],
      ]),
    ),
  };
}

async function getStaticFeed(): Promise<StaticFeed> {
  const serviceDate = currentServiceDate();
  if (
    staticCache &&
    staticCache.expiresAt > Date.now() &&
    staticCache.value.serviceDate === serviceDate
  ) {
    return staticCache.value;
  }
  if (!staticLoad) {
    staticLoad = loadStaticFeed().then((value) => {
      staticCache = {
        value,
        expiresAt: Date.now() + APP_CONFIG.cache.staticFeedMs,
      };
      return value;
    });
  }
  try {
    return await staticLoad;
  } finally {
    staticLoad = null;
  }
}

async function loadRealtimeFeed(serviceDate: string): Promise<RealtimeFeed> {
  const fetchedAt = new Date().toISOString();
  const previous =
    realtimeCache?.value.serviceDate === serviceDate
      ? realtimeCache.value
      : null;
  const [tripUpdatesResult, vehiclePositionsResult] = await Promise.allSettled([
    fetch(WMATA_CONFIG.tripUpdatesUrl, {
      headers: wmataApiHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
    }),
    fetch(WMATA_CONFIG.vehiclePositionsUrl, {
      headers: wmataApiHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
    }),
  ]);
  if (tripUpdatesResult.status === "rejected") {
    throw tripUpdatesResult.reason;
  }
  const response = tripUpdatesResult.value;
  if (!response.ok) {
    throw new Error(`WMATA trip updates returned HTTP ${response.status}.`);
  }
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    Buffer.from(await response.arrayBuffer()),
  );
  let tripUpdatesTimestampSeconds = timestampSeconds(feed.header, null);
  let updates = new Map<string, RealtimeUpdate>();
  let canceledTrips = new Map<string, number | null>();

  if (
    previous &&
    !isRealtimeSnapshotCurrent(
      previous.tripUpdatesTimestampSeconds,
      tripUpdatesTimestampSeconds,
    )
  ) {
    tripUpdatesTimestampSeconds = previous.tripUpdatesTimestampSeconds;
    updates = previous.updates;
    canceledTrips = previous.canceledTrips;
  } else {
    const compactServiceDate = serviceDate.replaceAll("-", "");
    for (const entity of feed.entity || []) {
      const tripUpdate = entity.tripUpdate;
      const tripId = tripUpdate?.trip?.tripId;
      if (!tripUpdate || !tripId) continue;
      const startDate = tripUpdate.trip?.startDate?.trim();
      if (startDate && startDate !== compactServiceDate) continue;
      const updateTimestampSeconds = timestampSeconds(
        tripUpdate,
        tripUpdatesTimestampSeconds,
      );
      const tripRelationship = toNumber(tripUpdate.trip?.scheduleRelationship);
      const tripRelationshipText = String(
        tripUpdate.trip?.scheduleRelationship ?? "",
      ).toUpperCase();
      const tripCanceled =
        tripRelationship === 3 || tripRelationshipText.includes("CANCELED");
      if (tripCanceled) {
        canceledTrips.set(tripId, updateTimestampSeconds);
      }
      for (const stopUpdate of tripUpdate.stopTimeUpdate || []) {
        const stopId = stopUpdate.stopId?.trim() || null;
        const stopSequence = Object.hasOwn(stopUpdate, "stopSequence")
          ? toNumber(stopUpdate.stopSequence)
          : null;
        const key = realtimeStopKey(tripId, stopId, stopSequence);
        if (!key) continue;
        const relationship = toNumber(stopUpdate.scheduleRelationship);
        const relationshipText = String(
          stopUpdate.scheduleRelationship ?? "",
        ).toUpperCase();
        const canceled =
          tripCanceled ||
          relationship === 1 ||
          relationship === 3 ||
          relationshipText.includes("SKIPPED") ||
          relationshipText.includes("CANCELED");
        const absoluteArrival = toNumber(stopUpdate.arrival?.time);
        const absoluteDeparture = toNumber(stopUpdate.departure?.time);
        const delaySeconds =
          toNumber(stopUpdate.arrival?.delay) ??
          toNumber(stopUpdate.departure?.delay);
        const existing = updates.get(key);
        if (
          existing?.timestampSeconds != null &&
          updateTimestampSeconds !== null &&
          existing.timestampSeconds > updateTimestampSeconds
        ) {
          continue;
        }
        updates.set(key, {
          predictedEpochSeconds: absoluteArrival ?? absoluteDeparture,
          delaySeconds,
          canceled,
          timestampSeconds: updateTimestampSeconds,
        });
      }
    }
  }

  let vehiclePositionsAvailable = false;
  let vehiclePositionsError: string | null = null;
  let vehiclePositionsTimestampSeconds: number | null = null;
  let statusByTripStop = new Map<string, VehicleStopObservation>();
  let vehicleLicensePlateByTrip = new Map<string, string>();
  let occupancyStatusByTrip = new Map<string, OccupancyStatus>();
  try {
    if (vehiclePositionsResult.status === "rejected") {
      throw vehiclePositionsResult.reason;
    }
    const vehicleResponse = vehiclePositionsResult.value;
    if (!vehicleResponse.ok) {
      throw new Error(
        `WMATA vehicle positions returned HTTP ${vehicleResponse.status}.`,
      );
    }
    const vehicleFeed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        Buffer.from(await vehicleResponse.arrayBuffer()),
      );
    vehiclePositionsAvailable = true;
    vehiclePositionsTimestampSeconds = timestampSeconds(
      vehicleFeed.header,
      null,
    );
    if (
      previous &&
      !isRealtimeSnapshotCurrent(
        previous.vehiclePositionsTimestampSeconds,
        vehiclePositionsTimestampSeconds,
      )
    ) {
      vehiclePositionsTimestampSeconds =
        previous.vehiclePositionsTimestampSeconds;
      statusByTripStop = previous.statusByTripStop;
      vehicleLicensePlateByTrip = previous.vehicleLicensePlateByTrip;
      occupancyStatusByTrip = previous.occupancyStatusByTrip;
    } else {
      const compactServiceDate = serviceDate.replaceAll("-", "");
      for (const entity of vehicleFeed.entity || []) {
        const vehicle = entity.vehicle;
        const tripId = vehicle?.trip?.tripId;
        if (!vehicle || !tripId) continue;
        const startDate = vehicle.trip?.startDate?.trim();
        if (startDate && startDate !== compactServiceDate) continue;

        const licensePlate = vehicle.vehicle?.licensePlate?.trim();
        if (licensePlate) {
          vehicleLicensePlateByTrip.set(tripId, licensePlate);
        }
        const vehicleOccupancy = Object.hasOwn(vehicle, "occupancyStatus")
          ? occupancyStatus(vehicle.occupancyStatus)
          : null;
        const carriageOccupancies = (vehicle.multiCarriageDetails ?? [])
          .flatMap((carriage) => {
            if (!Object.hasOwn(carriage, "occupancyStatus")) return [];
            const status = occupancyStatus(carriage.occupancyStatus);
            return status ? [status] : [];
          })
          .sort(
            (left, right) =>
              occupancySymbolCount(right) - occupancySymbolCount(left),
          );
        const resolvedOccupancy = vehicleOccupancy ?? carriageOccupancies[0];
        if (resolvedOccupancy) {
          occupancyStatusByTrip.set(tripId, resolvedOccupancy);
        }
        if (!Object.hasOwn(vehicle, "currentStopSequence")) continue;

        const stopId = vehicle.stopId?.trim() || null;
        const stopSequence = toNumber(vehicle.currentStopSequence);
        const key = vehicleStopKey(tripId, stopId, stopSequence);
        if (!key) continue;
        const status = toNumber(vehicle.currentStatus);
        const statusText = String(vehicle.currentStatus ?? "").toUpperCase();
        const label =
          status === 0 || statusText.includes("INCOMING_AT")
            ? "ARR"
            : status === 1 || statusText.includes("STOPPED_AT")
              ? "BRD"
              : status === 2 || statusText.includes("IN_TRANSIT_TO")
                ? "IN_TRANSIT_TO"
                : null;
        if (!label) continue;
        const observation: VehicleStopObservation = {
          status: label,
          timestampSeconds: timestampSeconds(
            vehicle,
            vehiclePositionsTimestampSeconds,
          ),
        };
        const existing = statusByTripStop.get(key);
        if (
          existing?.timestampSeconds != null &&
          observation.timestampSeconds !== null &&
          existing.timestampSeconds > observation.timestampSeconds
        ) {
          continue;
        }
        statusByTripStop.set(key, observation);
      }
    }
  } catch (reason: unknown) {
    vehiclePositionsError =
      reason instanceof Error
        ? reason.message
        : "Vehicle positions feed unavailable.";
    if (previous) {
      vehiclePositionsTimestampSeconds =
        previous.vehiclePositionsTimestampSeconds;
      statusByTripStop = previous.statusByTripStop;
      vehicleLicensePlateByTrip = previous.vehicleLicensePlateByTrip;
      occupancyStatusByTrip = previous.occupancyStatusByTrip;
    }
  }

  return {
    fetchedAt,
    serviceDate,
    tripUpdatesTimestampSeconds,
    vehiclePositionsTimestampSeconds,
    updates,
    canceledTrips,
    statusByTripStop,
    vehicleLicensePlateByTrip,
    occupancyStatusByTrip,
    vehiclePositionsAvailable,
    vehiclePositionsError,
  };
}

async function getRealtimeFeed(serviceDate: string): Promise<RealtimeFeed> {
  if (
    realtimeCache &&
    realtimeCache.expiresAt > Date.now() &&
    realtimeCache.value.serviceDate === serviceDate
  ) {
    return realtimeCache.value;
  }
  if (!realtimeLoad) {
    realtimeLoad = loadRealtimeFeed(serviceDate).then((value) => {
      realtimeCache = {
        value,
        expiresAt: Date.now() + APP_CONFIG.cache.realtimeFeedMs,
      };
      return value;
    });
  }
  try {
    return await realtimeLoad;
  } finally {
    realtimeLoad = null;
  }
}

function resolveStation(
  stations: GtfsStation[],
  query: string,
): GtfsStation | null {
  const normalized = query.trim().toLocaleLowerCase();
  const withoutParentheses = normalized.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return (
    stations.find(
      (station) =>
        station.code.toLocaleLowerCase() === normalized ||
        station.id.toLocaleLowerCase() === normalized ||
        station.name.toLocaleLowerCase() === withoutParentheses,
    ) ||
    stations.find(
      (station) =>
        station.name.toLocaleLowerCase().includes(withoutParentheses) ||
        station.code.toLocaleLowerCase().includes(normalized),
    ) ||
    null
  );
}

export function arrivalMinutesText(
  epochMs: number,
  nowMs: number,
  vehicleStatus: VehicleStopStatus | undefined,
  delaySeconds: number | null,
): string {
  if (vehicleStatus === "ARR" || vehicleStatus === "BRD") {
    return vehicleStatus;
  }
  if (isDelayedArrival(delaySeconds)) return "DLY";
  const seconds = Math.round((epochMs - nowMs) / 1000);
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function freshVehicleStopStatus(
  observation: VehicleStopObservation | undefined,
  tripUpdateTimestampSeconds: number | null,
  nowMs: number,
): VehicleStopStatus | undefined {
  if (!observation || observation.timestampSeconds === null) {
    return undefined;
  }
  const observationMs = observation.timestampSeconds * 1000;
  if (
    observationMs < nowMs - APP_CONFIG.cache.maxRealtimeAgeMs ||
    observationMs > nowMs + APP_CONFIG.cache.maxRealtimeFutureSkewMs
  ) {
    return undefined;
  }
  if (
    tripUpdateTimestampSeconds !== null &&
    Math.abs(observationMs - tripUpdateTimestampSeconds * 1000) >
      APP_CONFIG.cache.maxFeedSkewMs
  ) {
    return undefined;
  }
  return observation.status;
}

export function isRealtimeSnapshotCurrent(
  previousTimestampSeconds: number | null,
  nextTimestampSeconds: number | null,
): boolean {
  if (previousTimestampSeconds === null) return true;
  return (
    nextTimestampSeconds !== null &&
    nextTimestampSeconds >= previousTimestampSeconds
  );
}

export function realtimeStopKey(
  tripId: string,
  stopId: string | null,
  stopSequence: number | null,
): string | null {
  if (stopId && stopSequence !== null) {
    return `${tripId}|${stopId}|${stopSequence}`;
  }
  if (stopId) return `${tripId}|${stopId}`;
  if (stopSequence !== null) return `${tripId}||${stopSequence}`;
  return null;
}

export function vehicleStopKey(
  tripId: string,
  stopId: string | null,
  stopSequence: number | null,
): string | null {
  if (stopSequence === null) return null;
  return realtimeStopKey(tripId, stopId, stopSequence);
}

export function isDelayedArrival(delaySeconds: number | null): boolean {
  return (
    delaySeconds !== null &&
    delaySeconds * 1000 >= APP_CONFIG.cache.delayedThresholdMs
  );
}

export function arrivalStatusPriority(minutesText: string): number {
  if (minutesText === "BRD") return 0;
  if (minutesText === "ARR" || minutesText === "Now") return 1;
  return 2;
}

export function isArrivalTimeEligible(
  predictedMs: number,
  nowMs: number,
  vehicleStatus: VehicleStopStatus | undefined,
): boolean {
  if (vehicleStatus === "IN_TRANSIT_TO" && predictedMs < nowMs) {
    return false;
  }
  return (
    predictedMs >= nowMs - APP_CONFIG.cache.arrivalPastToleranceMs &&
    predictedMs <= nowMs + APP_CONFIG.cache.arrivalWindowMs
  );
}

export async function listStations(): Promise<
  { id: string; code: string; name: string }[]
> {
  const feed = await getStaticFeed();
  return feed.stations.map(({ id, code, name }) => ({ id, code, name }));
}

export async function getAlertStationContext(query: string): Promise<{
  id: string;
  stopIds: string[];
  routeIds: string[];
}> {
  const feed = await getStaticFeed();
  const station = resolveStation(feed.stations, query);
  if (!station) {
    throw new Error(
      `Station "${query}" was not found. Use a station name or station code.`,
    );
  }
  return {
    id: station.id,
    stopIds: station.stopIds,
    routeIds: feed.routeIdsByStationId.get(station.id) ?? [],
  };
}

export async function getArrivals(query: string) {
  const staticFeed = await getStaticFeed();
  const station = resolveStation(staticFeed.stations, query);
  if (!station) {
    throw new Error(
      `Station "${query}" was not found. Use a station name or station code.`,
    );
  }

  let realtime: RealtimeFeed | null = null;
  let realtimeError: string | null = null;
  try {
    realtime = await getRealtimeFeed(staticFeed.serviceDate);
  } catch (reason: unknown) {
    realtimeError =
      reason instanceof Error ? reason.message : "Realtime feed unavailable.";
  }

  const now = Date.now();
  const stopIds = new Set(station.stopIds);
  const arrivals = [];

  for (const trip of staticFeed.trips) {
    for (const stopTime of trip.stopTimes) {
      if (!stopIds.has(stopTime.stopId)) continue;
      const scheduledMs = scheduledEpoch(
        staticFeed.serviceDate,
        stopTime.arrivalSeconds,
      );
      const exactStopKey = realtimeStopKey(
        trip.tripId,
        stopTime.stopId,
        stopTime.stopSequence,
      );
      const stopOnlyKey = realtimeStopKey(trip.tripId, stopTime.stopId, null);
      const sequenceOnlyKey = realtimeStopKey(
        trip.tripId,
        null,
        stopTime.stopSequence,
      );
      const updateCandidate =
        (exactStopKey ? realtime?.updates.get(exactStopKey) : undefined) ||
        (stopOnlyKey ? realtime?.updates.get(stopOnlyKey) : undefined) ||
        (sequenceOnlyKey
          ? realtime?.updates.get(sequenceOnlyKey)
          : undefined);
      const update =
        updateCandidate &&
        isFreshRealtimeTimestamp(updateCandidate.timestampSeconds, now)
          ? updateCandidate
          : undefined;
      const canceledTimestamp = realtime?.canceledTrips.get(trip.tripId);
      if (
        (canceledTimestamp !== undefined &&
          isFreshRealtimeTimestamp(canceledTimestamp, now)) ||
        update?.canceled
      ) {
        continue;
      }
      const vehicleObservation =
        (exactStopKey
          ? realtime?.statusByTripStop.get(exactStopKey)
          : undefined) ||
        (sequenceOnlyKey
          ? realtime?.statusByTripStop.get(sequenceOnlyKey)
          : undefined);
      const vehicleStatus = freshVehicleStopStatus(
        vehicleObservation,
        update?.timestampSeconds ?? null,
        now,
      );

      let predictedMs = scheduledMs;
      let isRealtime = vehicleStatus !== undefined;
      let delaySeconds: number | null = null;
      if (update) {
        isRealtime = true;
        delaySeconds = update.delaySeconds;
        if (update.predictedEpochSeconds !== null) {
          predictedMs = update.predictedEpochSeconds * 1000;
        } else if (update.delaySeconds !== null) {
          predictedMs = scheduledMs + update.delaySeconds * 1000;
        }
        if (delaySeconds === null) {
          delaySeconds = Math.round((predictedMs - scheduledMs) / 1000);
        }
      }

      // Static GTFS stop times are only the schedule baseline. Do not expose
      // a row unless this trip/stop has corresponding realtime evidence.
      if (!isRealtime) continue;

      if (!isArrivalTimeEligible(predictedMs, now, vehicleStatus)) {
        continue;
      }
      const upcomingStops = trip.stopTimes.flatMap((candidate) => {
        const upcomingStation = staticFeed.stationByStopId.get(
          candidate.stopId,
        );
        return upcomingStation
          ? [
              {
                id: upcomingStation.id,
                name: upcomingStation.name,
                routeIds:
                  staticFeed.routeIdsByStationId.get(upcomingStation.id) ??
                  [],
              },
            ]
          : [];
      });
      arrivals.push({
        tripId: trip.tripId,
        stopId: stopTime.stopId,
        routeId: trip.routeId,
        route: trip.route,
        destination: trip.destination,
        directionId: trip.directionId,
        scheduledTime: new Date(scheduledMs).toISOString(),
        predictedTime: new Date(predictedMs).toISOString(),
        minutesText: arrivalMinutesText(
          predictedMs,
          now,
          vehicleStatus,
          delaySeconds,
        ),
        vehicleLicensePlate:
          realtime?.vehicleLicensePlateByTrip.get(trip.tripId) ?? null,
        occupancyStatus:
          realtime?.occupancyStatusByTrip.get(trip.tripId) ?? null,
        isRealtime,
        delaySeconds,
        upcomingStops,
      });
    }
  }

  arrivals.sort(
    (left, right) => {
      const statusDifference =
        arrivalStatusPriority(left.minutesText) -
        arrivalStatusPriority(right.minutesText);
      if (statusDifference !== 0) return statusDifference;
      return (
        new Date(left.predictedTime).getTime() -
        new Date(right.predictedTime).getTime()
      );
    },
  );

  return {
    station: { id: station.id, code: station.code, name: station.name },
    arrivals: arrivals.slice(0, 60),
    fetchedAt: new Date().toISOString(),
    calendar: {
      serviceDate: staticFeed.serviceDate,
      activeServiceCount: staticFeed.activeServiceIds.size,
      calendarFileUsed: staticFeed.calendarFileUsed,
      calendarDatesFileUsed: staticFeed.calendarDatesFileUsed,
    },
    realtime: {
      available: realtime !== null,
      error: realtimeError || realtime?.vehiclePositionsError || null,
      fetchedAt: realtime?.fetchedAt || null,
      vehiclePositionsAvailable: realtime?.vehiclePositionsAvailable || false,
      tripUpdatesTimestamp:
        realtime?.tripUpdatesTimestampSeconds !== null &&
        realtime?.tripUpdatesTimestampSeconds !== undefined
          ? new Date(
              realtime.tripUpdatesTimestampSeconds * 1000,
            ).toISOString()
          : null,
      vehiclePositionsTimestamp:
        realtime?.vehiclePositionsTimestampSeconds !== null &&
        realtime?.vehiclePositionsTimestampSeconds !== undefined
          ? new Date(
              realtime.vehiclePositionsTimestampSeconds * 1000,
            ).toISOString()
          : null,
    },
  };
}
