import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  AccessibleChart,
  ApprovalStatus,
  AuditHistory,
  Breadcrumbs,
  Button,
  DataTable,
  Dialog,
  DocumentViewer,
  EditorialSection,
  FileUpload,
  FilterGroup,
  FormField,
  Hero,
  LeadershipCard,
  MegaMenu,
  Navigation,
  PortalControlBar,
  ProductExplorer,
  SearchField,
  SkipLink,
  StatePanel,
  Tabs,
  Timeline,
  componentRegistry,
  designSystemCss,
} from "../src/index.ts";

const outputRoot = dirname(fileURLToPath(import.meta.url));
const logo = "../../../apps/corporate/public/assets/brand/novapharm-healthcare-logo.svg";
const heroImage = "../../../apps/corporate/public/assets/media/home/supply-network-hero.jpg";
const productImage = "../../../apps/corporate/public/assets/media/products/oncology-vial-handling.jpg";
const portrait = "../../../apps/founder/public/images/portrait/vishal-chakravarty-960.jpg";

const noop = () => undefined;

function PropertyPrototype({ property, direction }: Readonly<{ property: "Corporate" | "NIT" | "Founder" | "Portal"; direction: "continuum" | "atlas" | "ledger" }>) {
  const copy = {
    Corporate: ["Building resilient pharmaceutical access", "A governed operating model connects market-entry planning, quality readiness and qualified supply relationships."],
    NIT: ["Trusted systems for regulated work", "Architecture, evidence and human oversight shape every technology decision."],
    Founder: ["Leadership through disciplined execution", "Writing and governance notes from Vishal Chakravarty, Chief Executive Officer."],
    Portal: ["Executive operating view", "Controlled access to approvals, documents, risks and decisions."],
  }[property];
  return <article className={`direction-property direction-property--${property.toLowerCase()} direction-property--${direction}`}>
    <div className="direction-property__bar"><span>{property}</span><span>NovaPharm</span></div>
    <div className="direction-property__body"><p className="np-eyebrow">{direction === "continuum" ? "Regulated continuum" : direction === "atlas" ? "Institutional atlas" : "Clinical ledger"}</p><h3>{copy[0]}</h3><p>{copy[1]}</p><a href="#component-workbench">Explore the system</a></div>
    <div className="direction-property__signal" aria-hidden="true"><span /><span /><span /><span /></div>
  </article>;
}

function Direction({ id, index, name, thesis, direction }: Readonly<{ id: string; index: string; name: string; thesis: string; direction: "continuum" | "atlas" | "ledger" }>) {
  return <section id={id} className={`direction direction--${direction}`} aria-labelledby={`${id}-title`}>
    <header className="direction__header"><p className="np-eyebrow">Direction {index}</p><h2 id={`${id}-title`}>{name}</h2><p>{thesis}</p></header>
    <div className="direction__properties"><PropertyPrototype property="Corporate" direction={direction} /><PropertyPrototype property="NIT" direction={direction} /><PropertyPrototype property="Founder" direction={direction} /><PropertyPrototype property="Portal" direction={direction} /></div>
    <div className="direction-mobile" aria-label={`${name} mobile example`}><div className="direction-mobile__screen"><span className="direction-mobile__brand">NovaPharm</span><p className="np-eyebrow">Mobile system</p><h3>{name}</h3><p>Decisions remain clear, calm and evidence-led on a compact screen.</p><button type="button">Review pathway</button><div className="direction-mobile__rows"><span /><span /><span /></div></div></div>
  </section>;
}

