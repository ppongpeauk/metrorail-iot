import { ExitArrow } from "@/components/displays/exit-arrow";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import type { DisplayState } from "@/lib/display-data";
import type { DisplayMode } from "@/lib/display-mode";

export function EmergencyDisplay({
  display,
  mode,
}: {
  display: Extract<DisplayState, { kind: "emergency" }>;
  mode: DisplayMode;
}) {
  const message = display.message.split("\n");
  const wide =
    mode === "wide-arrivals" || mode === "legacy-wide-arrivals";
  const landscape =
    mode === "landscape-arrivals" ||
    mode === "landscape-arrivals-5" ||
    mode === "legacy-landscape-arrivals";

  if (wide) {
    return (
      <main className="grid min-h-0 flex-1 grid-cols-[max-content_minmax(0,1fr)_40cqh] items-center gap-[7cqh] bg-[var(--emergency)] px-[2.4cqw] text-white">
        <strong className="inline-flex items-center gap-[5cqh] text-[15cqh]">
          <span
            aria-hidden="true"
            className="grid size-[25cqh] place-items-center rounded-full bg-white text-[17cqh] text-[var(--emergency)]"
          >
            !
          </span>
          Emergency
        </strong>
        <h2 className="m-0 overflow-hidden text-[24cqh] leading-none text-ellipsis whitespace-nowrap">
          {message.join(" ")}
        </h2>
        <ExitArrow
          className="!ml-0 !w-[34cqh]"
          direction={display.direction}
        />
      </main>
    );
  }

  if (landscape) {
    return (
      <>
        <header className="flex min-h-[16cqh] flex-none items-center gap-[2.5cqw] rounded-[var(--radius-panel)] bg-[var(--emergency)] px-[2.4cqw] text-[5.5cqw] text-white">
          <span
            aria-hidden="true"
            className="grid size-[6cqw] place-items-center rounded-full bg-white text-[4.2cqw] text-[var(--emergency)]"
          >
            !
          </span>
          <strong>Emergency</strong>
        </header>
        <main className="mt-[var(--sign-space)] grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_35cqw] items-center gap-[5cqw] rounded-[var(--radius-panel)] bg-[var(--emergency)] px-[5cqw] text-white">
          <h2 className="m-0 flex flex-col text-[9.5cqw] leading-[0.92]">
            {message.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <ExitArrow
            className="!ml-0 !w-[28cqw]"
            direction={display.direction}
          />
        </main>
        <Footer emergency />
      </>
    );
  }

  return (
    <>
      <Header title={display.stationName} emergency />
      <main className="flex min-h-0 flex-1 flex-col justify-between rounded-[var(--radius-panel)] bg-[var(--emergency)] px-[5.7cqw] pb-[1.2cqh] pl-[var(--content-inline-start)] pt-[0.4cqh]">
        <h2 className="m-0 flex flex-col text-[12.75cqw] leading-none">
          {message.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <ExitArrow direction={display.direction} />
      </main>
      <Footer emergency />
    </>
  );
}
