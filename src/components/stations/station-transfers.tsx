import { LineBadge } from "@/components/shared/line-badge";
import { StationFeature } from "@/components/stations/station-feature";
import type { Station } from "@/lib/display-data";
import { stationFeaturesFor } from "@/lib/station-features";
import { cn } from "@/lib/utils";

export function StationTransfers({ station }: { station: Station }) {
  const features = stationFeaturesFor(station.name);
  if (!station.lines?.length && !features.length) return null;

  return (
    <div
      className={cn(
        "col-start-3 flex items-center gap-[0.5cqw]",
        station.selected && "relative z-[1]",
      )}
    >
      {station.lines?.map((line) => (
        <LineBadge
          className={station.muted ? "bg-[#8f8f8f] text-[#171717]" : undefined}
          line={line}
          mini
          key={line}
        />
      ))}
      {features.map((feature) => (
        <StationFeature
          className={station.selected ? "[&>img]:invert" : undefined}
          feature={feature}
          key={feature}
        />
      ))}
    </div>
  );
}
