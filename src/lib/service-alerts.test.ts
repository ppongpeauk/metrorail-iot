import assert from "node:assert/strict";
import { describe, test } from "node:test";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  alertAppliesToStation,
  alertTypeForSource,
  decodeAlertFeed,
  isAlertActive,
  readThroughAlertTextCache,
  redisAlertTextCacheKey,
  sanitizeGeneratedAlertText,
  sourceHash,
} from "@/lib/service-alerts";

const station = {
  id: "STN_D03_F03",
  stopIds: ["PF_D03_C", "PF_F03_C"],
  routeIds: ["YELLOW", "GREEN", "BLUE", "ORANGE", "SILVER"],
};

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let remaining = value;
  do {
    const byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    bytes.push(byte + (remaining ? 128 : 0));
  } while (remaining > 0);
  return bytes;
}

function lengthDelimitedField(tag: number, payload: Uint8Array): number[] {
  return [
    ...encodeVarint(tag),
    ...encodeVarint(payload.length),
    ...payload,
  ];
}

describe("GTFS-Realtime alert decoding", () => {
  test("normalizes the official binding without inventing omitted fields", () => {
    const bytes = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
      header: {
        gtfsRealtimeVersion: "2.0",
        timestamp: 1_725_000_000,
      },
      entity: [
        {
          id: "alert-1",
          alert: {
            activePeriod: [{ start: 1_725_000_000 }],
            informedEntity: [{ agencyId: "WMATA", routeId: "GR" }],
            effect: 11,
            severityLevel: 2,
            headerText: {
              translation: [{ text: "Elevator outage", language: "en" }],
            },
          },
        },
      ],
    }).finish();

    assert.deepEqual(decodeAlertFeed(bytes), {
      header: { timestamp: "1725000000" },
      entity: [
        {
          id: "alert-1",
          alert: {
            activePeriod: [{ start: "1725000000", end: undefined }],
            informedEntity: [
              {
                agencyId: "WMATA",
                routeId: "GR",
                routeType: undefined,
                stopId: undefined,
                directionId: undefined,
              },
            ],
            cause: undefined,
            effect: 11,
            severityLevel: 2,
            headerText: {
              translation: [{ text: "Elevator outage", language: "en" }],
            },
            descriptionText: undefined,
          },
        },
      ],
    });
  });

  test("tolerates WMATA's malformed scalar TTS field", () => {
    const header =
      GtfsRealtimeBindings.transit_realtime.FeedHeader.encode({
        gtfsRealtimeVersion: "2.0",
        timestamp: 1_725_000_000,
      }).finish();
    const alert = GtfsRealtimeBindings.transit_realtime.Alert.encode({
      headerText: {
        translation: [{ text: "Service Alert", language: "en" }],
      },
    }).finish();
    const malformedAlert = Uint8Array.from([
      ...alert,
      0x60, // field 12 (tts_header_text), but with a scalar wire type
      0x04,
    ]);
    const entity = Uint8Array.from([
      ...lengthDelimitedField(
        0x0a,
        new TextEncoder().encode("alert-1"),
      ),
      ...lengthDelimitedField(0x2a, malformedAlert),
    ]);
    const feed = Uint8Array.from([
      ...lengthDelimitedField(0x0a, header),
      ...lengthDelimitedField(0x12, entity),
    ]);

    assert.equal(
      decodeAlertFeed(feed).entity[0]?.alert?.headerText?.translation[0]?.text,
      "Service Alert",
    );
  });
});

