import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LegacyLandscapeArrivalsDisplay } from "@/components/arrivals/legacy-landscape-arrivals-display";
import { LegacyWideArrivalsDisplay } from "@/components/arrivals/legacy-wide-arrivals-display";
import {
  wideScrollDurationMs,
  wideScrollEndTransform,
} from "@/components/arrivals/use-wide-arrival-scroll";
import { WideArrivalsDisplay } from "@/components/arrivals/wide-arrivals-display";
import type { Arrival } from "@/lib/display-data";

const arrival: Arrival = {
  id: "trip-1",
  tripId: "trip-1",
  line: "GR",
  direction: "Northbound",
  destination: "Greenbelt",
  arrival: "ARR",
  now: true,
  cars: 8,
  occupancyStatus: "MANY_SEATS_AVAILABLE",
};

describe("LegacyWideArrivalsDisplay", () => {
  test("keeps modular-wide styling while adding legacy fields", () => {
    const markup = renderToStaticMarkup(
      <LegacyWideArrivalsDisplay arrivals={[arrival]} />,
    );

    assert.match(markup, /bg-\[var\(--panel\)\]/);
    assert.doesNotMatch(markup, /0069aa|07182a/);
    assert.match(markup, />1\.<\/strong>/);
    assert.match(markup, />Greenbelt<\/strong>/);
  });

  test("keeps the first row fixed and renders five rows in a scrolling track", () => {
    const arrivals = [1, 2, 3, 4, 5, 6].map((number) => ({
      ...arrival,
      id: `trip-${number}`,
      tripId: `trip-${number}`,
      destination: `Destination ${number}`,
      now: false,
    }));
    const markup = renderToStaticMarkup(
      <LegacyWideArrivalsDisplay arrivals={arrivals} />,
    );

    assert.match(markup, />1\.<\/strong>.*Destination 1/);
    assert.match(
      markup,
      /overflow-hidden"><div class="flex h-full flex-col[\s\S]*>[\s\S]*2\.<\/strong>[\s\S]*Destination 2[\s\S]*3\.<\/strong>[\s\S]*Destination 3[\s\S]*4\.<\/strong>[\s\S]*Destination 4[\s\S]*5\.<\/strong>[\s\S]*Destination 5/,
    );
    assert.doesNotMatch(markup, /Destination 6/);
    assert.match(markup, /transition-transform ease-linear/);
    assert.match(markup, /transition-duration:9000ms/);
  });

  test("uses the same five-row cap in the modern wide display", () => {
    const arrivals = [1, 2, 3, 4, 5, 6].map((number) => ({
      ...arrival,
      id: `trip-${number}`,
      tripId: `trip-${number}`,
      destination: `Destination ${number}`,
      now: false,
    }));
    const markup = renderToStaticMarkup(<WideArrivalsDisplay arrivals={arrivals} />);

    assert.match(markup, /Destination 5/);
    assert.doesNotMatch(markup, /Destination 6/);
  });

  test("scrolls through every non-lead row", () => {
    assert.equal(
      wideScrollEndTransform(4),
      "translateY(calc(-300% - var(--sign-space) - var(--sign-space) - var(--sign-space)))",
    );
    assert.equal(wideScrollDurationMs(4), 9_000);
  });

  test("uses the overflow marquee for long alert messages", () => {
    const markup = renderToStaticMarkup(
      <LegacyWideArrivalsDisplay
        alert="A long facility alert"
        alertType="facility"
        arrivals={[arrival]}
        onAlertComplete={() => {}}
      />,
    );

    assert.match(markup, /overflow-marquee-track/);
    assert.match(markup, /data-repeat="false"/);
    assert.match(
      markup,
      /overflow-marquee-content whitespace-nowrap font-bold">A long facility alert/,
    );
  });

  test("flattens newlines in horizontal elevator marquees", () => {
    const markup = renderToStaticMarkup(
      <LegacyWideArrivalsDisplay
        alert={
          "Elevator Outages\nL'Enfant Plaza\nRequest Shuttle from\nFederal Ctr SW"
        }
        alertType="facility"
        arrivals={[arrival]}
      />,
    );

    assert.match(markup, /whitespace-nowrap/);
    assert.match(
      markup,
      /Elevator Outages L&#x27;Enfant Plaza Request Shuttle from Federal Ctr SW/,
    );
  });
});

