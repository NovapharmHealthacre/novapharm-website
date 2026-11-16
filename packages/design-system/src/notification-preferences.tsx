"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

/** This is a client presentation model, not an authority or delivery engine. */
export type NotificationTopic = Readonly<{
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
  editable: boolean;
}>;

export type NotificationPreferenceRecord = Readonly<{
  revision: string;
  topics: readonly NotificationTopic[];
}>;

export type VerifiedNotificationSave = Readonly<{
  ok: boolean;
  revision?: string;
}>;

/**
 * User-selectable communication preferences only. The caller MUST supply
 * an authenticated tenant-scoped record and a mutation that verifies
 * permission, expected revision, opt-in and a persisted receipt server-side.
 * Service, pharmacovigilance and security-required communications cannot
 * be opted out using this component.
 */
export function NotificationPreferenceEditor({
  record,
  onSave,
}: Readonly<{
  record: NotificationPreferenceRecord | null;
  onSave?: (
    choices: Readonly<Record<string, boolean>>,
    expectedRevision: string,
  ) => Promise<VerifiedNotificationSave>;
}>) {
  const [draft, setDraft] = useState<Readonly<Record<string, boolean>>>({});
  const [confirmed, setConfirmed] = useState<Readonly<Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const pendingRef = useRef(false);
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!record?.revision) {
      setDraft({});
      setConfirmed({});
      revisionRef.current = null;
      setStatus("");
      return;
    }
    const values = Object.fromEntries(record.topics.map((topic) => [topic.id, topic.enabled]));
    setDraft(values);
    setConfirmed(values);
    revisionRef.current = record.revision;
    setStatus("");
  }, [record]);

  const canEdit = Boolean(record?.revision && onSave);
  const changed = record?.topics.some((topic) =>
    topic.editable && draft[topic.id] !== confirmed[topic.id]) ?? false;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record || !onSave || !canEdit || !changed || pendingRef.current || !revisionRef.current) return;
    const choices = Object.fromEntries(record.topics.map((topic) =>
      [topic.id, topic.editable ? Boolean(draft[topic.id]) : topic.enabled]));
    pendingRef.current = true;
    setSaving(true);
    setStatus("Saving your notification choices.");
    try {
      const response = await onSave(choices, revisionRef.current);
      if (response.ok !== true || !response.revision?.trim()) {
        setStatus("Your notification choices were not confirmed. Nothing is marked as saved. Check your account before retrying.");
        return;
      }
      revisionRef.current = response.revision;
      setDraft(choices);
      setConfirmed(choices);
      setStatus("Your choices were confirmed by the authorised account service.");
    } catch {
      setStatus("Unable to confirm these choices. Your changes are not saved; check your account before retrying.");
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  if (!record?.revision) {
    return <section className="np-notification-settings" aria-label="Notification preferences">
      <h2>Notification preferences</h2>
      <p role="status">Your authorised preferences have not been loaded. No notification settings can be changed here.</p>
    </section>;
  }

  return <section className="np-notification-settings" aria-label="Notification preferences">
    <h2>Notification preferences</h2>
    <p>Choose which optional updates you receive. Required security and safety communications are managed separately.</p>
    <form onSubmit={submit} aria-busy={saving}>
      <fieldset disabled={!canEdit || saving}>
        <legend>Optional updates</legend>
        {record.topics.map((topic) => <label className="np-notification-settings__choice" key={topic.id}>
          <input type="checkbox" checked={Boolean(draft[topic.id])}
            disabled={!topic.editable || !canEdit || saving}
            onChange={(event) => {
              const next = event.target.checked;
              setDraft((current) => ({ ...current, [topic.id]: next }));
              setStatus("Changes not saved.");
            }} />
          <span><strong>{topic.label}</strong>{topic.description ? <span>{topic.description}</span> : null}</span>
        </label>)}
      </fieldset>
      {canEdit ? <button type="submit" disabled={!changed || saving}>
        {saving ? "Saving choices..." : "Save notification choices"}
      </button> : <p>These preferences are currently read-only. Ask an authorised administrator about changes.</p>}
      <p role="status" aria-live="polite">{status || "No notification choices have been changed."}</p>
    </form>
  </section>;
}