describe("GTFS alert targeting", () => {
  test("matches line, platform, parent-station, and systemwide selectors", () => {
    assert.equal(
      alertAppliesToStation([{ routeId: "GREEN" }], station),
      true,
    );
    assert.equal(
      alertAppliesToStation([{ stopId: "PF_D03_C" }], station),
      true,
    );
    assert.equal(
      alertAppliesToStation([{ stopId: "STN_F03" }], station),
      true,
    );
    assert.equal(
      alertAppliesToStation([{ agencyId: "WMATA" }], station),
      true,
    );
    assert.equal(
      alertAppliesToStation([{ routeId: "RED" }], station),
      false,
    );
  });

  test("accepts currently active and open-ended periods", () => {
    assert.equal(isAlertActive([], 100), true);
    assert.equal(
      isAlertActive([{ start: "50", end: "150" }], 100),
      true,
    );
    assert.equal(isAlertActive([{ start: "101" }], 100), false);
    assert.equal(isAlertActive([{ end: "100" }], 100), false);
  });
});

describe("alert text formatting", () => {
  test("strips FINAL while retaining a normalized WMATA line prefix", () => {
    assert.equal(
      sanitizeGeneratedAlertText({
        generatedText:
          "FINAL: Red Line: Expect delays in both directions because of a signal problem.",
        routeIds: ["GREEN", "YELLOW"],
        sourceText: "Raw source",
        type: "service",
      }),
      "Green/Yellow Line: Expect delays in both directions because of a signal problem.",
    );
  });

  test("preserves elevator display line breaks", () => {
    const message =
      "Elevator Outages\nL'Enfant Plaza\nRequest Shuttle from\nFederal Ctr SW";
    assert.equal(
      sanitizeGeneratedAlertText({
        generatedText: message,
        routeIds: [],
        sourceText: "Raw source",
        type: "facility",
      }),
      message,
    );
  });

  test("converts a one-line elevator source into the four-line display format", () => {
    assert.equal(
      sanitizeGeneratedAlertText({
        generatedText:
          "Elevator outage at L'Enfant Plaza, for elevator access stop at Federal Ctr SW.",
        routeIds: [],
        sourceText: "Raw source",
        type: "facility",
      }),
      "Elevator Outages\nL'Enfant Plaza\nRequest Shuttle from\nFederal Ctr SW",
    );
  });

  test("classifies accessibility alerts as facility messages", () => {
    assert.equal(
      alertTypeForSource(11, "Station access is affected."),
      "facility",
    );
    assert.equal(
      alertTypeForSource(6, "Elevator outage at Metro Center."),
      "facility",
    );
    assert.equal(
      alertTypeForSource(6, "Trains are single tracking."),
      "service",
    );
  });

  test("creates stable content hashes", () => {
    assert.equal(sourceHash("same source"), sourceHash("same source"));
    assert.notEqual(sourceHash("same source"), sourceHash("changed source"));
  });

  test("uses the persistent formatted-text cache without calling the LLM", async () => {
    let generations = 0;
    const text = await readThroughAlertTextCache({
      cacheKey: redisAlertTextCacheKey("abc123"),
      cache: {
        get: async () => "Green Line: Trains are operating normally.",
        set: async () => {
          assert.fail("A cache hit must not be overwritten.");
        },
      },
      generate: async () => {
        generations += 1;
        return { cacheable: true, text: "Generated text" };
      },
    });

    assert.equal(text, "Green Line: Trains are operating normally.");
    assert.equal(generations, 0);
  });

  test("persists successful LLM text but not fallback text", async () => {
    const writes: Array<[string, string]> = [];
    const cache = {
      get: async () => null,
      set: async (key: string, value: string) => {
        writes.push([key, value]);
      },
    };
    const cacheKey = redisAlertTextCacheKey("def456");

    assert.equal(
      await readThroughAlertTextCache({
        cache,
        cacheKey,
        generate: async () => ({ cacheable: true, text: "LLM text" }),
      }),
      "LLM text",
    );
    assert.deepEqual(writes, [[cacheKey, "LLM text"]]);

    assert.equal(
      await readThroughAlertTextCache({
        cache,
        cacheKey,
        generate: async () => ({ cacheable: false, text: "Fallback text" }),
      }),
      "Fallback text",
    );
    assert.deepEqual(writes, [[cacheKey, "LLM text"]]);
  });
});
