"use client";

import { useState } from "react";
import styles from "./founder-customer-directory.module.css";

type Identity = { email: string | null; name: string | null; registeredAt: string; status: string; enabled: boolean; emailVerified: boolean | null };
type Source = { source: string; identityCount: number; verifiedCount: number; enabledCount: number; records: Identity[] };
type Directory = { observedAt: string; coverage: string; uniquePeopleCount: null; sources: Source[] };

export function FounderCustomerDirectory() {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  async function load() {
    setDirectory(null);
    setStatus("");
    setLoading(true);
    try {
      const response = await fetch("/founder/customer-directory", { method: "GET", cache: "no-store", credentials: "same-origin", redirect: "error", headers: { Accept: "application/json" } });
      if (response.status === 401) { setStatus("A fresh founder sign-in is required. Sign out and sign in again."); return; }
      if (response.status === 403) { setStatus("Customer directory administrator permission is required."); return; }
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (payload.ok !== true || payload.code !== "directory_read" || payload.directory?.coverage !== "production_cognito_identity_records_only" || !Array.isArray(payload.directory.sources)) throw new Error("invalid");
      setDirectory(payload.directory);
    } catch { setStatus("Customer registration data is currently unavailable."); }
    finally { setLoading(false); }
  }
  return <section className={styles.section} id="customer-directory" aria-labelledby="customer-directory-title">
    <h2 id="customer-directory-title">Customer management</h2>
    <p>Registered identities by production service. Counts are not unique people, trade applications, guest purchases or paid customers.</p>
    <div className={styles.controls}>
      <button type="button" disabled={loading} onClick={load}>{loading ? "Loading…" : "Load customer directory"}</button>
      {directory && <button type="button" onClick={() => { setDirectory(null); setQuery(""); setStatus(""); }}>Clear directory</button>}
    </div>
    <p role="status" aria-live="polite">{status}</p>
    {directory && <>
      <p>Observed at {directory.observedAt} (UTC). Internal accounts may be included.</p>
      <label>Search registered identities <input type="search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {directory.sources.map(source => {
        const term = query.trim().toLowerCase();
        const rows = source.records.filter(row => [row.email, row.name, row.status].some(value => (value ?? "").toLowerCase().includes(term)));
        return <section key={source.source} className={styles.source}>
          <h3>{source.source === "healthcare-retail" ? "Healthcare retail" : source.source === "intelligence" ? "Intelligence" : source.source}</h3>
          <p>{source.identityCount} registered · {source.verifiedCount} email verified · {source.enabledCount} enabled</p>
          <div className={styles.table} role="region" aria-label={source.source + " registered identities"} tabIndex={0}>
            <table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Registered (UTC)</th><th scope="col">Status</th><th scope="col">Email verified</th><th scope="col">Enabled</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}><td>{row.name ?? "Not recorded"}</td><td>{row.email ?? "Not recorded"}</td><td>{row.registeredAt}</td><td>{row.status}</td><td>{row.emailVerified === null ? "Unknown" : row.emailVerified ? "Yes" : "No"}</td><td>{row.enabled ? "Yes" : "No"}</td></tr>)}</tbody></table>
          </div>
          {rows.length === 0 && <p>No matching registered identities.</p>}
        </section>;
      })}
    </>}
  </section>;
}
