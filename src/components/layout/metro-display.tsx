"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Screen } from "@/components/displays/screen";
import {
  type ArrivalDebugAction,
  ScreenSwitcher,
} from "@/components/controls/screen-switcher";
import { useAlertRotation } from "@/components/alerts/use-alert-rotation";
import { StationDialog } from "@/components/stations/station-dialog";
import {
  fetchTransitAlerts,
  type TransitAlert,
} from "@/lib/alert-contract";
import { APP_CONFIG } from "@/lib/config";
import {
  type Arrival,
  applyStationToDisplays,
  arrivalsForDisplay,
  defaultDisplayConfigs,
  type DisplayConfig,
  type DisplayState,
  filterDisplayByDirection,
  getDisplayStates,
  listStationOptions,
  resolveStationCode,
  type StationOption,
  stationDisplayWithArrivals,
} from "@/lib/display-data";
import {
  type DisplayMode,
  isDisplayMode,
  primaryDisplayModes,
  screenAspect,
} from "@/lib/display-mode";
import {
  defaultOperatorSettings,
  type OperatorSettings,
  parseOperatorSettings,
  resolveOperatorDisplay,
} from "@/lib/operator-control";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const showDeveloperControls = process.env.NODE_ENV !== "production";
const defaultStationCode = APP_CONFIG.defaultStation.code;
const defaultStation = {
  stationName: APP_CONFIG.defaultStation.name,
  stopId: APP_CONFIG.defaultStation.code,
};

type StationEditor = {
  code: string;
  error: string | null;
  saving: boolean;
};

function configsForStation(station: {
  stationName: string;
  stopId: string;
}): DisplayConfig[] {
  return applyStationToDisplays(defaultDisplayConfigs, station);
}

function withDebugArrivals(
  display: DisplayState,
  arrivals: Arrival[],
): DisplayState {
  if (display.kind === "station") {
    return stationDisplayWithArrivals(display, arrivals);
  }
  if (display.kind === "alert") {
    return { ...display, arrivals };
  }
  return display;
}