function Workbench() {
  const rows = [
    { item: "WDA(H) readiness", owner: "Quality", state: <ApprovalStatus label="Evidence review" tone="warning" /> },
    { item: "Supplier qualification", owner: "Operations", state: <ApprovalStatus label="Controlled" tone="positive" /> },
  ];
  return <>
    <SkipLink />
    <Navigation label="Component workbench" homeHref="#top" brand={<img src={logo} width="260" height="55" alt="NovaPharm Healthcare" />} items={[{ href: "#directions", label: "Directions" }, { href: "#component-workbench", label: "Components", current: true }, { href: "#governance", label: "Governance" }]} actions={<Button tone="secondary">Review build</Button>} />
    <main id="main-content">
      <Hero eyebrow="NovaPharm governed design system" title="One coherent system. Four distinct experiences." summary="Reusable semantic components, property-specific art direction and evidence-led interaction patterns for the public estate and secure portal." media={<img src={heroImage} width="1200" height="800" alt="Pharmaceutical cartons moving through a controlled supply environment" />} actions={<><a className="np-button np-button--primary" href="#directions">Compare directions</a><a className="np-button np-button--secondary" href="#component-workbench">Inspect components</a></>} />
      <section id="directions" className="workbench-intro"><p className="np-eyebrow">Creative-direction evidence</p><h2>Three high-fidelity systems, evaluated against one regulated brief.</h2><p>Each direction demonstrates Corporate, NIT, Founder, Portal and compact mobile expression. Direction A is the selected foundation; B and C supply limited supporting patterns.</p></section>
      <Direction id="direction-a" index="A" name="Regulated Continuum" direction="continuum" thesis="Controlled continuity: editorial photography and a continuous evidence line connect strategy, quality and movement." />
      <Direction id="direction-b" index="B" name="Institutional Atlas" direction="atlas" thesis="Geographic intelligence: market layers and calibrated cartographic structure make international context legible." />
      <Direction id="direction-c" index="C" name="Clinical Ledger" direction="ledger" thesis="Documented confidence: decisions, identifiers and review states are foregrounded as a regulated operating record." />

      <section id="component-workbench" className="workbench-intro"><p className="np-eyebrow">Governed component workbench</p><h2>{componentRegistry.length} reusable families with semantic and state contracts.</h2><p>Examples below exercise public editorial composition and dense operational states without presenting synthetic records as live data.</p></section>
      <div className="component-stage" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <Breadcrumbs items={[{ href: "#top", label: "Workbench" }, { href: "#component-workbench", label: "Components" }, { href: "#navigation", label: "Navigation" }]} />
        <MegaMenu label="Capabilities menu" groups={[{ heading: "Market entry", links: [{ href: "#", label: "Regulatory strategy" }, { href: "#", label: "Product assessment" }] }, { heading: "Quality", links: [{ href: "#", label: "Supplier qualification" }, { href: "#", label: "Batch integrity" }] }]} />
        <EditorialSection id="editorial-example" eyebrow="Evidence architecture" title="Clear claims begin with clear states." introduction="Visible language and structured data resolve to the same governed record." media={<img src={productImage} width="900" height="700" alt="Gloved handling of unbranded pharmaceutical vials in a controlled setting" />} tone="blue"><p>Current corporate activity, contracted infrastructure and authorisation-dependent wholesale scope remain explicitly separated.</p></EditorialSection>
        <div className="component-grid"><LeadershipCard name="Vishal Chakravarty" role="Chief Executive Officer" href="#" image={<img src={portrait} width="960" height="1200" alt="Vishal Chakravarty" />} summary="Founder and statutory director are maintained as separate governance facts." /><ProductExplorer label="portfolio categories" query="oncology" onQueryChange={noop} resultCount={1} filters={<FilterGroup legend="Readiness"><label><input type="checkbox" /> Evidence reviewed</label></FilterGroup>} results={<article className="mini-product"><img src={productImage} width="900" height="700" alt="Unbranded pharmaceutical vials under controlled handling" /><h3>Oncology opportunity assessment</h3><p>Business-to-business assessment; availability is not implied.</p></article>} /></div>
        <DataTable caption="Illustrative governance register" columns={[{ key: "item", label: "Control" }, { key: "owner", label: "Owner" }, { key: "state", label: "Review state" }]} rows={rows} />
        <AccessibleChart id="readiness-chart" title="Illustrative readiness distribution" description="Three of five controls reviewed and two pending. This is component sample data, not operational reporting." table={<DataTable caption="Readiness sample values" columns={[{ key: "state", label: "State" }, { key: "value", label: "Controls", numeric: true }]} rows={[{ state: "Reviewed", value: "3" }, { state: "Pending", value: "2" }]} />}><div className="sample-bars"><span style={{ height: "60%" }} /><span style={{ height: "40%" }} /></div></AccessibleChart>
        <Timeline label="Regulatory pathway sample" items={[{ title: "Evidence intake", description: "Verify holder, scope and effective dates.", status: "Required" }, { title: "Governance review", description: "Quality and legal owners approve publishable wording." }, { title: "Controlled release", description: "Publish only after the applicable authorisation gate." }]} />
        <div className="component-grid"><form className="np-form"><FormField id="organisation" label="Organisation" hint="Use the registered company name." required><input type="text" defaultValue="NovaPharm Healthcare Ltd" /></FormField><FormField id="evidence" label="Evidence reference" error="A controlled evidence reference is required."><input type="text" /></FormField><FileUpload id="upload" label="Upload controlled evidence" accept=".pdf,.docx" help="PDF or DOCX. Files remain quarantined until scanning and approval." /><Button type="button">Submit for review</Button></form><div><SearchField label="Search records" value="supplier" onChange={noop} /><Tabs label="Record views" activeId="open" tabs={[{ id: "open", label: "Open", panel: <p>Two illustrative records require review.</p> }, { id: "closed", label: "Closed", panel: <p>No records.</p> }]} /><div className="state-grid"><StatePanel kind="loading" title="Loading controlled records" message="Retrieving authorised data." /><StatePanel kind="empty" title="No approved documents" message="Approved files will appear here." /><StatePanel kind="error" title="Service unavailable" message="The request could not be completed. No data was changed." /></div></div></div>
        <PortalControlBar title="Quality workspace" context="Synthetic workbench data" actions={<><Button tone="secondary">Export authorised view</Button><Button>New review</Button></>} />
        <AuditHistory label="Illustrative audit history" events={[{ id: "1", actor: "Quality reviewer", action: "requested supporting evidence", timestamp: "2026-08-01T09:00:00Z" }, { id: "2", actor: "Content owner", action: "placed publication on hold", timestamp: "2026-08-01T10:15:00Z", detail: "No public claim was released." }]} />
        <DocumentViewer id="quality-document" title="Quality agreement review copy" source="Synthetic workbench document"><p>The viewer keeps document context, permission-aware actions and audit information together. No confidential file is embedded in this public workbench.</p></DocumentViewer>
        <Dialog id="approval-dialog" title="Approve controlled wording" description="Approval creates an auditable publishing decision." open actions={<><Button tone="secondary">Cancel</Button><Button>Approve</Button></>}><p>Confirm that the visible wording matches the reviewed source and does not transfer a third party's authorisation to NovaPharm.</p></Dialog>
        <aside className="drawer-static" aria-labelledby="drawer-example-title"><h2 id="drawer-example-title">Drawer contract</h2><p>The production component manages focus, close behaviour, inert background state and escape-key handling in the consuming application.</p></aside>
      </div>
    </main>
    <footer id="governance" className="workbench-footer"><p><strong>NovaPharm Healthcare design system</strong></p><p>Reference environment only. Synthetic examples are not operational records.</p></footer>
  </>;
}

