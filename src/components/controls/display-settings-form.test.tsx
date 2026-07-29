import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DisplaySettingsForm } from "@/components/controls/display-settings-form";
import { defaultOperatorSettings } from "@/lib/operator-control";

const baseProps = {
  direction: null,
  directionOptions: ["Northbound", "Southbound"],
  mode: "landscape-arrivals" as const,
  operatorSettings: defaultOperatorSettings,
  onDirectionChange: () => {},
  onModeChange: () => {},
  onOperatorSettingsChange: () => {},
};

describe("DisplaySettingsForm", () => {
  test("renders the public display controls without developer fields", () => {
    const markup = renderToStaticMarkup(
      <DisplaySettingsForm {...baseProps} showAnimationDebug={false} />,
    );

    assert.match(markup, /<form class="contents">/);
    assert.match(markup, /name="mode"/);
    assert.match(markup, /name="location"/);
    assert.match(markup, /name="scope"/);
    assert.doesNotMatch(markup, /name="scenario"/);
  });

  test("renders emergency message controls in the developer form", () => {
    const markup = renderToStaticMarkup(
      <DisplaySettingsForm
        {...baseProps}
        operatorSettings={{
          ...defaultOperatorSettings,
          scenario: "emergency",
        }}
        showAnimationDebug
      />,
    );

    assert.match(markup, /name="scenario"/);
    assert.match(markup, /name="emergencyMessage"/);
    assert.match(markup, /name="exitDirection"/);
  });
});
