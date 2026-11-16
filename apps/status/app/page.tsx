import { RefreshCw } from "lucide-react";
import { cookies } from "next/headers";
import Image from "next/image";
import { getStatusSnapshot, type OverallState, type ServiceState } from "@/lib/status";
import { interfaceLabel, resolveInterfaceLocale } from "../../../src/core/interface-locale";
import { InterfaceLocaleSwitcher } from "../../../src/components/interface-locale-switcher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const labels: Readonly<Record<ServiceState, string>> = {
  operational: "Operational",
  degraded: "Attention required",
  unavailable: "Unavailable",
  configuration: "Activation pending",
};

const destinationLabels = {
  public: "Origin not configured",
  private: "Private boundary",
  current: "Current page",
} as const;

const overallLabels: Readonly<Record<OverallState, string>> = {
  operational: "Operational",
  degraded: "Attention required",
  activation: "Activation in progress",
  maintenance: "Planned maintenance",
  disruption: "Service disruption",
};

export default async function StatusPage() {
  const snapshot = await getStatusSnapshot();
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);
  const checked = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(snapshot.checkedAt));
  return (
    <main id="status-main">
      <header className="status-header">
        <a className="brand" href="https://novapharmhealthcare.com/" aria-label="NovaPharm Healthcare home">
          <Image src="/assets/brand/novapharm-healthcare-logo.svg" alt="NovaPharm Healthcare" width="2048" height="258" priority />
        </a>
        <span lang={locale}>{interfaceLabel(locale, "Service status")}</span>
      </header>
      <section className="status-hero" aria-labelledby="status-title">
        <p className="eyebrow">Digital estate availability</p>
        <h1 id="status-title">{snapshot.headline}</h1>
        <p>This page reports only sanitised endpoint availability. It does not expose customer records, portal activity, infrastructure identifiers or internal diagnostics.</p>
        {snapshot.notice ? <p className="maintenance-notice">{snapshot.notice}</p> : null}
        <div className="status-meta">
          <span className={`overall overall-${snapshot.overall}`}>{overallLabels[snapshot.overall]}</span>
          <span>Checked {checked} UTC</span>
          <a className="refresh-command" href="/"><RefreshCw aria-hidden="true" className="np-symbol" /><span lang={locale}>{interfaceLabel(locale, "Refresh")}</span></a>
        </div>
      </section>
      <section className="service-band" aria-labelledby="services-title">
        <div className="section-heading">
          <p className="eyebrow">Monitored boundaries</p>
          <h2 id="services-title">Current service position</h2>
        </div>
        <ul className="service-list">
          {snapshot.services.map((service) => (
            <li className="service-row" key={service.code}>
              <div>
                <span className={`state-dot state-${service.state}`} aria-hidden="true" />
                <h3>{service.name}</h3>
              </div>
              <p>{service.message}</p>
              <strong className={`state-label state-${service.state}`}>{labels[service.state]}</strong>
              {service.publicUrl ? (
                <a href={service.publicUrl}>Open service</a>
              ) : (
                <span className="private-boundary">{destinationLabels[service.visibility]}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <footer className="status-footer">
        <p>NovaPharm Healthcare Ltd. Status data is intentionally limited to operational availability.</p>
        <nav aria-label="Status privacy and support"><a href="https://novapharmhealthcare.com/legal/privacy/">Privacy notice</a><a href="https://novapharmhealthcare.com/contact/">Contact NovaPharm Healthcare</a></nav>
        <InterfaceLocaleSwitcher locale={locale} />
      </footer>
    </main>
  );
}
