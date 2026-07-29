import { type NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { getServiceAlerts } from "@/lib/service-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station") || "";
  if (!station.trim()) {
    return NextResponse.json(
      { error: "The station query parameter is required." },
      {
        status: 400,
        headers: { "Cache-Control": APP_CONFIG.httpCacheControl.noStore },
      },
    );
  }

  try {
    return NextResponse.json(await getServiceAlerts(station), {
      headers: { "Cache-Control": APP_CONFIG.httpCacheControl.noStore },
    });
  } catch (reason: unknown) {
    const message =
      reason instanceof Error ? reason.message : "Could not load alerts.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: { "Cache-Control": APP_CONFIG.httpCacheControl.noStore },
      },
    );
  }
}
