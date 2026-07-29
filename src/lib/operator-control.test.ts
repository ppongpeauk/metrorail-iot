import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { DisplayState } from "@/lib/display-data";
import {
  defaultOperatorSettings,
  messageForScenario,
  parseOperatorSettings,
  resolveOperatorDisplay,
} from "@/lib/operator-control";
import { LEGACY_PIDS_ROTATION_ANNOUNCEMENTS } from "@/lib/arrival-contract";

const displays: DisplayState[] = [
  {
    id: "columbia",
    kind: "station",
    stationName: "Union Station",
    arrivals: [],
    lead: null,
    routeLine: null,
    stations: [],
    later: [],
    routesByTrip: {},
  },
  {
    id: "elevator",
    kind: "alert",
    stationName: "Union Station",
    alert: "Original alert",
    alertType: "facility",
    arrivals: [],
  },
  {
    id: "emergency",
    kind: "emergency",
    stationName: "Emergency",
    message: "Original emergency",
    direction: "right",
  },
];

describe("resolveOperatorDisplay", () => {
  test("keeps the station program active during normal service", () => {
    const display = resolveOperatorDisplay(
      displays,
      defaultOperatorSettings,
    );

    assert.equal(display?.kind, "station");
  });

  test("turns a service change into a targeted alert program", () => {
    const display = resolveOperatorDisplay(displays, {
      ...defaultOperatorSettings,
      scenario: "service-alert",
      serviceMessage: "Single tracking through Metro Center.",
    });

    assert.equal(display?.kind, "alert");
    assert.equal(
      display?.kind === "alert" ? display.alert : null,
      "Single tracking through Metro Center.",
    );
  });

  test("uses an automatic alert override with the station arrivals", () => {
    const display = resolveOperatorDisplay(
      displays,
      defaultOperatorSettings,
      {
        id: "gtfs-alert",
        sourceHash: "source-hash",
        text: "Green Line: Expect delays.",
        type: "service",
      },
    );

    assert.equal(display?.kind, "alert");
    assert.equal(
      display?.kind === "alert" ? display.alert : null,
      "Green Line: Expect delays.",
    );
  });

  test("restores the station program while an alert is hidden", () => {
    const display = resolveOperatorDisplay(
      displays,
      {
        ...defaultOperatorSettings,
        scenario: "service-alert",
      },
      null,
    );

    assert.equal(display?.kind, "station");
  });

  test("gives emergency content the complete takeover", () => {
    const display = resolveOperatorDisplay(displays, {
      ...defaultOperatorSettings,
      scenario: "emergency",
      emergencyMessage: "Please exit now.",
      exitDirection: "left",
    });

    assert.equal(display?.kind, "emergency");
    assert.equal(
      display?.kind === "emergency" ? display.message : null,
      "Please exit now.",
    );
    assert.equal(
      display?.kind === "emergency" ? display.direction : null,
      "left",
    );
  });
});

describe("parseOperatorSettings", () => {
  test("restores valid operator choices and rejects invalid enum values", () => {
    const parsed = parseOperatorSettings(
      JSON.stringify({
        scenario: "emergency",
        scope: "invalid",
        location: "mezzanine",
        exitDirection: "right",
        announcementMessage: "Obsolete editable announcement",
      }),
    );

    assert.equal(parsed.scenario, "emergency");
    assert.equal(parsed.scope, defaultOperatorSettings.scope);
    assert.equal(parsed.location, "mezzanine");
    assert.equal(parsed.exitDirection, "right");
    assert.equal("announcementMessage" in parsed, false);
  });

  test("falls back safely when stored settings are malformed", () => {
    assert.deepEqual(
      parseOperatorSettings("{not json"),
      defaultOperatorSettings,
    );
  });
});

test("normal-service announcements come from the hardcoded rotation table", () => {
  assert.equal(
    messageForScenario(defaultOperatorSettings),
    LEGACY_PIDS_ROTATION_ANNOUNCEMENTS[0],
  );
});
