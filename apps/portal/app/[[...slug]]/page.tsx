import { notFound } from "next/navigation";
import { PortalClient } from "../../components/portal-client";
import { resolvePortalView } from "../../data/routes";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: Readonly<{ params: Promise<{ slug?: string[] }> }>) {
  const { slug = [] } = await params;
  const view = resolvePortalView(slug.length ? `/${slug.join("/")}/` : "/");
  if (!view) notFound();
  return <PortalClient view={view} />;
}