describe("LegacyLandscapeArrivalsDisplay", () => {
  test("doubles the column gap across the pilot header and rows", () => {
    const markup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay arrivals={[arrival]} />,
    );

    assert.equal(markup.match(/gap-x-\[2cqw\]/g)?.length, 2);
  });

  test("uses regular gray-and-black PIDS styling without row blinking", () => {
    const markup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay
        alerts={[
          {
            id: "test-alert",
            sourceHash: "test-hash",
            text: "Report suspicious activity.",
            type: "service",
          },
        ]}
        arrivals={[arrival]}
      />,
    );

    assert.match(markup, /bg-black/);
    assert.match(markup, /bg-\[var\(--header\)\]/);
    assert.match(markup, /font-normal/);
    assert.doesNotMatch(markup, /now-blink|odd:bg|even:bg|0a8fe8|118cdd/);
  });

  test("wraps announcements in the vertical overflow marquee", () => {
    const markup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay
        alerts={[
          {
            id: "test-alert",
            sourceHash: "test-hash",
            text: "Elevator outage at U St.",
            type: "facility",
          },
        ]}
        arrivals={[arrival]}
      />,
    );

    assert.match(markup, /data-axis="vertical"/);
    assert.match(markup, /data-repeat="false"/);
    assert.match(markup, /overflow-marquee-track/);
    assert.match(markup, /aria-label="Rail car less than 20% occupied"/);
    assert.match(markup, /src="\/symbols\/legacy-person\.svg"/);
  });

  test("renders the three documented WMATA occupancy levels", () => {
    const expectedSymbols = [
      ["MANY_SEATS_AVAILABLE", 1],
      ["FEW_SEATS_AVAILABLE", 2],
      ["FULL", 3],
    ] as const;

    for (const [occupancyStatus, count] of expectedSymbols) {
      const markup = renderToStaticMarkup(
        <LegacyLandscapeArrivalsDisplay
          alerts={[
            {
              id: "test-alert",
              sourceHash: "test-hash",
              text: "Test",
              type: "service",
            },
          ]}
          arrivals={[{ ...arrival, occupancyStatus }]}
        />,
      );
      assert.equal(
        markup.match(/src="\/symbols\/legacy-person\.svg"/g)?.length,
        count,
      );
    }
  });

  test("keeps five arrival rows mounted behind the announcement", () => {
    const arrivals = [1, 2, 3, 4, 5].map((number) => ({
      ...arrival,
      id: `trip-${number}`,
      tripId: `trip-${number}`,
      destination: `Destination ${number}`,
    }));
    const markup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay arrivals={arrivals} />,
    );

    for (let number = 1; number <= 5; number += 1) {
      assert.match(markup, new RegExp(`Destination ${number}`));
    }
    assert.match(markup, /absolute inset-x-0 bottom-0 h-\[34cqh\]/);
  });

  test("keeps fixed five-row slots when fewer arrivals remain", () => {
    const arrivals = [1, 2, 3].map((number) => ({
      ...arrival,
      id: `trip-${number}`,
      tripId: `trip-${number}`,
    }));
    const markup = renderToStaticMarkup(
      <LegacyLandscapeArrivalsDisplay arrivals={arrivals} />,
    );

    assert.equal(
      markup.match(/grid h-\[17cqh\] flex-none/g)?.length,
      3,
    );
    assert.doesNotMatch(
      markup,
      /grid min-h-0 flex-1 grid-cols-\[10cqw_17cqw_/,
    );
  });
});
