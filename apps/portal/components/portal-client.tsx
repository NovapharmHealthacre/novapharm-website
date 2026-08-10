"use client";

import type { PortalView } from "../data/routes";
import { Dashboard } from "./dashboard";
import { EntraComplete } from "./entra-complete";
import { LoginPanel } from "./login-panel";
import { PasswordChange } from "./password-change";

export function PortalClient({ view }: Readonly<{ view: PortalView }>) {
  if (view.kind === "login") return <LoginPanel />;
  if (view.kind === "password-change") return <PasswordChange />;
  if (view.kind === "entra-complete") return <EntraComplete />;
  return <Dashboard module={view.module} />;
}
