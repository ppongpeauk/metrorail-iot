const DEFAULT_WMATA_URLS = {
  staticFeed: "https://api.wmata.com/gtfs/rail-gtfs-static.zip",
  tripUpdates: "https://api.wmata.com/gtfs/rail-gtfsrt-tripupdates.pb",
  vehiclePositions:
    "https://api.wmata.com/gtfs/rail-gtfsrt-vehiclepositions.pb",
  alerts: "https://api.wmata.com/gtfs/rail-gtfsrt-alerts.pb",
} as const;

export const WMATA_CONFIG = {
  staticFeedUrl:
    process.env.WMATA_GTFS_STATIC_URL || DEFAULT_WMATA_URLS.staticFeed,
  tripUpdatesUrl:
    process.env.WMATA_GTFS_TRIP_UPDATES_URL || DEFAULT_WMATA_URLS.tripUpdates,
  vehiclePositionsUrl:
    process.env.WMATA_GTFS_VEHICLE_POSITIONS_URL ||
    DEFAULT_WMATA_URLS.vehiclePositions,
  alertsUrl:
    process.env.WMATA_GTFS_ALERTS_URL || DEFAULT_WMATA_URLS.alerts,
} as const;

export function wmataApiHeaders(): HeadersInit {
  const apiKey = process.env.WMATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WMATA_API_KEY is not configured. Create a WMATA developer key and put it in .env.local.",
    );
  }
  return { api_key: apiKey, "x-api-key": apiKey };
}
