"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  type DisplayMode,
  screenProfileGroups,
  screenProfiles,
} from "@/lib/display-mode";
import {
  type OperatorSettings,
  exitDirections,
  operatingScenarios,
  overrideScopes,
  screenLocations,
  type OperatingScenario,
  type OverrideScope,
  type ScreenLocation,
} from "@/lib/operator-control";

type DisplaySettingsFormValues = {
  mode: DisplayMode;
  direction: string;
  scenario: OperatingScenario;
  scope: OverrideScope;
  location: ScreenLocation;
  serviceMessage: string;
  facilityMessage: string;
  emergencyMessage: string;
  exitDirection: OperatorSettings["exitDirection"];
};

type DisplaySettingsFormProps = {
  direction: string | null;
  directionOptions: string[];
  mode: DisplayMode;
  operatorSettings: OperatorSettings;
  showAnimationDebug: boolean;
  onDirectionChange: (direction: string | null) => void;
  onModeChange: (mode: DisplayMode) => void;
  onOperatorSettingsChange: (settings: OperatorSettings) => void;
};

const selectClassName =
  "h-[42px] w-full cursor-pointer rounded-[var(--radius-panel)] border-0 bg-[#202020] px-3 pr-[34px] text-[16px] !font-bold text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2";
const messageClassName =
  "min-h-24 w-full resize-y rounded-[var(--radius-panel)] border border-[#343434] bg-[#202020] px-3 py-2.5 text-[16px] !font-bold leading-[1.35] text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2";
const fieldLabelClassName = "grid gap-1.5 text-[16px] !font-bold text-white";

function valuesForProps(
  mode: DisplayMode,
  direction: string | null,
  operatorSettings: OperatorSettings,
): DisplaySettingsFormValues {
  return {
    mode,
    direction: direction ?? "",
    ...operatorSettings,
  };
}

function settingsForValues(
  values: DisplaySettingsFormValues,
): OperatorSettings {
  return {
    scenario: values.scenario,
    scope: values.scope,
    location: values.location,
    serviceMessage: values.serviceMessage,
    facilityMessage: values.facilityMessage,
    emergencyMessage: values.emergencyMessage,
    exitDirection: values.exitDirection,
  };
}

function settingsEqual(
  left: OperatorSettings,
  right: OperatorSettings,
): boolean {
  return (
    left.scenario === right.scenario &&
    left.scope === right.scope &&
    left.location === right.location &&
    left.serviceMessage === right.serviceMessage &&
    left.facilityMessage === right.facilityMessage &&
    left.emergencyMessage === right.emergencyMessage &&
    left.exitDirection === right.exitDirection
  );
}

function formSignature(values: DisplaySettingsFormValues): string {
  return JSON.stringify(values);
}

export function DisplaySettingsForm({
  direction,
  directionOptions,
  mode,
  operatorSettings,
  showAnimationDebug,
  onDirectionChange,
  onModeChange,
  onOperatorSettingsChange,
}: DisplaySettingsFormProps) {
  const defaultValues = useMemo(
    () => valuesForProps(mode, direction, operatorSettings),
    [direction, mode, operatorSettings],
  );
  const { control, register, reset } = useForm<DisplaySettingsFormValues>({
    defaultValues,
    mode: "onChange",
  });
  const watchedValues = useWatch({ control });
  const values = useMemo<DisplaySettingsFormValues>(
    () => ({
      mode: watchedValues.mode ?? defaultValues.mode,
      direction: watchedValues.direction ?? defaultValues.direction,
      scenario: watchedValues.scenario ?? defaultValues.scenario,
      scope: watchedValues.scope ?? defaultValues.scope,
      location: watchedValues.location ?? defaultValues.location,
      serviceMessage:
        watchedValues.serviceMessage ?? defaultValues.serviceMessage,
      facilityMessage:
        watchedValues.facilityMessage ?? defaultValues.facilityMessage,
      emergencyMessage:
        watchedValues.emergencyMessage ?? defaultValues.emergencyMessage,
      exitDirection:
        watchedValues.exitDirection ?? defaultValues.exitDirection,
    }),
    [defaultValues, watchedValues],
  );
  const skipSyncRef = useRef(true);
  const lastEmittedSignatureRef = useRef(formSignature(defaultValues));

  useEffect(() => {
    skipSyncRef.current = true;
    lastEmittedSignatureRef.current = formSignature(defaultValues);
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    const signature = formSignature(values);
    if (signature === lastEmittedSignatureRef.current) return;
    lastEmittedSignatureRef.current = signature;

    const nextSettings = settingsForValues(values);
    const nextDirection = values.direction || null;
    if (values.mode !== mode) onModeChange(values.mode);
    if (nextDirection !== direction) onDirectionChange(nextDirection);
    if (!settingsEqual(nextSettings, operatorSettings)) {
      onOperatorSettingsChange(nextSettings);
    }
  }, [
    direction,
    mode,
    onDirectionChange,
    onModeChange,
    onOperatorSettingsChange,
    operatorSettings,
    values,
  ]);

  const messageField =
    values.scenario === "service-alert"
      ? "serviceMessage"
      : values.scenario === "facility-alert"
        ? "facilityMessage"
        : values.scenario === "emergency"
          ? "emergencyMessage"
          : null;
  const messageLabel =
    values.scenario === "emergency"
      ? "Emergency instruction"
      : "Passenger message";

  return (
    <form
      className="contents"
      onSubmit={(event) => event.preventDefault()}
    >
      <section className="pb-6">
        <label className="grid max-w-[360px] gap-2 text-[15px] font-bold text-white">
          Screen layout
          <select className={selectClassName} {...register("mode")}>
            {screenProfileGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {screenProfiles
                  .filter((profile) => profile.group === group.id)
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      {showAnimationDebug && (
        <section className="pb-6">
          <label className="grid max-w-[360px] gap-2 text-[15px] font-bold text-white">
            Operating state
            <select className={selectClassName} {...register("scenario")}>
              {operatingScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <section className="pb-6">
        <h3 className="mb-2 text-[15px] font-bold text-white">
          Assignment and targeting
        </h3>
        <div className="grid max-w-[520px] grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className={fieldLabelClassName}>
            Installation
            <select className={selectClassName} {...register("location")}>
              {screenLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.title}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClassName}>
            Override scope
            <select className={selectClassName} {...register("scope")}>
              {overrideScopes.map((scope) => (
                <option key={scope.id} value={scope.id}>
                  {scope.title}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabelClassName}>
            Direction
            <select className={selectClassName} {...register("direction")}>
              <option value="">All directions</option>
              {directionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {values.scenario === "emergency" && (
            <label className={fieldLabelClassName}>
              Exit arrow
              <select
                className={selectClassName}
                {...register("exitDirection")}
              >
                {exitDirections.map((directionOption) => (
                  <option
                    key={directionOption.id}
                    value={directionOption.id}
                  >
                    {directionOption.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {showAnimationDebug && messageField && (
        <section className="pb-6">
          <label className="grid max-w-[520px] gap-2">
            <span className="text-[16px] font-bold text-white">
              {messageLabel}
            </span>
            <textarea
              className={messageClassName}
              {...register(messageField)}
            />
          </label>
        </section>
      )}
    </form>
  );
}
