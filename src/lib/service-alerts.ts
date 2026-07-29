import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import type { TransitAlert } from "@/lib/alert-contract";
import { APP_CONFIG } from "@/lib/config";
import { getAlertStationContext } from "@/lib/gtfs";
import {
  FORMAT_PROMPT_VERSION,
  alertTypeForSource,
  generateFormattedText,
  openAISettings,
  type AlertFormatInput,
  type FormattedTextResult,
} from "@/lib/service-alert-formatting";
import {
  alertAppliesToStation,
  decodeAlertFeed,
  englishText,
  isAlertActive,
  type AlertStationContext,
  type RawEntitySelector,
  type RawAlertFeed,
} from "@/lib/service-alert-feed";
import { WMATA_CONFIG, wmataApiHeaders } from "@/lib/wmata";

export {
  alertAppliesToStation,
  decodeAlertFeed,
  isAlertActive,
} from "@/lib/service-alert-feed";
export {
  alertTypeForSource,
  sanitizeGeneratedAlertText,
} from "@/lib/service-alert-formatting";
export type {
  AlertStationContext,
  RawEntitySelector,
} from "@/lib/service-alert-feed";
export type { FormattedTextResult } from "@/lib/service-alert-formatting";

type FormatCacheEntry = {
  promise: Promise<string>;
  usedAt: number;
};

type AlertCandidate = {
  id: string;
  hash: string;
  severity: number;
  input: AlertFormatInput;
};

export type AlertTextCache = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
};

type RedisClient = RedisClientType;

const formattedTextCache = new Map<string, FormatCacheEntry>();
let feedCache: { expiresAt: number; value: RawAlertFeed } | null = null;
let feedLoad: Promise<RawAlertFeed> | null = null;
let redisClientPromise: Promise<RedisClient | null> | null = null;
let redisRetryAfter = 0;
let lastRedisErrorLogAt = 0;

export function sourceHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pruneFormatCache(): void {
  if (
    formattedTextCache.size <= APP_CONFIG.cache.formattedTextCacheLimit
  ) {
    return;
  }
  const oldest = [...formattedTextCache.entries()].sort(
    (left, right) => left[1].usedAt - right[1].usedAt,
  );
  for (const [hash] of oldest.slice(
    0,
    formattedTextCache.size - APP_CONFIG.cache.formattedTextCacheLimit,
  )) {
    formattedTextCache.delete(hash);
  }
}

function logRedisError(context: string, reason: unknown): void {
  const now = Date.now();
  if (now - lastRedisErrorLogAt < APP_CONFIG.cache.redisErrorLogIntervalMs) {
    return;
  }
  lastRedisErrorLogAt = now;
  console.error(
    `Could not ${context} the Redis alert text cache.`,
    reason instanceof Error ? reason.message : reason,
  );
}

async function connectRedis(url: string): Promise<RedisClient | null> {
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: (retries) =>
        retries >= 2 ? false : Math.min(250 * 2 ** retries, 1_000),
    },
  });
  client.on("error", (reason) => logRedisError("connect to", reason));

  try {
    await client.connect();
    return client;
  } catch (reason: unknown) {
    client.destroy();
    redisClientPromise = null;
    redisRetryAfter = Date.now() + APP_CONFIG.cache.redisRetryDelayMs;
    logRedisError("connect to", reason);
    return null;
  }
}

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url || Date.now() < redisRetryAfter) {
    return null;
  }
  if (redisClientPromise) {
    const existing = await redisClientPromise;
    if (existing?.isOpen) return existing;
    redisClientPromise = null;
  }
  redisClientPromise = connectRedis(url);
  return redisClientPromise;
}

export function redisAlertTextCacheKey(hash: string): string {
  return `metrorail-live:alert-text:${FORMAT_PROMPT_VERSION}:${hash}`;
}

export async function readThroughAlertTextCache({
  cache,
  cacheKey,
  generate,
}: {
  cache: AlertTextCache | null;
  cacheKey: string;
  generate: () => Promise<FormattedTextResult>;
}): Promise<string> {
  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached !== null) return cached;
    } catch (reason: unknown) {
      logRedisError("read from", reason);
    }
  }

  const generated = await generate();
  if (cache && generated.cacheable) {
    try {
      await cache.set(cacheKey, generated.text);
    } catch (reason: unknown) {
      logRedisError("write to", reason);
    }
  }
  return generated.text;
}

async function persistentFormattedText(
  hash: string,
  input: AlertFormatInput,
): Promise<string> {
  const client = await getRedisClient();
  const cacheKey = redisAlertTextCacheKey(hash);
  const cache: AlertTextCache | null = client
    ? {
        get: (key) => client.get(key),
        set: async (key, value) => {
          await client.set(key, value, {
            EX: APP_CONFIG.cache.redisAlertTextTtlSeconds,
          });
        },
      }
    : null;
  return readThroughAlertTextCache({
    cache,
    cacheKey,
    generate: () => generateFormattedText(input),
  });
}

