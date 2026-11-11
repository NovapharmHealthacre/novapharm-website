import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * No local Next.js logout shortcut: revocation must be an atomic audited
 * write in the independently approved private AWS session API. Until that
 * route is connected, refuse rather than claim the user's session ended.
 */
export function POST(): Response {
  return NextResponse.json(
    { ok: false, code: "customer_session_api_unavailable" },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
