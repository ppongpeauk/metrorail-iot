import { PersonStanding } from "lucide-react";
import {
  occupancySymbolCount,
  type OccupancyStatus,
} from "@/lib/arrival-contract";
import { cn } from "@/lib/utils";

const occupancyLabels: Record<OccupancyStatus, string> = {
  EMPTY: "Empty",
  MANY_SEATS_AVAILABLE: "Rail car less than 20% occupied",
  FEW_SEATS_AVAILABLE: "Rail car 20% - 32% occupied",
  STANDING_ROOM_ONLY: "Standing room only",
  CRUSHED_STANDING_ROOM_ONLY: "Crowded standing room only",
  FULL: "Rail car is occupied 33% or greater",
  NOT_ACCEPTING_PASSENGERS: "Not accepting passengers",
  NO_DATA_AVAILABLE: "Occupancy unavailable",
  NOT_BOARDABLE: "Not boardable",
};

export function OccupancyIndicator({
  status,
  className,
  symbol = "standard",
}: {
  status: OccupancyStatus | null;
  className?: string;
  symbol?: "legacy" | "standard";
}) {
  const symbolCount = occupancySymbolCount(status);
  if (symbolCount === 0) return null;

  return (
    <span
      aria-label={status ? occupancyLabels[status] : undefined}
      className={cn("inline-flex items-center", className)}
      role="img"
    >
      {Array.from({ length: symbolCount }, (_, index) => (
        symbol === "legacy" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden="true"
            className="h-[1em] w-auto invert"
            key={index}
            src="/symbols/legacy-person.svg"
          />
        ) : (
          <PersonStanding aria-hidden="true" key={index} />
        )
      ))}
    </span>
  );
}
