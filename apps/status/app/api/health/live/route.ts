import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "live", service: "novapharm-status", version: process.env["APP_VERSION"] ?? "development", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
