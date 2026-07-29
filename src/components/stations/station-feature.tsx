import Image from "next/image";
import type { StationFeature as StationFeatureKind } from "@/lib/station-features";
import { stationFeatureLabels } from "@/lib/station-features";
import { cn } from "@/lib/utils";

const featureImages: Record<StationFeatureKind, string> = {
  parking: "/symbols/parking.png",
  hospital: "/symbols/hospital.png",
  airport: "/symbols/airport.png",
  amtrak: "/symbols/amtrak.png",
  vre: "/symbols/vre.png",
  marc: "/symbols/marc.png",
};

export function StationFeature({
  feature,
  className,
}: {
  feature: StationFeatureKind;
  className?: string;
}) {
  return (
    <span
      aria-label={stationFeatureLabels[feature]}
      className={cn(
        "inline-flex size-[3.8cqw] items-center justify-center",
        feature === "amtrak" && "h-[2.7cqw] w-[5.2cqw]",
        feature === "marc" && "h-[2.2cqw] w-[5.2cqw]",
        feature === "vre" && "size-[3.6cqw]",
        "[&>img]:h-full [&>img]:w-full [&>img]:object-contain",
        className,
      )}
    >
      <Image
        alt=""
        height={128}
        src={featureImages[feature]}
        width={256}
      />
    </span>
  );
}