const workbenchCss = `${designSystemCss}
:root{font-family:Inter,Arial,sans-serif;color:#0d1b2a;background:#fbfaf8;line-height:1.55}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit;text-underline-offset:.2em}img{display:block;max-width:100%}.np-navigation img{width:13rem;height:auto}.workbench-intro{padding:6rem max(1rem,6vw);max-width:78rem}.workbench-intro h2{font-family:Georgia,serif;font-size:clamp(2.3rem,4vw,4.6rem);line-height:1.05;letter-spacing:0}.direction{position:relative;display:grid;grid-template-columns:3fr 9fr;gap:3rem;padding:5rem max(1rem,6vw);overflow:hidden}.direction__header{position:sticky;top:2rem;align-self:start}.direction__header h2{font-family:Georgia,serif;font-size:clamp(2.2rem,4vw,4rem);line-height:1}.direction__properties{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.direction-property{min-height:24rem;display:grid;grid-template-rows:auto 1fr auto;border:1px solid rgb(255 255 255/.24);overflow:hidden}.direction-property__bar{display:flex;justify-content:space-between;padding:.8rem 1rem;border-bottom:1px solid currentColor;font-size:.75rem;text-transform:uppercase}.direction-property__body{align-self:end;padding:2rem}.direction-property__body h3{font-family:Georgia,serif;font-size:2.1rem;line-height:1.05;letter-spacing:0}.direction-property__signal{display:grid;grid-template-columns:repeat(4,1fr);height:.45rem}.direction-property__signal span:nth-child(1){background:#be3035}.direction-property__signal span:nth-child(2){background:#eaf3f8}.direction-property__signal span:nth-child(3){background:#667085}.direction-property__signal span:nth-child(4){background:#fff}.direction-mobile{grid-column:2;justify-self:end;width:18rem;margin-top:1.5rem;padding:.65rem;border-radius:1.5rem;background:#111}.direction-mobile__screen{min-height:35rem;border-radius:1rem;padding:1.5rem;overflow:hidden}.direction-mobile__brand{display:block;padding-bottom:5rem;font-weight:800}.direction-mobile h3{font-family:Georgia,serif;font-size:2.4rem;line-height:1}.direction-mobile button{min-height:44px;border:0;padding:.75rem 1rem;background:#be3035;color:#fff}.direction-mobile__rows{display:grid;gap:.75rem;margin-top:4rem}.direction-mobile__rows span{display:block;height:3rem;border-top:1px solid currentColor}.direction--continuum{background:#0d1b2a;color:#fff}.direction--continuum::before{content:'';position:absolute;inset:7rem 0 auto 28%;height:1px;background:#be3035}.direction--continuum .direction-property--corporate{background:linear-gradient(rgb(13 27 42/.62),rgb(13 27 42/.94)),url('${heroImage}') center/cover}.direction--continuum .direction-property--nit{background:#101d2b}.direction--continuum .direction-property--founder{background:#fbfaf8;color:#0d1b2a}.direction--continuum .direction-property--portal{background:#1b2028}.direction--continuum .direction-mobile__screen{background:#fbfaf8;color:#0d1b2a}.direction--atlas{background:#eaf3f8}.direction--atlas .direction-property{background:#fff;border-color:#9fb8c8}.direction--atlas .direction-property--nit{background:#0d1b2a;color:#fff}.direction--atlas .direction-property__signal{grid-template-columns:2fr 1fr 3fr 1fr}.direction--atlas .direction-mobile__screen{background:#eaf3f8}.direction--ledger{background:#f4f5f7}.direction--ledger .direction-property{background:repeating-linear-gradient(#fff,#fff 2.95rem,#d8dde4 3rem);border-color:#667085}.direction--ledger .direction-property__body{display:grid;align-content:end;border-left:4px solid #be3035}.direction--ledger .direction-property--portal{background:#1b2028;color:#fff}.direction--ledger .direction-mobile__screen{background:repeating-linear-gradient(#fff,#fff 3rem,#d8dde4 3.05rem)}.component-stage{display:grid;gap:2rem;padding:0 max(1rem,6vw) 6rem}.component-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem}.mini-product img{aspect-ratio:4/3;object-fit:cover}.sample-bars{height:12rem;display:flex;align-items:end;gap:1rem}.sample-bars span{width:5rem;background:#be3035}.sample-bars span+span{background:#667085}.state-grid{display:grid;gap:.75rem;margin-top:1rem}.drawer-static{padding:2rem;border-inline-start:4px solid #be3035;background:#eaf3f8}.workbench-footer{padding:3rem max(1rem,6vw);background:#0d1b2a;color:#fff}@media(max-width:900px){.direction{grid-template-columns:1fr}.direction__header{position:static}.direction__properties{grid-template-columns:1fr}.direction-mobile{grid-column:1;justify-self:center}.component-grid{grid-template-columns:1fr}.np-navigation{position:static}.direction-property{min-height:20rem}}`;

