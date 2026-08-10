"use client";

import type { PortalModule } from "@novapharm/portal-contracts";
import presentations from "../data/module-presentations.json";
import { Dashboard as BaseDashboard } from "./dashboard-base";
import styles from "./module-presentations.module.css";

type PresentationArchetype = "command" | "ledger" | "workflow" | "catalogue" | "tracking" | "documents" | "regulated" | "intelligence";

export function Dashboard({ module }: Readonly<{ module: PortalModule }>) {
  const archetype = presentations[module.code as keyof typeof presentations] as PresentationArchetype | undefined;
  if (!archetype) throw new Error(`Portal module ${module.code} has no governed presentation archetype.`);
  return <div className={`${styles.presentation} ${styles[archetype]}`} data-module={module.code} data-presentation={archetype}><BaseDashboard module={module} /></div>;
}
