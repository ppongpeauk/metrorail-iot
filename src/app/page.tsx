import { MetroDisplay } from "@/components/layout/metro-display";
import { APP_CONFIG } from "@/lib/config";

export default function Home() {
  return <MetroDisplay stationCode={APP_CONFIG.defaultStation.code} />;
}
