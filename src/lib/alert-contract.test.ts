import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ALERT_HIDDEN_MS,
  ALERT_VISIBLE_MS,
  alertRotationDelayMs,
  alertRotationAtElapsed,
  type TransitAlert,
} from "@/lib/alert-contract";

const alerts: TransitAlert[] = [
  {
    id: "one",
    sourceHash: "hash-one",
    text: "Red Line: Expect delays.",
    type: "service",
  },
  {
    id: "two",
    sourceHash: "hash-two",
    text: "Green Line: Trains are bypassing U Street.",
    type: "service",
  },
];

describe("alertRotationAtElapsed", () => {
  test("shows each alert before restoring arrivals for one minute", () => {
    assert.equal(alertRotationAtElapsed(alerts, 0)?.id, "one");
    assert.equal(
      alertRotationAtElapsed(alerts, ALERT_VISIBLE_MS - 1)?.id,
      "one",
    );
    assert.equal(alertRotationAtElapsed(alerts, ALERT_VISIBLE_MS), null);
    assert.equal(
      alertRotationAtElapsed(
        alerts,
        ALERT_VISIBLE_MS + ALERT_HIDDEN_MS - 1,
      ),
      null,
    );
    assert.equal(
      alertRotationAtElapsed(
        alerts,
        ALERT_VISIBLE_MS + ALERT_HIDDEN_MS,
      )?.id,
      "two",
    );
  });

  test("returns no alert for an empty queue", () => {
    assert.equal(alertRotationAtElapsed([], 0), null);
  });
});

describe("alertRotationDelayMs", () => {
  test("waits for completion-driven alerts to finish", () => {
    assert.equal(alertRotationDelayMs(true, true), null);
    assert.equal(alertRotationDelayMs(false, true), ALERT_HIDDEN_MS);
  });

  test("keeps the timed alert window for other displays", () => {
    assert.equal(
      alertRotationDelayMs(true, false),
      ALERT_VISIBLE_MS,
    );
  });
});
