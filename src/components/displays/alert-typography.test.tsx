import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertDisplay } from "@/components/alerts/alert-display";
import { LandscapeArrivalsDisplay } from "@/components/arrivals/landscape-arrivals-display";
import { LegacyLandscapeArrivalsDisplay } from "@/components/arrivals/legacy-landscape-arrivals-display";
import { LegacyWideArrivalsDisplay } from "@/components/arrivals/legacy-wide-arrivals-display";
import { PortraitScreenTransition } from "@/components/displays/portrait-screen-transition";
import { WideArrivalsDisplay } from "@/components/arrivals/wide-arrivals-display";
import { ALERT_SCROLL_HOLD_MS } from "@/lib/alert-contract";
import type { Arrival, DisplayState } from "@/lib/display-data";

const arrival: Arrival = {
  id: "trip-1",
  tripId: "trip-1",
  line: "GR",
  direction: "Northbound",
  destination: "Greenbelt",
  arrival: "3 min",
  now: false,
  cars: 8,
  occupancyStatus: null,
};

const portraitAlert: Extract<DisplayState, { kind: "alert" }> = {
  id: "alert-1",
  kind: "alert",
  stationName: "L’Enfant Plaza",
  alert: "Green/Yellow Line: Expect delays.",
  alertType: "service",
  arrivals: [],
};

describe("alert destination typography", () => {
  test("matches 4:1 destination text in modern and legacy screens", () => {
    for (const markup of [
      renderToStaticMarkup(
        <WideArrivalsDisplay
          alert="Green Line: Expect delays."
          arrivals={[arrival]}
        />,
      ),
      renderToStaticMarkup(
        <LegacyWideArrivalsDisplay
          alert="Green Line: Expect delays."
          arrivals={[arrival]}
        />,
      ),
    ]) {
      assert.match(
        markup,
        /flex min-h-0 flex-1 items-center[^"]*text-\[24cqh\]/,
      );
    }
  });

  test("matches each modern 16:9 destination size", () => {
    const fourRowMarkup = renderToStaticMarkup(
      <LandscapeArrivalsDisplay
        alert="Green Line: Expect delays."
        arrivals={[arrival]}
        rowCount={4}
      />,
    );
    const fiveRowMarkup = renderToStaticMarkup(
      <LandscapeArrivalsDisplay
        alert={
          "Elevator Outages\nL'Enfant Plaza\nRequest Shuttle from\nFederal Ctr SW"
        }
        alertType="facility"
        arrivals={[arrival]}
        rowCount={5}
      />,
    );

    assert.match(
      fourRowMarkup,
      /mt-auto flex min-h-0 flex-\[0_0_calc\(37\.35cqh\+var\(--sign-space\)\)\] items-center[^"]*text-\[5\.35cqw\]/,
    );
    assert.match(
      fiveRowMarkup,
      /mt-auto flex min-h-0 flex-\[0_0_calc\(37\.35cqh\+var\(--sign-space\)\)\] items-center[^"]*text-\[4\.3cqw\][^"]*basis-\[calc\(30\.5cqh\+var\(--sign-space\)\)\]/,
    );
    assert.doesNotMatch(fiveRowMarkup, /text-\[2\.6cqw\]/);
  });

  test("reserves two bottom row slots for modern 16:9 alerts", () => {
    const arrivals = [1, 2, 3, 4, 5].map((number) => ({
      ...arrival,
      id: `trip-${number}`,
      tripId: `trip-${number}`,
    }));

    for (const rowCount of [4, 5] as const) {
      const markup = renderToStaticMarkup(
        <LandscapeArrivalsDisplay
          alert="Green Line: Expect delays."
          arrivals={arrivals}
          rowCount={rowCount}
        />,
      );

      assert.equal(
        markup.match(/data-arrival-id=/g)?.length,
        rowCount - 2,
      );
    }
  });

  test("scrolls each modern 16:9 alert vertically before rotating", () => {
    for (const rowCount of [4, 5] as const) {
      const markup = renderToStaticMarkup(
        <LandscapeArrivalsDisplay
          alert="Green Line: Expect delays."
          arrivals={[arrival]}
          onAlertComplete={() => {}}
          rowCount={rowCount}
        />,
      );

      assert.match(markup, /data-axis="vertical"/);
      assert.match(
        markup,
        new RegExp(
          `data-post-scroll-delay-ms="${ALERT_SCROLL_HOLD_MS}"`,
        ),
      );
      assert.match(markup, /data-repeat="false"/);
      assert.match(
        markup,
        /overflow-marquee-viewport[^"]*self-stretch/,
      );
      assert.match(
        markup,
        /overflow-marquee-content whitespace-pre-line font-bold/,
      );
    }
  });

  test("matches legacy 16:9 and portrait destination text", () => {
    const legacyMarkup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay
        alerts={[
          {
            id: "alert-1",
            sourceHash: "source-1",
            text: "Green Line: Expect delays.",
            type: "service",
          },
        ]}
        arrivals={[arrival]}
      />,
    );
    const portraitMarkup = renderToStaticMarkup(
      <AlertDisplay display={portraitAlert} />,
    );

    assert.match(
      legacyMarkup,
      /absolute inset-x-0 bottom-0[^"]*text-\[8cqw\]/,
    );
    assert.match(
      portraitMarkup,
      /my-\[var\(--sign-space\)\][^"]*text-\[4\.35cqw\]/,
    );
  });

  test("keeps one stable portrait header outside the alert transition", () => {
    const markup = renderToStaticMarkup(
      <PortraitScreenTransition
        display={portraitAlert}
        mode="line-progress"
      />,
    );

    assert.equal(markup.match(/<header/g)?.length, 1);
    assert.match(
      markup,
      /<\/header><div class="relative min-h-0 flex-1 overflow-hidden">/,
    );
    assert.match(markup, /data-portrait-page="alert"/);
  });
});
