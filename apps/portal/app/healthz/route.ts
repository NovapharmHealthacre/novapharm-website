/** Public liveness only: never reports customer identity, source freshness or billing readiness. */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response("ok\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
