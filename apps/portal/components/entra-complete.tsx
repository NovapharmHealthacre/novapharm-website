"use client";

import { useEffect, useState } from "react";
import { isPortalAccessType, landingRouteForAccess } from "../data/routes";
import { professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

export function EntraComplete() {
  const [status, setStatus] = useState("Verifying your Microsoft identity…");

  useEffect(() => {
    const requestedAccess = new URLSearchParams(window.location.search).get("accessType");
    const accessType = isPortalAccessType(requestedAccess) ? requestedAccess : "employee";
    protectedMutation<{ accessType: string }>("auth/federated", { accessType })
      .then((result) => {
        if (!isPortalAccessType(result.accessType) || result.accessType !== accessType) throw new Error("The authorised portal area did not match the requested workspace.");
        window.location.replace(landingRouteForAccess(result.accessType));
      })
      .catch((error) => setStatus(professionalError(error)));
  }, []);

  return <main className="system-page"><PortalBrand /><p className="eyebrow">Microsoft identity</p><h1>Completing secure sign in</h1><p aria-live="polite">{status}</p></main>;
}
