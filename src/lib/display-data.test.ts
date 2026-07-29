import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  adaptGtfsArrivals,
  applyStationToDisplays,
  type DisplayState,
  type GtfsArrival,
  filterDisplayByDirection,
  getDisplayStates,
  resolveStationCode,
  routeWindowStart,
  stationDisplayWithArrivals,
  transferLines,
  upcomingStations,
} from "@/lib/display-data";

const collegePark = {
  id: "elevator",
  kind: "alert",
  stationName: "College Park-U of Md",
  stopId: "STN_E09",
  alert: "Test alert",
} as const;

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function gtfsArrival(overrides: Partial<GtfsArrival> = {}): GtfsArrival {
  return {
    tripId: "trip-1",
    stopId: "PF_E09_C",
    routeId: "ORANGE",
    route: "OR",
    destination: "New Carrollton",
    directionId: "0",
    scheduledTime: "2026-07-27T16:00:00.000Z",
    predictedTime: "2026-07-27T16:02:00.000Z",
    minutesText: "2 min",
    vehicleLicensePlate: null,
    isRealtime: true,
    delaySeconds: 120,
    upcomingStops: [],
    ...overrides,
    occupancyStatus: overrides.occupancyStatus ?? null,
  };
}

describe("adaptGtfsArrivals", () => {
  test("excludes scheduled-only rows", () => {
    const arrivals = adaptGtfsArrivals([
      gtfsArrival({ tripId: "scheduled", isRealtime: false }),
      gtfsArrival({ tripId: "realtime" }),
    ]);

    assert.deepEqual(
      arrivals.map(({ tripId }) => tripId),
      ["realtime"],
    );
  });

  test("preserves GTFS vehicle arrival states", () => {
    const arrivals = adaptGtfsArrivals([
      gtfsArrival({ minutesText: "ARR" }),
      gtfsArrival({ minutesText: "BRD", tripId: "trip-2" }),
    ]);

    assert.deepEqual(
      arrivals.map(({ arrival, now }) => ({ arrival, now })),
      [
        { arrival: "BRD", now: true },
        { arrival: "ARR", now: true },
      ],
    );
  });

  test("promotes a boarding train to the lead row", () => {
    const arrivals = adaptGtfsArrivals([
      gtfsArrival({
        tripId: "westbound-1",
        minutesText: "1 min",
      }),
      gtfsArrival({
        tripId: "eastbound-boarding",
        minutesText: "BRD",
      }),
      gtfsArrival({
        tripId: "westbound-8",
        minutesText: "8 min",
      }),
    ]);

    assert.deepEqual(
      arrivals.map(({ tripId }) => tripId),
      ["eastbound-boarding", "westbound-1", "westbound-8"],
    );
  });

  test("keeps a single row per GTFS trip", () => {
    const arrivals = adaptGtfsArrivals([
      gtfsArrival(),
      gtfsArrival({
        stopId: "PF_E09_1",
        destination: "Duplicate row",
      }),
    ]);

    assert.equal(arrivals.length, 1);
    assert.equal(arrivals[0].destination, "New Carrollton");
  });

  test("derives the car count from the vehicle license plate", () => {
    const [arrival] = adaptGtfsArrivals([
      gtfsArrival({
        vehicleLicensePlate: "6_7484-7485.7339-7338.7709-7708",
      }),
    ]);

    assert.equal(arrival.cars, 6);
  });

  test("preserves vehicle occupancy for PIDS rendering", () => {
    const [arrival] = adaptGtfsArrivals([
      gtfsArrival({
        occupancyStatus: "STANDING_ROOM_ONLY",
      }),
    ]);

    assert.equal(arrival.occupancyStatus, "STANDING_ROOM_ONLY");
  });

  test("keeps row identity stable when live platform details change", () => {
    const [before] = adaptGtfsArrivals([gtfsArrival()]);
    const [after] = adaptGtfsArrivals([
      gtfsArrival({
        stopId: "PF_E09_1",
        scheduledTime: "2026-07-27T16:01:00.000Z",
        minutesText: "ARR",
      }),
    ]);

    assert.equal(before.id, "trip-1");
    assert.equal(after.id, before.id);
  });
});

describe("getDisplayStates", () => {
  test("caps the full-arrivals display at nine rows", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          station: {
            id: "STN_E09",
            code: "E09",
            name: "College Park-U of Md",
          },
          arrivals: Array.from({ length: 12 }, (_, index) =>
            gtfsArrival({
              tripId: `trip-${index}`,
              scheduledTime: `2026-07-27T16:${String(index).padStart(2, "0")}:00.000Z`,
            }),
          ),
          fetchedAt: "2026-07-27T16:00:00.000Z",
        }),
        { status: 200 },
      );

    const [display] = await getDisplayStates([collegePark]);

    assert.equal(display.kind, "alert");
    assert.equal(display.kind === "alert" && display.arrivals.length, 9);
  });
});

