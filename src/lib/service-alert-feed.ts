import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { sanitizeWmataAlertFeed } from "@/lib/gtfs-realtime-wire";

// gtfs-realtime-bindings is generated from Google's canonical GTFS-Realtime
// proto, so this app does not maintain a second, hand-copied schema.

type RawTimeRange = {
  start?: string;
  end?: string;
};

export type RawEntitySelector = {
  agencyId?: string;
  routeId?: string;
  routeType?: number;
  stopId?: string;
  directionId?: number;
};

type RawTranslation = {
  text: string;
  language?: string;
};

type RawAlert = {
  activePeriod: RawTimeRange[];
  informedEntity: RawEntitySelector[];
  cause?: number;
  effect?: number;
  severityLevel?: number;
  headerText?: { translation: RawTranslation[] };
  descriptionText?: { translation: RawTranslation[] };
};

export type RawAlertFeed = {
  header: { timestamp?: string };
  entity: Array<{
    id: string;
    alert?: RawAlert;
  }>;
};

export type AlertStationContext = {
  id: string;
  stopIds: string[];
  routeIds: string[];
};

type DecodedAlertFeed = ReturnType<
  typeof GtfsRealtimeBindings.transit_realtime.FeedMessage.decode
>;
type DecodedAlert = NonNullable<
  NonNullable<DecodedAlertFeed["entity"]>[number]["alert"]
>;

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function ownProperty<T extends object, K extends keyof T>(
  value: T,
  key: K,
): T[K] | undefined {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function normalizeTimeRange(
  range: NonNullable<DecodedAlert["activePeriod"]>[number],
): RawTimeRange {
  return {
    start: optionalString(ownProperty(range, "start")),
    end: optionalString(ownProperty(range, "end")),
  };
}

function normalizeSelector(
  selector: NonNullable<DecodedAlert["informedEntity"]>[number],
): RawEntitySelector {
  return {
    agencyId: ownProperty(selector, "agencyId") ?? undefined,
    routeId: ownProperty(selector, "routeId") ?? undefined,
    routeType: ownProperty(selector, "routeType") ?? undefined,
    stopId: ownProperty(selector, "stopId") ?? undefined,
    directionId: ownProperty(selector, "directionId") ?? undefined,
  };
}

function normalizeTranslations(
  value: DecodedAlert["headerText"] | DecodedAlert["descriptionText"],
): { translation: RawTranslation[] } | undefined {
  if (!value) return undefined;
  return {
    translation: (value.translation ?? []).map(({ text, language }) => ({
      text,
      language: language || undefined,
    })),
  };
}

function normalizeAlert(alert: DecodedAlert): RawAlert {
  return {
    activePeriod: (alert.activePeriod ?? []).map(normalizeTimeRange),
    informedEntity: (alert.informedEntity ?? []).map(normalizeSelector),
    cause: ownProperty(alert, "cause") ?? undefined,
    effect: ownProperty(alert, "effect") ?? undefined,
    severityLevel: ownProperty(alert, "severityLevel") ?? undefined,
    headerText: normalizeTranslations(alert.headerText),
    descriptionText: normalizeTranslations(alert.descriptionText),
  };
}

/** Decode a GTFS-Realtime alert feed using the official generated binding. */
export function decodeAlertFeed(bytes: Uint8Array): RawAlertFeed {
  let feed: DecodedAlertFeed;
  try {
    feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
  } catch (reason: unknown) {
    const sanitizedBytes = sanitizeWmataAlertFeed(bytes);
    if (sanitizedBytes.length === bytes.length) throw reason;
    feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(sanitizedBytes);
  }
  return {
    header: {
      timestamp: feed.header
        ? optionalString(ownProperty(feed.header, "timestamp"))
        : undefined,
    },
    entity: (feed.entity ?? []).map((entity) => ({
      id: entity.id,
      alert: entity.alert ? normalizeAlert(entity.alert) : undefined,
    })),
  };
}

export function englishText(
  value: RawAlert["headerText"] | RawAlert["descriptionText"],
): string {
  const translations = value?.translation ?? [];
  return (
    translations.find(({ language }) =>
      language?.toLowerCase().startsWith("en"),
    )?.text ??
    translations[0]?.text ??
    ""
  ).trim();
}

function stopCodes(value: string): string[] {
  return value.toUpperCase().match(/[A-Z]\d{2}/g) ?? [];
}

function sameStop(left: string, context: AlertStationContext): boolean {
  const normalizedLeft = left.toUpperCase();
  if (
    normalizedLeft === context.id.toUpperCase() ||
    context.stopIds.some((stopId) => stopId.toUpperCase() === normalizedLeft)
  ) {
    return true;
  }

  const stationCodes = new Set([
    ...stopCodes(context.id),
    ...context.stopIds.flatMap(stopCodes),
  ]);
  return stopCodes(normalizedLeft).some((code) => stationCodes.has(code));
}

export function alertAppliesToStation(
  selectors: RawEntitySelector[],
  context: AlertStationContext,
): boolean {
  if (!selectors.length) return true;
  const routeIds = new Set(context.routeIds.map((route) => route.toUpperCase()));

  return selectors.some((selector) => {
    if (selector.stopId && sameStop(selector.stopId, context)) return true;
    if (
      selector.routeId &&
      routeIds.has(selector.routeId.toUpperCase())
    ) {
      return true;
    }
    return (
      !selector.stopId &&
      !selector.routeId &&
      (Boolean(selector.agencyId) || selector.routeType !== undefined)
    );
  });
}

export function isAlertActive(
  activePeriods: RawTimeRange[],
  nowSeconds: number,
): boolean {
  if (!activePeriods.length) return true;
  return activePeriods.some(({ start, end }) => {
    const startSeconds = start === undefined ? null : Number(start);
    const endSeconds = end === undefined ? null : Number(end);
    return (
      (startSeconds === null || startSeconds <= nowSeconds) &&
      (endSeconds === null || endSeconds > nowSeconds)
    );
  });
}
