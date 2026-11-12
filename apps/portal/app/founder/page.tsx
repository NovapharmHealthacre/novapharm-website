import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { intelligenceWorkspaceCatalogue } from "../../data/intelligence-workspaces";

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
  const ready = intelligenceWorkspaceCatalogue.filter(w => w.state === "existing-read-only").length;
  return (
    <main style={{ background: "#f5f5f7", color: "#1d1d1f", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "42px clamp(22px,5vw,72px) 96px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-.02em" }}>NovaPharm Intelligence</span>
          <span style={{ fontSize: 13, color: "#6e6e73" }}>Private founder session · Read-only</span>
        </header>
        <section style={{ padding: "100px 0 72px", borderBottom: "1px solid #d2d2d7" }}>
          <p style={{ fontSize: 15, color: "#6e6e73", margin: "0 0 24px" }}>Medicines Terminal</p>
          <h1 style={{ fontSize: "clamp(46px,7vw,86px)", letterSpacing: "-.065em", lineHeight: 1.04, maxWidth: 900, margin: 0 }}>
            Your workspace.
            <span style={{ display: "block", color: "#86868b" }}>One connected view of medicine.</span>
          </h1>
          <p style={{ color: "#6e6e73", fontSize: 19, lineHeight: 1.55, maxWidth: 680, marginTop: 30 }}>
            Secure founder access is active. Explore the workspace architecture and release evidence.
            Live medicines intelligence remains restricted until its source and customer acceptance gates pass.
          </p>
          <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 28 }}>
            {intelligenceWorkspaceCatalogue.length} workspaces · {ready} read-only route contracts · {intelligenceWorkspaceCatalogue.length - ready} gated
          </p>
        </section>
        <section style={{ paddingTop: 72 }}>
          <h2 style={{ fontSize: 34, letterSpacing: "-.045em", margin: "0 0 12px" }}>The workspaces</h2>
          <p style={{ color: "#6e6e73", maxWidth: 660, lineHeight: 1.6 }}>
            Readiness is determined by verified source data, permissions and runtime functionality,
            not by a visible navigation item. Expand any workspace to see its acceptance requirements.
          </p>
          <div style={{ marginTop: 40 }}>
            {intelligenceWorkspaceCatalogue.map(workspace => (
              <details key={workspace.slug} style={{ background: "#fff", marginBottom: 2, borderBottom: "1px solid #e8e8ed", padding: "26px 30px", borderRadius: 3 }}>
                <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 30, fontSize: 18, fontWeight: 560, listStyle: "none" }}>
                  <span>{workspace.title}</span>
                  <span style={{ fontSize: 12, color: "#6e6e73", fontWeight: 450, alignSelf: "center", whiteSpace: "nowrap" }}>
                    {workspace.state === "existing-read-only" ? "Read-only route" : "Acceptance pending"}
                  </span>
                </summary>
                <p style={{ maxWidth: 720, color: "#6e6e73", lineHeight: 1.6, fontSize: 15 }}>{workspace.summary}</p>
                <div style={{ color: "#86868b", fontSize: 13, borderTop: "1px solid #f1f1f3", paddingTop: 18 }}>
                  <strong style={{ fontWeight: 600, color: "#1d1d1f" }}>Required before release</strong>
                  <ul style={{ lineHeight: 1.9, paddingLeft: 18 }}>
                    {workspace.requirements.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
        <footer style={{ fontSize: 13, color: "#86868b", paddingTop: 54, lineHeight: 1.8 }}>
          <p>Models forecast. AI explains. Humans decide.</p>
          <p>This session does not authorize restricted medical data, purchases, recommendations or commercial actions.</p>
        </footer>
      </div>
    </main>
  );
}
