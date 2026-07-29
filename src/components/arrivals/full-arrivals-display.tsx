import { AnimatedArrivalRows } from "@/components/arrivals/animated-arrival-rows";
import { ArrivalHead } from "@/components/arrivals/arrival-head";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import type { Arrival } from "@/lib/display-data";

export function FullArrivalsDisplay({
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
        arrivals={arrivals.slice(0, 9)}
        className="min-h-0 flex-none gap-[var(--sign-space)] overflow-hidden"
        rowClassName="min-h-[6.45cqh]"
      />
      <Footer />
    </>
  );
}
