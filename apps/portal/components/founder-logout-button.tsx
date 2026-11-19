"use client";

import { useState } from "react";

export function FounderLogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/founder/logout", {
              method: "POST", credentials: "same-origin",
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
            if (!response.ok) throw new Error("Logout was not verified.");
            window.location.assign("/");
          } catch {
            setError("Could not securely end this session. Please try again.");
            setBusy(false);
          }
        }}
        style={{
          border: "1px solid #d2d2d7", background: "transparent",
          borderRadius: 999, padding: "9px 18px", color: "#1d1d1f",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p role="alert" style={{ color: "#a12323", fontSize: 12 }}>{error}</p> : null}
    </div>
  );
}