export function MetroDisplay({ stationCode }: { stationCode: string }) {
  const router = useRouter();
  const normalizedStationCode = stationCode.trim().toUpperCase();
  const [displayConfigs, setDisplayConfigs] = useState<DisplayConfig[]>(() =>
    configsForStation(defaultStation),
  );
  const [resolvedStationCode, setResolvedStationCode] = useState<string | null>(
    normalizedStationCode === defaultStationCode
      ? defaultStationCode
      : null,
  );
  const [stationError, setStationError] = useState<string | null>(null);
  const [mode, setMode] = useState<DisplayMode>("landscape-arrivals");
  const [operatorSettings, setOperatorSettings] =
    useState<OperatorSettings>(defaultOperatorSettings);
  const [direction, setDirection] = useState<string | null>(null);
  const [stationEditor, setStationEditor] =
    useState<StationEditor | null>(null);
  const [debugArrivals, setDebugArrivals] = useState<
    Partial<Record<string, Arrival[]>>
  >({});
  const debugId = useRef(0);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(
      APP_CONFIG.storageKeys.displayMode,
    );
    if (savedMode && isDisplayMode(savedMode)) setMode(savedMode);
    if (showDeveloperControls) {
      setOperatorSettings(
        parseOperatorSettings(
          window.localStorage.getItem(APP_CONFIG.storageKeys.operatorSettings),
        ),
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDebugArrivals({});
    setStationError(null);
    setDirection(null);

    if (normalizedStationCode === defaultStationCode) {
      setDisplayConfigs(configsForStation(defaultStation));
      setResolvedStationCode(defaultStationCode);
      return () => {
        cancelled = true;
      };
    }

    setResolvedStationCode(null);
    void resolveStationCode(normalizedStationCode)
      .then((station) => {
        if (cancelled) return;
        setDisplayConfigs(configsForStation(station));
        setResolvedStationCode(normalizedStationCode);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStationError(
          error instanceof Error
            ? error.message
            : "That station could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedStationCode]);

  const {
    data = [],
    isPending,
  } = useQuery({
    enabled: resolvedStationCode === normalizedStationCode,
    queryKey: ["display-states", displayConfigs],
    queryFn: () => getDisplayStates(displayConfigs),
    refetchInterval: APP_CONFIG.client.pollingIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
  const {
    data: stationOptions = [],
    isPending: stationOptionsLoading,
  } = useQuery<StationOption[]>({
    queryKey: ["station-options"],
    queryFn: listStationOptions,
    staleTime: APP_CONFIG.client.stationOptionsStaleTimeMs,
    enabled: stationEditor !== null,
  });
  const {
    data: alertsResponse,
  } = useQuery({
    enabled: resolvedStationCode === normalizedStationCode,
    queryKey: ["transit-alerts", normalizedStationCode],
    queryFn: () => fetchTransitAlerts(normalizedStationCode),
    refetchInterval: APP_CONFIG.client.pollingIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
  const manualAlerts = useMemo<TransitAlert[]>(() => {
    if (
      !showDeveloperControls ||
      (operatorSettings.scenario !== "service-alert" &&
        operatorSettings.scenario !== "facility-alert")
    ) {
      return [];
    }
    const type =
      operatorSettings.scenario === "facility-alert"
        ? "facility"
        : "service";
    const text =
      type === "facility"
        ? operatorSettings.facilityMessage
        : operatorSettings.serviceMessage;
    return text.trim()
      ? [{
        id: `manual:${type}`,
        sourceHash: `manual:${type}:${text}`,
        text,
        type,
      }]
      : [];
  }, [operatorSettings]);
  const queuedAlerts =
    operatorSettings.scenario === "normal"
      ? (alertsResponse?.alerts ?? [])
      : manualAlerts;
  const completionDrivenAlert =
    mode === "landscape-arrivals" ||
    mode === "landscape-arrivals-5" ||
    mode === "wide-arrivals" ||
    mode === "legacy-wide-arrivals";
  const {
    alert: rotatingAlert,
    completeAlert: completeRotatingAlert,
  } = useAlertRotation(queuedAlerts, {
    completionDriven: completionDrivenAlert,
  });

  const directionOptions = useMemo(
    () =>
      [
        ...new Set(
          data.flatMap((display) =>
            arrivalsForDisplay(display).map(
              (arrival) => arrival.direction,
            ),
          ),
        ),
      ].sort(),
    [data],
  );
  const activeRawDisplay = useMemo(
    () =>
      resolveOperatorDisplay(
        data,
        operatorSettings,
        mode === "legacy-landscape-arrivals" ? null : rotatingAlert,
      ),
    [data, mode, operatorSettings, rotatingAlert],
  );
  const unfilteredActiveDisplay = useMemo(() => {
    if (!activeRawDisplay) return null;
    const arrivals = debugArrivals[activeRawDisplay.id];
    return arrivals
      ? withDebugArrivals(activeRawDisplay, arrivals)
      : activeRawDisplay;
  }, [activeRawDisplay, debugArrivals]);
  const activeDisplay = unfilteredActiveDisplay
    ? filterDisplayByDirection(unfilteredActiveDisplay, direction)
    : undefined;

  const updateOperatorSettings = useCallback(
    (next: OperatorSettings) => {
      setOperatorSettings(next);
      window.localStorage.setItem(
        APP_CONFIG.storageKeys.operatorSettings,
        JSON.stringify(next),
      );
    },
    [],
  );

  const selectStation = useCallback(() => {
    setStationEditor({
      code: normalizedStationCode,
      error: null,
      saving: false,
    });
  }, [normalizedStationCode]);

  const saveStation = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!stationEditor || stationEditor.saving) return;
      setStationEditor((editor) =>
        editor ? { ...editor, error: null, saving: true } : editor,
      );
      try {
        await resolveStationCode(stationEditor.code);
        setStationEditor(null);
        router.push(`/${stationEditor.code.trim().toUpperCase()}`);
      } catch (error) {
        setStationEditor((editor) =>
          editor
            ? {
              ...editor,
              error:
                error instanceof Error
                  ? error.message
                  : "That station could not be loaded.",
              saving: false,
            }
            : editor,
        );
      }
    },
    [router, stationEditor],
  );

  const selectMode = useCallback(
    (nextMode: DisplayMode) => {
      setMode(nextMode);
      window.localStorage.setItem(
        APP_CONFIG.storageKeys.displayMode,
        nextMode,
      );
    },
    [],
  );

  const applyDebugAction = useCallback(
    (action: ArrivalDebugAction) => {
      if (!activeRawDisplay || activeRawDisplay.kind === "emergency") return;
      const displayId = activeRawDisplay.id;

      setDebugArrivals((current) => {
        if (action === "reset") {
          const next = { ...current };
          delete next[displayId];
          return next;
        }

        const arrivals = [
          ...(current[displayId] ??
            arrivalsForDisplay(activeRawDisplay)),
        ];
        const reference = arrivals[0];
        const makeArrival = (now: boolean): Arrival => {
          debugId.current += 1;
          const id = `debug-${Date.now()}-${debugId.current}`;
          return {
            id,
            tripId: id,
            line: reference?.line ?? "RD",
            direction: reference?.direction ?? "Northbound",
            destination: reference?.destination ?? "Glenmont",
            arrival: now ? "ARR" : "2 min",
            now,
            cars: reference?.cars ?? null,
            occupancyStatus: reference?.occupancyStatus ?? null,
          };
        };

        const nextArrivals =
          action === "add-now"
            ? [makeArrival(true), ...arrivals]
            : action === "add-next"
              ? [...arrivals, makeArrival(false)]
              : action === "remove-first"
                ? arrivals.slice(1)
                : action === "remove-last"
                  ? arrivals.slice(0, -1)
                  : [];

        return { ...current, [displayId]: nextArrivals };
      });
    },
    [activeRawDisplay],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const requestedScreen = Number(event.key) - 1;
      if (
        /^\d$/.test(event.key) &&
        requestedScreen >= 0 &&
        requestedScreen < primaryDisplayModes.length
      ) {
        selectMode(primaryDisplayModes[requestedScreen]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectMode]);

  if (stationError) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-2.5 bg-black p-6 text-center text-white">
        <strong>Unable to fetch station {normalizedStationCode}.</strong>
      </main>
    );
  }

  if (
    resolvedStationCode !== normalizedStationCode ||
    isPending ||
    !data.length
  ) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-black p-6 text-white">
        <Spinner className="size-8" />
      </main>
    );
  }
  if (!activeDisplay) {
    return <main className="flex min-h-svh items-center justify-center bg-black p-6 text-white">No displays are available</main>;
  }

  return (
    <main className="display-stage relative grid min-h-svh place-items-center overflow-hidden bg-[var(--stage)]">
      <article
        className={cn(
          "relative isolate flex aspect-[9/16] min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--black)] p-[var(--sign-space)] text-[3.2cqw] font-bold leading-[1.2] tracking-normal text-[var(--white)] [container-type:size] [height:min(100svh,177.7778vw)] [width:min(100vw,56.25svh)]",
          screenAspect(mode) === "16:9"
            ? "aspect-[16/9] [--sign-space:min(1.1cqw,1.95cqh)] [height:min(100svh,56.25vw)] [width:min(100vw,177.7778svh)]"
            : screenAspect(mode) === "4:1" &&
            "aspect-[4/1] [height:min(100svh,25vw)] [width:min(100vw,400svh)]",
        )}
        data-override-scope={operatorSettings.scope}
        data-screen-location={operatorSettings.location}
        data-screen-kind={activeDisplay.kind}
        data-screen-mode={mode}
        data-screen-scenario={operatorSettings.scenario}
      >
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            activeDisplay.kind === "emergency" && "gap-[1.25cqh]",
          )}
        >
          <Screen
            alerts={
              mode === "legacy-landscape-arrivals"
                ? queuedAlerts
                : undefined
            }
            display={activeDisplay}
            mode={mode}
            onAlertComplete={
              completionDrivenAlert
                ? completeRotatingAlert
                : undefined
            }
          />
        </div>
      </article>
      <ScreenSwitcher
        arrivalCount={arrivalsForDisplay(activeDisplay).length}
        direction={direction}
        directionOptions={directionOptions}
        debugActive={Boolean(debugArrivals[activeDisplay.id])}
        mode={mode}
        operatorSettings={operatorSettings}
        onDirectionChange={setDirection}
        onDebugAction={applyDebugAction}
        onModeChange={selectMode}
        onOperatorSettingsChange={updateOperatorSettings}
        onSelectStation={selectStation}
        stationDialogOpen={Boolean(stationEditor)}
      />
      {stationEditor && (
        <StationDialog
          code={stationEditor.code}
          error={stationEditor.error}
          onCancel={() => setStationEditor(null)}
          onCodeChange={(code) =>
            setStationEditor((editor) =>
              editor ? { ...editor, code, error: null } : editor,
            )
          }
          onSubmit={saveStation}
          saving={stationEditor.saving}
          stations={stationOptions}
          stationsLoading={stationOptionsLoading}
        />
      )}
    </main>
  );
}
