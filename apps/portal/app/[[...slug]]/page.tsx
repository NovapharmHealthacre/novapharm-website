import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PortalClient } from "../../components/portal-client";
import { resolvePortalView } from "../../data/routes";
import { sessionDecision, verifiedPortalSession } from "../../lib/server-session";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: Readonly<{ params: Promise<{ slug?: string[] }> }>) {
  const { slug = [] } = await params;
  const view = resolvePortalView(slug.length ? `/${slug.join("/")}/` : "/");
  if (!view) notFound();

  // A user-supplied np_session cookie must not unlock a protected SSR shell.
  // Server session verification is independent of client-side API checks.
  if (view.kind === "module") {
    const sessionCookie = (await cookies()).get("np_session")?.value ?? "";
    const session = await verifiedPortalSession({ cookieValue: sessionCookie });
    const decision = sessionDecision(view, session);
    if (decision === "change-password") redirect("/portal/change-password/");
    if (decision !== "allow") redirect("/");
  }

  const incomingHost = (await headers()).get("host")?.split(":")[0].toLowerCase();
  return <PortalClient view={view} intelligencePortal={incomingHost === "intelligence.novapharmhealthcare.com"} />;
}