const workbenchOverrides = String.raw`
.workbench-intro h2{font-size:4.25rem}
.direction{grid-template-columns:minmax(13rem,3fr) minmax(0,7fr) minmax(13rem,2.5fr);gap:2rem}
.direction__properties{grid-column:2}
.direction__header h2{font-size:3rem;overflow-wrap:normal}
.direction-mobile h3{font-size:1.75rem;overflow-wrap:normal}
.direction-mobile{grid-column:3;grid-row:1;align-self:start;justify-self:stretch;width:100%;margin-top:0}
@media(max-width:1100px){
  .direction{grid-template-columns:minmax(12rem,3fr) minmax(0,9fr)}
  .direction__properties{grid-column:2}
  .direction-mobile{grid-column:2;grid-row:auto;justify-self:end;width:18rem;margin-top:1.5rem}
}
@media(max-width:900px){
  .workbench-intro h2{font-size:2.75rem}
  .direction{grid-template-columns:minmax(0,1fr)}
  .direction__properties{grid-column:1;grid-template-columns:minmax(0,1fr)}
  .direction__header h2{font-size:3rem}
  .direction-mobile{grid-column:1;grid-row:auto;justify-self:center;width:min(18rem,100%)}
  .component-grid{grid-template-columns:minmax(0,1fr)}
}
`;

const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NovaPharm Governed Design System Workbench</title><link rel="stylesheet" href="./workbench.css"></head><body id="top">${renderToStaticMarkup(<Workbench />)}</body></html>`;

await mkdir(outputRoot, { recursive: true });
await Promise.all([
  writeFile(join(outputRoot, "index.html"), html, "utf8"),
  writeFile(join(outputRoot, "workbench.css"), `${workbenchCss}${workbenchOverrides}`, "utf8"),
]);

console.log(`Design-system workbench generated with ${componentRegistry.length} governed component families.`);