describe("resolveStationCode", () => {
  test("resolves either public code for a combined transfer station", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          stations: [
            {
              id: "STN_D03_F03",
              code: "D03_F03",
              name: "L'Enfant Plaza",
            },
          ],
        }),
        { status: 200 },
      );

    for (const code of ["D03", "F03"]) {
      assert.deepEqual(await resolveStationCode(code), {
        stationName: "L'Enfant Plaza",
        stopId: "STN_D03_F03",
      });
    }
  });
});

describe("filterDisplayByDirection", () => {
  test("filters arrival screens without changing their display identity", () => {
    const display: DisplayState = {
      id: "elevator",
      kind: "alert",
      stationName: "Metro Center",
      alert: "",
      alertType: "facility",
      arrivals: [
        {
          id: "north",
          tripId: "north",
          line: "RD",
          direction: "Northbound",
          destination: "Glenmont",
          arrival: "2 min",
          now: false,
          cars: null,
          occupancyStatus: null,
        },
        {
          id: "south",
          tripId: "south",
          line: "RD",
          direction: "Southbound",
          destination: "Shady Grove",
          arrival: "4 min",
          now: false,
          cars: null,
          occupancyStatus: null,
        },
      ],
    };

    const filtered = filterDisplayByDirection(display, "Southbound");

    assert.equal(filtered.id, "elevator");
    assert.deepEqual(
      filtered.kind === "alert"
        ? filtered.arrivals.map((arrival) => arrival.id)
        : [],
      ["south"],
    );
  });
});

describe("stationDisplayWithArrivals", () => {
  test("preserves the complete queue behind the lead arrival", () => {
    const arrivals = Array.from({ length: 12 }, (_, index) => ({
      id: `arrival-${index}`,
      tripId: `trip-${index}`,
      line: "RD" as const,
      direction: "Northbound",
      destination: "Glenmont",
      arrival: `${index + 1} min`,
      now: false,
      cars: null,
      occupancyStatus: null,
    }));
    const display: Extract<DisplayState, { kind: "station" }> = {
      id: "columbia",
      kind: "station",
      stationName: "Union Station",
      arrivals: [],
      lead: null,
      routeLine: null,
      stations: [],
      later: [],
      routesByTrip: {},
    };

    const result = stationDisplayWithArrivals(display, arrivals);

    assert.equal(result.arrivals.length, 12);
    assert.equal(result.lead?.id, "arrival-0");
    assert.equal(result.later.length, 11);
    assert.equal(result.later[0].id, "arrival-1");
    assert.equal(result.later[10].id, "arrival-11");
  });
});

describe("applyStationToDisplays", () => {
  test("changes every screen without changing its display kind", () => {
    const displays = applyStationToDisplays(
      [
        {
          id: "columbia",
          kind: "station",
          stationName: "Columbia Heights",
          stopId: "STN_E04",
        },
        collegePark,
      ],
      {
        stationName: "L’Enfant Plaza",
        stopId: "STN_D03_F03",
      },
    );

    assert.deepEqual(
      displays.map(({ kind, stationName, stopId }) => ({
        kind,
        stationName,
        stopId,
      })),
      [
        {
          kind: "station",
          stationName: "L’Enfant Plaza",
          stopId: "STN_D03_F03",
        },
        {
          kind: "alert",
          stationName: "L’Enfant Plaza",
          stopId: "STN_D03_F03",
        },
      ],
    );
  });
});

describe("upcomingStations", () => {
  test("preserves the complete route and marks passed stations", () => {
    const stops = Array.from({ length: 14 }, (_, index) => ({
      id: `STN_E${String(index + 1).padStart(2, "0")}`,
      name: `Station ${index + 1}`,
      routeIds: ["GREEN"],
    }));

    const stations = upcomingStations(stops, "STN_E04", "GR");

    assert.equal(stations.length, 14);
    assert.deepEqual(
      { name: stations[0].name, muted: stations[0].muted },
      { name: "Station 1", muted: true },
    );
    assert.deepEqual(
      { name: stations[3].name, selected: stations[3].selected },
      { name: "Station 4", selected: true },
    );
    assert.equal(stations[13].name, "Station 14");
    assert.equal(
      stations.some((station) => station.name === "Further stops"),
      false,
    );
  });

  test("matches shared stations represented by a combined parent ID", () => {
    const stations = upcomingStations(
      [
        { id: "STN_D03", name: "L’Enfant Plaza", routeIds: ["YELLOW"] },
        { id: "STN_F02", name: "Archives", routeIds: ["YELLOW"] },
      ],
      "STN_D03_F03",
      "YL",
    );

    assert.equal(stations[0].selected, true);
  });
});

describe("routeWindowStart", () => {
  test("shows one prior station without cutting off the final row", () => {
    const stations = Array.from({ length: 14 }, (_, index) => ({
      name: `Station ${index + 1}`,
      selected: index === 3,
    }));

    assert.equal(routeWindowStart(stations), 2);
    stations[3].selected = false;
    stations[13].selected = true;
    assert.equal(routeWindowStart(stations), 5);
  });
});

describe("transferLines", () => {
  test("removes the train line and de-duplicates transfer lines", () => {
    assert.deepEqual(transferLines(["GREEN", "YELLOW", "YL"], "GR"), ["YL"]);
  });
});
