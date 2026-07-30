"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Copy } from "@/components/icons";
import { site } from "@/data/site";

type Brief = {
  name: string;
  organisation: string;
  email: string;
  decision: string;
  context: string;
  timing: string;
};

const initialBrief: Brief = {
  name: "",
  organisation: "",
  email: "",
  decision: "",
  context: "",
  timing: "",
};

export function ProjectBrief() {
  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => [
    "NEW ADVISORY ENQUIRY",
    "",
    `Name: ${brief.name || "—"}`,
    `Organisation: ${brief.organisation || "—"}`,
    `Email: ${brief.email || "—"}`,
    `Decision to be made: ${brief.decision || "—"}`,
    `Context: ${brief.context || "—"}`,
    `Timing / decision date: ${brief.timing || "—"}`,
  ].join("\n"), [brief]);

  const set = (field: keyof Brief, value: string) => {
    setBrief((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Advisory enquiry — ${brief.organisation || brief.name || "New project"}`);
    const body = encodeURIComponent(summary);
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  };

  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <form className="project-brief" onSubmit={submit}>
      <div className="project-brief__head">
        <div>
          <p className="eyebrow">Project brief</p>
          <h2>What decision needs to be made?</h2>
        </div>
        <p>
          This structured brief prepares an email in your own email application. No form data is uploaded to or stored by this website.
        </p>
      </div>

      <div className="project-brief__fields">
        <label>
          <span>Your name</span>
          <input required autoComplete="name" value={brief.name} onChange={(event) => set("name", event.target.value)} />
        </label>
        <label>
          <span>Organisation</span>
          <input required autoComplete="organization" value={brief.organisation} onChange={(event) => set("organisation", event.target.value)} />
        </label>
        <label>
          <span>Business email</span>
          <input required type="email" autoComplete="email" value={brief.email} onChange={(event) => set("email", event.target.value)} />
        </label>
        <label>
          <span>Decision date or timing</span>
          <input placeholder="e.g. Board decision in September" value={brief.timing} onChange={(event) => set("timing", event.target.value)} />
        </label>
        <label className="project-brief__wide">
          <span>The decision</span>
          <textarea required rows={3} placeholder="What choice, commitment, investment, market, product or partnership is being considered?" value={brief.decision} onChange={(event) => set("decision", event.target.value)} />
        </label>
        <label className="project-brief__wide">
          <span>Context and constraints</span>
          <textarea required rows={5} placeholder="What is known, what is uncertain, and what would make this decision successful or unsuccessful?" value={brief.context} onChange={(event) => set("context", event.target.value)} />
        </label>
      </div>

      <div className="project-brief__actions">
        <button className="button button--red" type="submit">Prepare email</button>
        <button className="button button--ghost" type="button" onClick={copy}>
          <Copy />
          {copied ? "Copied" : "Copy brief"}
        </button>
        <p>Do not include patient-identifiable, confidential clinical, or other sensitive personal information.</p>
      </div>
    </form>
  );
}
