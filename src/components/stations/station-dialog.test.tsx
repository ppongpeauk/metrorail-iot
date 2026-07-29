import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StationDialog } from "@/components/stations/station-dialog";

describe("StationDialog", () => {
  test("selects the active public code for a transfer station", () => {
    const markup = renderToStaticMarkup(
      <StationDialog
        code="C01"
        error={null}
        onCancel={() => {}}
        onCodeChange={() => {}}
        onSubmit={() => {}}
        saving={false}
        stations={[
          { id: "STN_G03", code: "G03", name: "Addison Rd" },
          {
            id: "STN_A01_C01",
            code: "A01_C01",
            name: "Metro Center",
          },
        ]}
        stationsLoading={false}
      />,
    );

    assert.match(
      markup,
      /<option value="C01" selected="">Metro Center<\/option>/,
    );
    assert.doesNotMatch(
      markup,
      /<option value="G03" selected="">Addison Rd<\/option>/,
    );
  });
});
