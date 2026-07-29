import assert from "node:assert/strict";
import test from "node:test";
import {
  arrivalMinutesText,
  arrivalStatusPriority,
  freshVehicleStopStatus,
  isDelayedArrival,
  isArrivalTimeEligible,
  isFreshRealtimeTimestamp,
  isRealtimeSnapshotCurrent,
  realtimeStopKey,
  vehicleStopKey,
} from "@/lib/gtfs";

const NOW = 1_000_000;

test("keeps an in-transit sub-minute prediction on the minute counter", () => {
  assert.equal(
    arrivalMinutesText(NOW + 20_000, NOW, "IN_TRANSIT_TO", null),
    "1 min",
  );
  assert.equal(arrivalMinutesText(NOW + 20_000, NOW, undefined, null), "1 min");
  assert.equal(arrivalMinutesText(NOW + 20_000, NOW, "ARR", null), "ARR");
  assert.equal(arrivalMinutesText(NOW + 20_000, NOW, "BRD", null), "BRD");
});

test("rejects a stale vehicle stop state", () => {
  assert.equal(
    freshVehicleStopStatus(
      { status: "ARR", timestampSeconds: (NOW - 91_000) / 1000 },
      null,
      NOW,
    ),
    undefined,
  );
});

test("rejects stale or implausibly future realtime observations", () => {
  assert.equal(isFreshRealtimeTimestamp((NOW - 90_000) / 1000, NOW), true);
  assert.equal(isFreshRealtimeTimestamp((NOW - 90_001) / 1000, NOW), false);
  assert.equal(isFreshRealtimeTimestamp((NOW + 15_000) / 1000, NOW), true);
  assert.equal(isFreshRealtimeTimestamp((NOW + 15_001) / 1000, NOW), false);
  assert.equal(isFreshRealtimeTimestamp(null, NOW), false);
});

test("rejects a vehicle stop state from an out-of-phase feed", () => {
  assert.equal(
    freshVehicleStopStatus(
      { status: "ARR", timestampSeconds: NOW / 1000 },
      (NOW - 31_000) / 1000,
      NOW,
    ),
    undefined,
  );
  assert.equal(
    freshVehicleStopStatus(
      { status: "BRD", timestampSeconds: NOW / 1000 },
      (NOW - 30_000) / 1000,
      NOW,
    ),
    "BRD",
  );
});

test("does not replace a timestamped realtime snapshot with an older one", () => {
  assert.equal(isRealtimeSnapshotCurrent(101, 100), false);
  assert.equal(isRealtimeSnapshotCurrent(101, null), false);
  assert.equal(isRealtimeSnapshotCurrent(101, 101), true);
  assert.equal(isRealtimeSnapshotCurrent(101, 102), true);
});

test("disambiguates realtime stop updates with stop sequence", () => {
  assert.equal(realtimeStopKey("trip-1", "PF_A01_1", 4), "trip-1|PF_A01_1|4");
  assert.equal(realtimeStopKey("trip-1", "PF_A01_1", null), "trip-1|PF_A01_1");
  assert.equal(realtimeStopKey("trip-1", null, 4), "trip-1||4");
  assert.equal(realtimeStopKey("trip-1", null, null), null);
});

test("requires stop sequence before accepting a vehicle stop state", () => {
  assert.equal(vehicleStopKey("trip-1", "PF_A01_1", null), null);
  assert.equal(vehicleStopKey("trip-1", "PF_A01_1", 4), "trip-1|PF_A01_1|4");
  assert.equal(vehicleStopKey("trip-1", null, 4), "trip-1||4");
});

test("excludes an IN_TRANSIT_TO train after its predicted arrival time", () => {
  assert.equal(isArrivalTimeEligible(NOW - 1, NOW, "IN_TRANSIT_TO"), false);
});

test("includes an IN_TRANSIT_TO train until its predicted arrival time", () => {
  assert.equal(isArrivalTimeEligible(NOW, NOW, "IN_TRANSIT_TO"), true);
  assert.equal(isArrivalTimeEligible(NOW + 60_000, NOW, "IN_TRANSIT_TO"), true);
});

test("preserves the existing past-arrival tolerance for other statuses", () => {
  assert.equal(isArrivalTimeEligible(NOW - 1, NOW, "ARR"), true);
  assert.equal(isArrivalTimeEligible(NOW - 1, NOW, "BRD"), true);
  assert.equal(isArrivalTimeEligible(NOW - 1, NOW, undefined), true);
  assert.equal(isArrivalTimeEligible(NOW - 30_001, NOW, "ARR"), false);
});

test("prioritizes boarding and arriving trains over timed arrivals", () => {
  assert.ok(arrivalStatusPriority("BRD") < arrivalStatusPriority("ARR"));
  assert.ok(arrivalStatusPriority("ARR") < arrivalStatusPriority("1 min"));
});

test("marks trains delayed at five minutes, but not before", () => {
  assert.equal(isDelayedArrival(null), false);
  assert.equal(isDelayedArrival(299), false);
  assert.equal(isDelayedArrival(300), true);
  assert.equal(isDelayedArrival(901), true);
});
