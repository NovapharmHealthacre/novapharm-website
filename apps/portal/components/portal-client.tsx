"use client";

import type { PortalModule } from "@novapharm/portal-contracts";
import modulePresentations from "../data/module-presentations.json";
import type { PortalView } from "../data/routes";
import { Dashboard } from "./dashboard";
import { EntraComplete } from "./entra-complete";
import { LoginPanel } from "./login-panel";
import styles from "./module-presentations.module.css";
import { PasswordChange } from "./password-change";

type PresentationArchetype = "command" | "ledger" | "workflow" | "catalogue" | "tracking" | "documents" | "regulated" | "intelligence";
const presentationByModule = modulePresentations as Readonly<Record<string, PresentationArchetype>>;

function ModulePresentation({ module }: Readonly<{ module: PortalModule }>) {
  const archetype = presentationByModule[module.code];
  if (!archetype) throw new Error(`${module.code} has no governed presentation archetype.`);
  const presentationClass = styles["presentation"];
  const archetypeClass = styles[archetype];
  if (!presentationClass || !archetypeClass) throw new Error(`${module.code} has an incomplete presentation stylesheet contract.`);
  return <div className={`${presentationClass} ${archetypeClass}`} data-module={module.code} data-presentation={archetype}><Dashboard module={module} /></div>;
}

export function PortalClient({ view }: Readonly<{ view: PortalView }>) {
  if (view.kind === "login") return <LoginPanel />;
  if (view.kind === "password-change") return <PasswordChange />;
  if (view.kind === "entra-complete") return <EntraComplete />;
  return <ModulePresentation module={view.module} />;
}