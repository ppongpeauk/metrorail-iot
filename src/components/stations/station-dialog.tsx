import { X } from "lucide-react";
import type { FormEvent } from "react";
import {
  stationOptionCode,
  type StationOption,
} from "@/lib/display-data";

type StationDialogProps = {
  code: string;
  error: string | null;
  saving: boolean;
  stations: StationOption[];
  stationsLoading: boolean;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function StationDialog({
  code,
  error,
  saving,
  stations,
  stationsLoading,
  onCancel,
  onCodeChange,
  onSubmit,
}: StationDialogProps) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[rgb(0_0_0_/_72%)] p-6 max-sm:items-end max-sm:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        aria-labelledby="station-dialog-title"
        aria-modal="true"
        className="flex w-[min(420px,calc(100vw-32px))] max-h-[min(860px,calc(100svh-32px))] flex-col overflow-hidden rounded-[var(--radius-dialog)] bg-[#111] text-[#f5f5f5] shadow-[0_24px_70px_rgb(0_0_0_/_72%)] max-sm:w-full max-sm:max-h-[calc(100svh-24px)]"
        onSubmit={onSubmit}
        role="dialog"
      >
        <header className="relative flex min-h-0 flex-none items-center justify-end px-[var(--settings-padding-inline)] pt-[var(--settings-padding-block)] max-sm:px-5">
          <button
            aria-label="Close station chooser"
            className="grid size-9 cursor-pointer place-items-center rounded-[var(--radius-panel)] border-0 bg-transparent p-0 text-white hover:bg-[#171717] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
        </header>

        <div className="overflow-auto px-[var(--settings-padding-inline)] pb-7 [scrollbar-color:#555_transparent] [scrollbar-width:thin] max-sm:px-5">
          <section className="pb-6">
            <div className="mb-2">
              <h2 className="m-0 text-[15px] font-bold text-white" id="station-dialog-title">
                Choose Station
              </h2>
            </div>
            <div className="grid max-w-[360px] gap-2">
              <select
                autoFocus
                id="station-code-input"
                className="h-[42px] w-full cursor-pointer rounded-[var(--radius-panel)] border-0 bg-[#202020] px-3 pr-[34px] text-[16px] font-bold text-white outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                disabled={stationsLoading}
                onChange={(event) => onCodeChange(event.target.value)}
                value={code}
              >
                {stationsLoading && <option value={code}>Loading stations…</option>}
                {!stationsLoading && stations.length === 0 && (
                  <option value={code}>No stations available</option>
                )}
                {stations.map((station) => (
                  <option
                    key={station.id}
                    value={stationOptionCode(station, code)}
                  >
                    {station.name}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="m-0 mt-2 max-w-[520px] text-[13px] text-[#ff9a88]" role="alert">
                {error}
              </p>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-[var(--radius-panel)] border-0 bg-[#202020] px-4 text-[13px] text-[#e2e2e2] hover:bg-[#363636] hover:text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-[var(--radius-panel)] border-0 bg-white px-4 text-[13px] font-bold text-[#111] hover:bg-[#e2e2e2] disabled:cursor-wait disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              disabled={saving}
              type="submit"
            >
              {saving ? "Loading…" : "Use station"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
