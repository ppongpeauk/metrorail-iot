import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  abbreviateLegacyLandscapeDestination,
  abbreviatePidsDestination,
  LEGACY_PIDS_ROTATION_ANNOUNCEMENTS,
  occupancySymbolCount,
} from "@/lib/arrival-contract";

test("uses the approved legacy PIDS announcement rotation", () => {
  assert.deepEqual(LEGACY_PIDS_ROTATION_ANNOUNCEMENTS, [
    "Report suspicious behavior,\nactivities, or unattended\npackages to a Metro employee\nor police officer.",
    "Call 202-962-2121 or\ntext MyMTPD to 696873.",
    "Please allow customers\nto exit before boarding.",
    "Please do not rush\nor hold train doors.",
    "No smoking, eating,\ndrinking, or littering\nin Metro.",
    "Please take all personal\nbelongings with you.",
    "Free shuttle buses\nreplace trains.",
  ]);
});

describe("occupancySymbolCount", () => {
  test("uses WMATA's three documented rail-car occupancy levels", () => {
    assert.equal(occupancySymbolCount("MANY_SEATS_AVAILABLE"), 1);
    assert.equal(occupancySymbolCount("FEW_SEATS_AVAILABLE"), 2);
    assert.equal(occupancySymbolCount("FULL"), 3);
  });

  test("hides symbols for missing or unsupported occupancy states", () => {
    assert.equal(occupancySymbolCount(null), 0);
    assert.equal(occupancySymbolCount("EMPTY"), 0);
    assert.equal(occupancySymbolCount("NO_DATA_AVAILABLE"), 0);
    assert.equal(occupancySymbolCount("STANDING_ROOM_ONLY"), 0);
    assert.equal(occupancySymbolCount("CRUSHED_STANDING_ROOM_ONLY"), 0);
    assert.equal(occupancySymbolCount("NOT_ACCEPTING_PASSENGERS"), 0);
    assert.equal(occupancySymbolCount("NOT_BOARDABLE"), 0);
  });
});

describe("abbreviateLegacyLandscapeDestination", () => {
  test("uses classic legacy PIDS destination labels", () => {
    assert.equal(
      abbreviateLegacyLandscapeDestination(
        "Mt Vernon Sq 7th St-Convention Center",
      ),
      "Mt Vernon Sq",
    );
    assert.equal(
      abbreviateLegacyLandscapeDestination("Greenbelt"),
      "Greenbelt",
    );
  });

  test("abbreviates common terms within destination names", () => {
    assert.equal(
      abbreviateLegacyLandscapeDestination("Vienna Town Center"),
      "Vienna Twn Ctr.",
    );
    assert.equal(
      abbreviateLegacyLandscapeDestination("Dulles International Airport"),
      "Dulles Intl Airport",
    );
  });
});

describe("abbreviatePidsDestination", () => {
  test("emits one consistent classic form for current terminal names", () => {
    const destinations: Array<[string, string]> = [
      ["Shady Grove", "Shady Gr"],
      ["Glenmont", "Glenmont"],
      ["Friendship Heights", "Frndshp Hts"],
      ["Silver Spring", "Silver Spring"],
      ["Grosvenor–Strathmore", "Grosvenor"],
      ["North Bethesda", "N Bethesda"],
      ["Takoma", "Takoma"],
      ["Ashburn", "Ashburn"],
      ["Wiehle–Reston East", "Wiehle"],
      ["Vienna/Fairfax–GMU", "Vienna"],
      ["New Carrollton", "NewCrlton"],
      ["Downtown Largo", "Largo"],
      ["Franconia–Springfield", "Franconia"],
      ["Greenbelt", "Greenbelt"],
      ["Branch Avenue", "Branch Av"],
      ["Huntington", "Huntington"],
      ["Mount Vernon Square", "Mt Vernon Sq"],
      ["Fort Totten", "Fort Totten"],
    ];

    for (const [destination, expected] of destinations) {
      assert.equal(abbreviatePidsDestination(destination), expected);
    }
  });

  test("normalizes historical and API variants", () => {
    const variants: Array<[string, string]> = [
      ["Shady Grv", "Shady Gr"],
      ["Frndshp Hts", "Frndshp Hts"],
      ["White Flint", "N Bethesda"],
      ["Wiehle-Reston", "Wiehle"],
      ["NewCrlto", "NewCrlton"],
      ["New Carolltn", "NewCrlton"],
      ["Frnconia", "Franconia"],
      ["MtVern Sq", "Mt Vernon Sq"],
      ["Branch Ave", "Branch Av"],
      ["Largo Town Ctr", "Largo Twn Ctr"],
    ];

    for (const [destination, expected] of variants) {
      assert.equal(abbreviatePidsDestination(destination), expected);
    }
  });

  test("abbreviates common terms within destination names", () => {
    assert.equal(abbreviatePidsDestination("Metro Center"), "Metro Ctr.");
    assert.equal(
      abbreviatePidsDestination("National Harbor Town Center"),
      "Natl Harbor Twn Ctr.",
    );
    assert.equal(
      abbreviatePidsDestination("Dulles International Airport"),
      "Dulles Intl Airport",
    );
  });

  test("only abbreviates complete terms", () => {
    assert.equal(abbreviatePidsDestination("Downtown Largo"), "Largo");
    assert.equal(abbreviatePidsDestination("Centerville"), "Centerville");
  });
});
