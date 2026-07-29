"use client";

import { Plus, RefreshCcw, Trash2 } from "lucide-react";

export type ArrivalDebugAction =
  | "add-now"
  | "add-next"
  | "remove-first"
  | "remove-last"
  | "clear"
  | "reset";

export function AnimationDebugPanel({
  arrivalCount,
  debugActive,
  onDebugAction,
}: {
  arrivalCount: number;
  debugActive: boolean;
  onDebugAction: (action: ArrivalDebugAction) => void;
}) {
  return (
    <>
      <div className="mb-[26px] h-px bg-[#343434]" />

      <section className="pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="m-0 text-[15px] font-bold text-white">
              Animation Debug
            </h3>
            <p className="m-0 mt-1 text-[13px] font-normal text-[#d0d0d0]">
              {arrivalCount} rows
              {debugActive ? " · edited" : " · live"}
            </p>
          </div>
          <button
            className="inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-[var(--radius-panel)] border-0 bg-[#202020] px-[9px] text-[11px] text-[#cfcfcf] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            disabled={!debugActive}
            onClick={() => onDebugAction("reset")}
            type="button"
          >
            <RefreshCcw aria-hidden="true" size={13} strokeWidth={1.8} />
            Reset
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-panel)] border-0 bg-[#202020] px-2.5 text-[11px] text-[#e2e2e2] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            onClick={() => onDebugAction("add-now")}
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            Add NOW first
          </button>
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-panel)] border-0 bg-[#202020] px-2.5 text-[11px] text-[#e2e2e2] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            onClick={() => onDebugAction("add-next")}
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            Add 2 min last
          </button>
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-panel)] border-0 bg-[#202020] px-2.5 text-[11px] text-[#e2e2e2] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            disabled={!arrivalCount}
            onClick={() => onDebugAction("remove-first")}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} />
            Remove first
          </button>
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-panel)] border-0 bg-[#202020] px-2.5 text-[11px] text-[#e2e2e2] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            disabled={!arrivalCount}
            onClick={() => onDebugAction("remove-last")}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} />
            Remove last
          </button>
          <button
            className="col-span-full inline-flex min-h-9 cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-panel)] border-0 bg-transparent px-2.5 text-[11px] text-[#b8b8b8] hover:bg-[#363636] hover:text-white disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            disabled={!arrivalCount}
            onClick={() => onDebugAction("clear")}
            type="button"
          >
            Clear all rows
          </button>
        </div>
      </section>
    </>
  );
}
