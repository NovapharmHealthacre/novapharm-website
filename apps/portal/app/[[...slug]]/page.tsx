import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveInterfaceLocale } from "../../../../src/core/interface-locale";
import { PortalClient } from "../../components/portal-client";
import { resolvePortalView } from "../../data/routes";
import { portalBrandMetadata, resolvePortalBrand } from "../../lib/brand-metadata";
import { sessionDecision, verifiedPortalSession } from "../../lib/server-session";

export const dynamic = "force-dynamic";

type PortalPageProps = Readonly<{ params: Promise<{ slug?: string[] }> }>;

/** Purely visual route identity; never used as an access-control decision. */
export async function generateMetadata({ params }: PortalPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const view = resolvePortalView(slug.length ? `/${slug.join("/")}/` : "/");
  const host = (await headers()).get("host") ?? "";
  const area = view?.kind === "module" ? view.module.area : null;
  return portalBrandMetadata(resolvePortalBrand(host, area));
}


export default async function PortalPage({ params }: PortalPageProps) {
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

  const incomingHost = (await headers()).get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);
  return <PortalClient view={view} locale={locale} intelligencePortal={incomingHost === "intelligence.novapharmhealthcare.com"} />;
}
