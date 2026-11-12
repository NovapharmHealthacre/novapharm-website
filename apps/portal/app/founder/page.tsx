import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { FounderLogoutButton } from "../../components/founder-logout-button";
import { founderWorkspaceCategories, founderWorkspaceCoverageValid } from "../../data/founder-workspace-categories";
import { intelligenceWorkspaceCatalogue } from "../../data/intelligence-workspaces";
import styles from "./founder-experience.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SESSION_API = "https://intelligence.novapharmhealthcare.com/founder/session";

async function privateFounderSession(): Promise<boolean> {
  const token = (await cookies()).get("__Host-npi_founder")?.value ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) return false;
  try {
    const response = await fetch(SESSION_API, {
      method: "GET",
      headers: { Cookie: "__Host-npi_founder=" + token, Accept: "application/json" },
      cache: "no-store", redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 200) return false;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return false;
    const result = body as Record<string, unknown>;
    return result["ok"] === true &&
      result["code"] === "founder_session_active" &&
      result["role"] === "founder" &&
      result["scope"] === "founder-shell-read-only" &&
      result["customerAccess"] === false &&
      result["medicinesDataAccess"] === false;
  } catch {
    return false;
  }
}

export default async function FounderShell() {
  if (!(await privateFounderSession())) redirect("/auth/customer/start");
  if (!founderWorkspaceCoverageValid) throw new Error("Founder workspace coverage is incomplete");
  const ready = intelligenceWorkspaceCatalogue.filter(workspace => workspace.state === "existing-read-only").length;

  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="NovaPharm Intelligence, back to top">
          <strong>NovaPharm</strong> <span>Intelligence</span>
        </a>
        <nav className={styles.primaryNav} aria-label="Founder navigation">
          <a href="#top" aria-current="page">Medicines Terminal</a>
          <a href="#workspaces">Workspaces</a>
          <a href="#readiness">Readiness</a>
        </nav>
        <div className={styles.session}>
          <span>Private founder session</span>
          <FounderLogoutButton />
        </div>
      </header>

      <section id="top" className={styles.hero} aria-labelledby="founder-hero-title">
        <div className={styles.heroPhotography} aria-hidden="true">
          <Image src="/assets/media/founder/hero-editorial.avif" alt="" fill priority sizes="(max-width: 760px) 100vw, 65vw" />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Medicines Terminal</p>
          <h1 id="founder-hero-title">From the molecule<br />to the market.</h1>
          <p className={styles.heroLead}>
            A single, connected workspace for medicines, markets, supply, regulation and investment.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#workspaces">Explore Medicines Terminal</a>
            <a className={styles.secondaryAction} href="#readiness">View access status</a>
          </div>
        </div>
      </section>

      <section className={styles.workspaceSection} id="workspaces" aria-labelledby="workspace-title">
        <div className={styles.sectionHeader}>
          <h2 id="workspace-title">The 22 Workspaces</h2>
          <p>Organised into 5 connected intelligence sections.</p>
        </div>
        <div className={styles.categories}>
          {founderWorkspaceCategories.map(category => {
            const workspaces = category.slugs.map(slug => {
              const found = intelligenceWorkspaceCatalogue.find(workspace => workspace.slug === slug);
              if (!found) throw new Error("Unknown founder workspace: " + slug);
              return found;
            });
            return (
              <details className={styles.category} key={category.id} name="founder-workspace-category">
                <summary className={styles.categorySummary}>
                  <span className={styles.categoryImage}>
                    <Image src={category.image} alt={category.imageAlt} fill sizes="(max-width: 760px) 100vw, (max-width: 1170px) 33vw, 20vw" />
                  </span>
                  <span className={styles.categoryCopy}>
                    <strong>{category.title}</strong>
                    <span className={styles.categoryDescription}>{category.description}</span>
                    <span className={styles.categoryCount}>{workspaces.length} workspaces · Explore</span>
                  </span>
                </summary>
                <div className={styles.categoryDetails}>
                  <p className={styles.categoryIntro}>
                    The workspace directory reflects actual source permissions and release acceptance.
                    Browsing a category does not grant access to restricted data.
                  </p>
                  <div className={styles.modules}>
                    {workspaces.map(workspace => (
                      <details className={styles.module} key={workspace.slug}>
                        <summary>
                          <strong>{workspace.title}</strong>
                          <span>{workspace.state === "existing-read-only" ? "Read-only route" : "Acceptance pending"}</span>
                        </summary>
                        <div className={styles.moduleBody}>
                          <p>{workspace.summary}</p>
                          <p className={styles.requirementsTitle}>Required before release</p>
                          <ul>{workspace.requirements.map(item => <li key={item}>{item}</li>)}</ul>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className={styles.readiness} id="readiness" aria-labelledby="founder-readiness-title">
        <div>
          <h2 id="founder-readiness-title">Designed for decisions. Governed by evidence.</h2>
          <p>Source provenance, identity permissions and operational acceptance determine which capabilities can be used.</p>
        </div>
        <div className={styles.readinessCount}>
          <strong>{ready} read-only routes</strong>
          <span>{intelligenceWorkspaceCatalogue.length - ready} awaiting acceptance</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Models forecast. AI explains. Humans decide.</p>
        <p>This founder session does not authorise restricted medicines data, customer access, purchases or commercial actions.</p>
      </footer>
    </main>
  );
}
