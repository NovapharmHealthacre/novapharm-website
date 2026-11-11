"use client";

import type { PortalModule } from "@novapharm/portal-contracts";
import dynamic from "next/dynamic";
import modulePresentations from "../data/module-presentations.json";
import type { PortalView } from "../data/routes";
import styles from "./module-presentations.module.css";

// Keep the public sign-in lightweight: governed workspace code and its
// extensive module catalogue must not be in the anonymous login JS bundle.
// Next.js dynamically imports only the authenticated view selected by SSR.
const Dashboard = dynamic(() => import("./dashboard").then((module) => module.Dashboard));
const EntraComplete = dynamic(() => import("./entra-complete").then((module) => module.EntraComplete));
const LoginPanel = dynamic(() => import("./login-panel").then((module) => module.LoginPanel));
const PasswordChange = dynamic(() => import("./password-change").then((module) => module.PasswordChange));

type PresentationArchetype = "command" | "ledger" | "workflow" | "catalogue" | "tracking" | "documents" | "regulated" | "intelligence";
const presentationByModule = modulePresentations as Readonly<Record<string, PresentationArchetype>>;

function ModulePresentation({ module, subview }: Readonly<{ module: PortalModule; subview: Extract<PortalView, { kind: "module" }>["subview"] | undefined }>) {
  const archetype = presentationByModule[module.code];
  if (!archetype) throw new Error(`${module.code} has no governed presentation archetype.`);
  const presentationClass = styles["presentation"];
  const archetypeClass = styles[archetype];
  if (!presentationClass || !archetypeClass) throw new Error(`${module.code} has an incomplete presentation stylesheet contract.`);
  return <div className={`${presentationClass} ${archetypeClass}`} data-module={module.code} data-presentation={archetype}><Dashboard module={module} subview={subview} /></div>;
}

export function PortalClient({ view }: Readonly<{ view: PortalView }>) {
  if (view.kind === "login") return <LoginPanel />;
  if (view.kind === "password-change") return <PasswordChange />;
  if (view.kind === "entra-complete") return <EntraComplete />;
  return <ModulePresentation module={view.module} subview={view.subview} />;
}
