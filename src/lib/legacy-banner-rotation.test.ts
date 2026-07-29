import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { TransitAlert } from "@/lib/alert-contract";
import {
  advanceLegacyBannerRotation,
  createLegacyBannerRotation,
  LEGACY_BANNER_GAP_MS,
} from "@/lib/legacy-banner-rotation";

const alerts: TransitAlert[] = [
  {
    id: "alert-one",
    sourceHash: "hash-one",
    text: "First GTFS alert",
    type: "service",
  },
  {
    id: "alert-two",
    sourceHash: "hash-two",
    text: "Second GTFS alert",
    type: "facility",
  },
];

describe("legacy banner rotation", () => {
  test("waits two minutes between banner messages", () => {
    assert.equal(LEGACY_BANNER_GAP_MS, 2 * 60_000);
  });

  test("alternates GTFS alerts with informational messages", () => {
    const firstAlert = createLegacyBannerRotation(alerts);
    const firstInformation = advanceLegacyBannerRotation(
      firstAlert,
      alerts,
    );
    const secondAlert = advanceLegacyBannerRotation(
      firstInformation,
      alerts,
    );
    const secondInformation = advanceLegacyBannerRotation(
      secondAlert,
      alerts,
    );

    assert.equal(firstAlert.banner.text, "First GTFS alert");
    assert.equal(firstInformation.banner.kind, "information");
    assert.equal(secondAlert.banner.text, "Second GTFS alert");
    assert.equal(secondInformation.banner.kind, "information");
    assert.notEqual(
      secondInformation.banner.text,
      firstInformation.banner.text,
    );
  });

  test("continues informational messages when there are no alerts", () => {
    const first = createLegacyBannerRotation([]);
    const second = advanceLegacyBannerRotation(first, []);

    assert.equal(first.banner.kind, "information");
    assert.equal(second.banner.kind, "information");
    assert.notEqual(second.banner.text, first.banner.text);
  });

  test("keeps the current message snapshot until it is advanced", () => {
    const current = createLegacyBannerRotation(alerts);
    const refreshedAlerts = [
      { ...alerts[0], sourceHash: "updated", text: "Updated alert text" },
    ];

    assert.equal(current.banner.text, "First GTFS alert");
    assert.equal(
      advanceLegacyBannerRotation(
        advanceLegacyBannerRotation(current, refreshedAlerts),
        refreshedAlerts,
      ).banner.text,
      "Updated alert text",
    );
  });
});