function cachedFormattedText(
  hash: string,
  input: AlertFormatInput,
): Promise<string> {
  const cached = formattedTextCache.get(hash);
  if (cached) {
    cached.usedAt = Date.now();
    return cached.promise;
  }

  const entry = {
    promise: persistentFormattedText(hash, input),
    usedAt: Date.now(),
  };
  formattedTextCache.set(hash, entry);
  void entry.promise.catch(() => {
    if (formattedTextCache.get(hash)?.promise === entry.promise) {
      formattedTextCache.delete(hash);
    }
  });
  pruneFormatCache();
  return entry.promise;
}

async function loadAlertFeed(): Promise<RawAlertFeed> {
  const response = await fetch(WMATA_CONFIG.alertsUrl, {
    headers: wmataApiHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(APP_CONFIG.network.requestTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`WMATA alerts returned HTTP ${response.status}.`);
  }
  return decodeAlertFeed(new Uint8Array(await response.arrayBuffer()));
}

async function getAlertFeed(): Promise<RawAlertFeed> {
  if (feedCache && feedCache.expiresAt > Date.now()) {
    return feedCache.value;
  }
  if (!feedLoad) {
    feedLoad = loadAlertFeed().then((value) => {
      feedCache = {
        value,
        expiresAt: Date.now() + APP_CONFIG.cache.alertFeedMs,
      };
      return value;
    });
  }
  try {
    return await feedLoad;
  } finally {
    feedLoad = null;
  }
}

function routeIdsForSelectors(selectors: RawEntitySelector[]): string[] {
  return [
    ...new Set(
      selectors
        .map(({ routeId }) => routeId?.trim())
        .filter((routeId): routeId is string => Boolean(routeId)),
    ),
  ];
}

type AlertEntity = RawAlertFeed["entity"][number];

function candidateForAlert(
  entity: AlertEntity,
  context: AlertStationContext,
  nowSeconds: number,
  formatSettings: ReturnType<typeof openAISettings>,
): AlertCandidate | null {
  const { alert, id } = entity;
  if (!alert) return null;

  const selectors = alert.informedEntity;
  if (
    !isAlertActive(alert.activePeriod, nowSeconds) ||
    !alertAppliesToStation(selectors, context)
  ) {
    return null;
  }

  const header = englishText(alert.headerText);
  const description = englishText(alert.descriptionText);
  const sourceText = description || header;
  if (!sourceText) return null;

  let routeIds = routeIdsForSelectors(selectors);
  const type = alertTypeForSource(alert.effect, `${header}\n${description}`);
  if (
    type === "service" &&
    !routeIds.length &&
    selectors.some(({ stopId }) => Boolean(stopId))
  ) {
    routeIds = context.routeIds;
  }

  const hash = sourceHash(
    JSON.stringify({
      baseURL: formatSettings.baseURL,
      model: formatSettings.model,
      prompt: FORMAT_PROMPT_VERSION,
      header,
      description,
      routeIds,
      type,
    }),
  );
  return {
    id: id || hash,
    hash,
    severity: alert.severityLevel ?? 0,
    input: {
      description,
      header,
      routeIds,
      sourceText,
      type,
    },
  };
}

function uniqueCandidates(candidates: AlertCandidate[]): AlertCandidate[] {
  return [
    ...new Map(candidates.map((candidate) => [candidate.hash, candidate]))
      .values(),
  ].sort((left, right) => right.severity - left.severity);
}

function fetchedAtForFeed(feed: RawAlertFeed): string {
  const timestampSeconds = Number(feed.header.timestamp);
  return Number.isFinite(timestampSeconds) && timestampSeconds > 0
    ? new Date(timestampSeconds * 1000).toISOString()
    : new Date().toISOString();
}

export async function getServiceAlerts(
  stationQuery: string,
): Promise<{ alerts: TransitAlert[]; fetchedAt: string }> {
  const formatSettings = openAISettings();
  const [feed, context] = await Promise.all([
    getAlertFeed(),
    getAlertStationContext(stationQuery),
  ]);
  const nowSeconds = Date.now() / 1000;
  const candidates = feed.entity
    .map((entity) =>
      candidateForAlert(entity, context, nowSeconds, formatSettings),
    )
    .filter((candidate): candidate is AlertCandidate => candidate !== null);
  const sortedCandidates = uniqueCandidates(candidates);
  const alerts = await Promise.all(
    sortedCandidates.map(async ({ hash, id, input }) => ({
      id,
      sourceHash: hash,
      text: await cachedFormattedText(hash, input),
      type: input.type,
    })),
  );

  return {
    alerts,
    fetchedAt: fetchedAtForFeed(feed),
  };
}
