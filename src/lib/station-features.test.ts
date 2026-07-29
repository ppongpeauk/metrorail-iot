import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { stationFeaturesFor } from "@/lib/station-features";

describe("stationFeaturesFor", () => {
  test("matches the feature combinations shown on the WMATA map", () => {
    assert.deepEqual(stationFeaturesFor("Ashburn"), ["parking"]);
    assert.deepEqual(stationFeaturesFor("Forest Glen"), [
      "parking",
      "hospital",
    ]);
    assert.deepEqual(stationFeaturesFor("Union Station"), [
      "vre",
      "amtrak",
      "marc",
    ]);
    assert.deepEqual(stationFeaturesFor("New Carrollton"), [
      "parking",
      "amtrak",
      "marc",
    ]);
    assert.deepEqual(stationFeaturesFor("King St-Old Town"), [
      "vre",
      "amtrak",
    ]);
    assert.deepEqual(
      stationFeaturesFor("Washington Dulles International Airport"),
      ["airport"],
    );
  });

  test("normalizes punctuation variants used by the GTFS feed", () => {
    assert.deepEqual(stationFeaturesFor("L’Enfant Plaza"), ["vre"]);
    assert.deepEqual(
      stationFeaturesFor("Rhode Island Ave-Brentwood"),
      ["parking"],
    );
  });

  test("does not infer a feature solely from a station name", () => {
    assert.deepEqual(stationFeaturesFor("Medical Center"), []);
  });
});
