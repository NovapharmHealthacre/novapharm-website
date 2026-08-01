"use client";

import { useEffect, useState } from "react";
import { professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

export function EntraComplete() {
  const [status, setStatus] = useState("Verifying your Microsoft identity…");

  useEffect(() => {
    const accessType = new URLSearchParams(window.location.search).get("accessType") ?? "employee";
    protectedMutation<{ redirectTo: string }>("auth/federated", { accessType })
      .then((result) => window.location.replace(result.redirectTo))
      .catch((error) => setStatus(professionalError(error)));
  }, []);

  return <main className="system-page"><PortalBrand /><p className="eyebrow">Microsoft identity</p><h1>Completing secure sign in</h1><p aria-live="polite">{status}</p></main>;
}
