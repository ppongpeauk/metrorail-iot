import { MetroDisplay } from "@/components/layout/metro-display";

export default async function StationPage({
  params,
}: {
  params: Promise<{ stationCode: string }>;
}) {
  const { stationCode } = await params;

  return <MetroDisplay stationCode={stationCode.toUpperCase()} />;
}
