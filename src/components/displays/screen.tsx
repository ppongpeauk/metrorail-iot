import { LandscapeArrivalsDisplay } from "@/components/arrivals/landscape-arrivals-display";
import { LegacyLandscapeArrivalsDisplay } from "@/components/arrivals/legacy-landscape-arrivals-display";
import { LegacyWideArrivalsDisplay } from "@/components/arrivals/legacy-wide-arrivals-display";
import { WideArrivalsDisplay } from "@/components/arrivals/wide-arrivals-display";
import { EmergencyDisplay } from "@/components/displays/emergency-display";
import { PortraitScreenTransition } from "@/components/displays/portrait-screen-transition";
import {
  arrivalsForDisplay,
  type DisplayState,
} from "@/lib/display-data";
import type { TransitAlert } from "@/lib/alert-contract";
import type { DisplayMode } from "@/lib/display-mode";

export function Screen({
  alerts,
  display,
  mode,
  onAlertComplete,
}: {
  alerts?: TransitAlert[];
  display: DisplayState;
  mode: DisplayMode;
  onAlertComplete?: () => void;
}) {
  const arrivals = arrivalsForDisplay(display);
  const alert = display.kind === "alert" ? display.alert : null;
  const alertType =
    display.kind === "alert" ? display.alertType : undefined;

  if (display.kind === "emergency") {
    return <EmergencyDisplay display={display} mode={mode} />;
  }

  if (mode === "landscape-arrivals" || mode === "landscape-arrivals-5") {
    return (
      <LandscapeArrivalsDisplay
        arrivals={arrivals}
        alert={alert}
        alertType={alertType}
        onAlertComplete={onAlertComplete}
        rowCount={mode === "landscape-arrivals-5" ? 5 : 4}
      />
    );
  }
  if (mode === "legacy-landscape-arrivals") {
    return <LegacyLandscapeArrivalsDisplay alerts={alerts} arrivals={arrivals} />;
  }
  if (mode === "legacy-wide-arrivals") {
    return (
      <LegacyWideArrivalsDisplay
        alert={alert}
        alertType={alertType}
        arrivals={arrivals}
        onAlertComplete={onAlertComplete}
      />
    );
  }
  if (mode === "wide-arrivals") {
    return (
      <WideArrivalsDisplay
        alert={alert}
        alertType={alertType}
        arrivals={arrivals}
        onAlertComplete={onAlertComplete}
      />
    );
  }
  if (display.kind === "alert" || display.kind === "station") {
    return <PortraitScreenTransition display={display} mode={mode} />;
  }
  return null;
}
