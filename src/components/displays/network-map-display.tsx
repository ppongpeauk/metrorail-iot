import Image from "next/image";
import { AnimatedArrivalRows } from "@/components/arrivals/animated-arrival-rows";
import { ArrivalHead } from "@/components/arrivals/arrival-head";
import { Header } from "@/components/layout/header";
import type { Arrival } from "@/lib/display-data";

export function NetworkMapDisplay({
  arrivals,
  showHeader = true,
  stationName,
}: {
  arrivals: Arrival[];
  showHeader?: boolean;
  stationName: string;
}) {
  return (
    <>
      {showHeader && <Header title={stationName} />}
      <ArrivalHead />
      <AnimatedArrivalRows
        arrivals={arrivals.slice(0, 4)}
        className="min-h-[calc(29.8cqh+var(--sign-space)+var(--sign-space)+var(--sign-space))] max-h-[calc(29.8cqh+var(--sign-space)+var(--sign-space)+var(--sign-space))] flex-none gap-[var(--sign-space)] overflow-hidden"
        rowClassName="min-h-[7.45cqh]"
      />
      <figure className="relative m-0 mt-[var(--sign-space)] min-h-0 flex-1 overflow-hidden rounded-[var(--radius-panel)] bg-white">
        <Image
          alt="WMATA Metrorail system map"
          className="object-cover"
          fill
          priority
          sizes="(max-aspect-ratio: 9/16) 100vw, 56.25vh"
          src="/maps/wmata-system-map-square.webp"
        />
      </figure>
    </>
  );
}
