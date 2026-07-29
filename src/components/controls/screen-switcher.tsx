"use client";

import {
  MapPin,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimationDebugPanel,
  type ArrivalDebugAction,
} from "@/components/controls/animation-debug-panel";
import { DisplaySettingsForm } from "@/components/controls/display-settings-form";
import { APP_CONFIG } from "@/lib/config";
import type { DisplayMode } from "@/lib/display-mode";
import type { OperatorSettings } from "@/lib/operator-control";
import { cn } from "@/lib/utils";

export type { ArrivalDebugAction } from "@/components/controls/animation-debug-panel";

const showAnimationDebug = process.env.NODE_ENV !== "production";
const floatingControlButtonClassName =
  "grid w-12 cursor-pointer place-items-center border-0 bg-transparent p-0 text-inherit transition-[background-color,color] duration-150 hover:bg-[rgb(255_255_255_/_9%)] hover:text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-3px]";

export function ScreenSwitcher({
  arrivalCount,
  direction,
  directionOptions,
  debugActive,
  mode,
  operatorSettings,
  onDirectionChange,
  onDebugAction,
  onModeChange,
  onOperatorSettingsChange,
  onSelectStation,
  stationDialogOpen,
}: {
  arrivalCount: number;
  direction: string | null;
  directionOptions: string[];
  debugActive: boolean;
  mode: DisplayMode;
  operatorSettings: OperatorSettings;
  onDirectionChange: (direction: string | null) => void;
  onDebugAction: (action: ArrivalDebugAction) => void;
  onModeChange: (mode: DisplayMode) => void;
  onOperatorSettingsChange: (settings: OperatorSettings) => void;
  onSelectStation: () => void;
  stationDialogOpen: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [triggerVisible, setTriggerVisible] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number | null>(null);
  const dialogMounted = dialogOpen;
  const controlsVisible =
    triggerVisible || dialogMounted || stationDialogOpen;
  const openDialog = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setTriggerVisible(true);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dialogMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog, dialogMounted]);

  useEffect(
    () => () => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    function revealTrigger() {
      setTriggerVisible(true);
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
      }
      if (!dialogOpen && !stationDialogOpen) {
        hideTimer.current = window.setTimeout(
          () => setTriggerVisible(false),
          APP_CONFIG.display.controlsIdleHideDelayMs,
        );
      }
    }

    revealTrigger();
    window.addEventListener("pointermove", revealTrigger);
    window.addEventListener("pointerdown", revealTrigger);
    window.addEventListener("keydown", revealTrigger);
    window.addEventListener("touchstart", revealTrigger, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", revealTrigger);
      window.removeEventListener("pointerdown", revealTrigger);
      window.removeEventListener("keydown", revealTrigger);
      window.removeEventListener("touchstart", revealTrigger);
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
      }
    };
  }, [dialogOpen, stationDialogOpen]);

  useEffect(() => {
    document.documentElement.dataset.displayIdle = String(
      !controlsVisible,
    );
    return () => {
      delete document.documentElement.dataset.displayIdle;
    };
  }, [controlsVisible]);

  return (
    <nav
      className="fixed right-[14px] bottom-[14px] z-20"
      aria-label="Display controls"
      data-controls-visible={controlsVisible}
    >
      <div
        className={cn(
          "flex h-12 items-stretch overflow-hidden rounded-full bg-[rgb(26_26_26_/_88%)] border border-neutral-800 text-[#d8d8d8] shadow-[0_5px_20px_rgb(0_0_0_/_34%)] transition-[opacity,transform] duration-[220ms] ease-in-out focus-within:pointer-events-auto focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
          controlsVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none translate-y-1 opacity-0",
        )}
      >
        <button
          aria-expanded={dialogMounted}
          aria-haspopup="dialog"
          aria-label="Open display controls"
          className={floatingControlButtonClassName}
          onClick={openDialog}
          ref={triggerRef}
          type="button"
        >
          <Settings aria-hidden="true" size={24} strokeWidth={2} />
        </button>
        <span
          aria-hidden="true"
          className="my-2.5 w-px flex-none bg-[rgb(255_255_255_/_18%)]"
        />
        <button
          aria-label="Choose a station"
          aria-haspopup="dialog"
          className={floatingControlButtonClassName}
          onClick={onSelectStation}
          type="button"
        >
          <MapPin aria-hidden="true" size={24} strokeWidth={2} />
        </button>
      </div>

      {dialogMounted && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-[rgb(0_0_0_/_72%)] p-6 max-sm:items-end max-sm:p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            aria-label="Display controls"
            aria-modal="true"
            className="flex w-[min(760px,calc(100vw-32px))] max-h-[min(860px,calc(100svh-32px))] flex-col overflow-hidden rounded-[var(--radius-dialog)] bg-[#111] text-[#f5f5f5] shadow-[0_24px_70px_rgb(0_0_0_/_72%)] max-sm:w-full max-sm:max-h-[calc(100svh-24px)]"
            role="dialog"
          >
            <header className="relative flex min-h-0 flex-none items-center justify-end px-[var(--settings-padding-inline)] pt-[var(--settings-padding-block)] max-sm:px-5">
              <button
                aria-label="Close display controls"
                className="grid size-9 cursor-pointer place-items-center rounded-[var(--radius-panel)] border-0 bg-transparent p-0 text-white hover:bg-[#171717] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                onClick={closeDialog}
                type="button"
              >
                <X aria-hidden="true" size={17} strokeWidth={1.8} />
              </button>
            </header>

            <div className="overflow-auto px-[var(--settings-padding-inline)] pb-7 [scrollbar-color:#555_transparent] [scrollbar-width:thin] max-sm:px-5">
              <DisplaySettingsForm
                direction={direction}
                directionOptions={directionOptions}
                mode={mode}
                onDirectionChange={onDirectionChange}
                onModeChange={onModeChange}
                onOperatorSettingsChange={onOperatorSettingsChange}
                operatorSettings={operatorSettings}
                showAnimationDebug={showAnimationDebug}
              />

              {showAnimationDebug && (
                <AnimationDebugPanel
                  arrivalCount={arrivalCount}
                  debugActive={debugActive}
                  onDebugAction={onDebugAction}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </nav>
  );
}
