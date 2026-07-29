/**
 * Shared runtime values for the display and its data clients.
 *
 * Keeping timings, cache windows, and browser storage keys together makes it
 * possible to change the service cadence without hunting through UI, API, and
 * feed-ingestion modules independently.
 */
export const APP_CONFIG = {
  defaultStation: {
    code: "C01",
    name: "Metro Center",
  },
  client: {
    pollingIntervalMs: 20_000,
    stationOptionsStaleTimeMs: 60 * 60 * 1000,
  },
  network: {
    requestTimeoutMs: 10_000,
  },
  cache: {
    staticFeedMs: 6 * 60 * 60 * 1000,
    realtimeFeedMs: 20_000,
    alertFeedMs: 20_000,
    maxRealtimeAgeMs: 90_000,
    maxRealtimeFutureSkewMs: 15_000,
    maxFeedSkewMs: 30_000,
    arrivalPastToleranceMs: 30_000,
    arrivalWindowMs: 3 * 60 * 60 * 1000,
    delayedThresholdMs: 5 * 60 * 1000,
    formattedTextCacheLimit: 256,
    redisAlertTextTtlSeconds: 30 * 24 * 60 * 60,
    redisRetryDelayMs: 30_000,
    redisErrorLogIntervalMs: 60_000,
  },
  display: {
    routeVisibleRows: 9,
    lineProgressArrivalSlots: 9,
    wideArrivalLimit: 5,
    wideScrollSecondsPerRow: 3,
    wideScrollStartPauseMs: 5_000,
    wideScrollEndPauseMs: 5_000,
    controlsIdleHideDelayMs: 3_500,
  },
  alerts: {
    visibleMs: 10_000,
    hiddenMs: 60_000,
    scrollHoldMs: 3_000,
    legacyBannerGapMs: 2 * 60_000,
  },
  storageKeys: {
    displayMode: "metrorail-live:display-mode",
    operatorSettings: "metrorail-live:operator-settings",
  },
  httpCacheControl: {
    noStore: "private, no-store",
    stations:
      "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
  },
} as const;
