import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { listStations } from "@/lib/gtfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { stations: await listStations() },
      { headers: { "Cache-Control": APP_CONFIG.httpCacheControl.stations } },
    );
  } catch (reason: unknown) {
    const message =
      reason instanceof Error ? reason.message : "Could not load stations.";
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { "Cache-Control": APP_CONFIG.httpCacheControl.noStore },
      },
    );
  }
}
