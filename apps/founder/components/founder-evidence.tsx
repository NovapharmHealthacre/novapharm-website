"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  createEvidenceAnswer,
  type EvidenceAnswer,
  type EvidenceKnowledge,
  evaluateEvidencePolicy,
  isEvidenceKnowledge,
  retrieveEvidence,
} from "@/lib/founder-evidence";

interface EvidenceContextValue {
  readonly open: (query?: string) => void;
}

const EvidenceContext = createContext<EvidenceContextValue | null>(null);
let knowledgePromise: Promise<EvidenceKnowledge> | undefined;

function loadKnowledge(): Promise<EvidenceKnowledge> {
  knowledgePromise ??= fetch("/assets/founder-knowledge.json", {
    credentials: "same-origin",
    cache: "force-cache",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Founder evidence is unavailable");
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      if (!isEvidenceKnowledge(value)) throw new Error("Founder evidence is invalid");
      return value;
    });
  return knowledgePromise;
}

export function OpenEvidenceLink({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const context = useContext(EvidenceContext);
  if (!context) throw new Error("OpenEvidenceLink requires FounderEvidenceProvider");
  return (
    <Link
      className={className}
      href="/thinking/"
      onClick={(event) => {
        event.preventDefault();
        context.open();
      }}
    >
      {children}
    </Link>
  );
}

export function FounderEvidenceProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState<Readonly<{ title: string; body: string }> | null>(null);
  const [answer, setAnswer] = useState<EvidenceAnswer | null>(null);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const open = useCallback((suggestedQuery = "") => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery(suggestedQuery);
    setMessage(null);
    setAnswer(null);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const restoreFocus = () => returnFocusRef.current?.focus();
    dialog.addEventListener("close", restoreFocus);
    return () => dialog.removeEventListener("close", restoreFocus);
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setMessage(null);
    setAnswer(null);
    const policy = evaluateEvidencePolicy(query);
    if (!policy.allowed) {
      const body = policy.message ?? "This question is outside the published evidence boundary.";
      setMessage({ title: policy.id === "empty" ? "Question needed" : "Boundary", body });
      setStatus(body);
      return;
    }
    setBusy(true);
    setStatus("Searching approved published work.");
    try {
      const knowledge = await loadKnowledge();
      const response = createEvidenceAnswer(retrieveEvidence(knowledge, query));
      setAnswer(response);
      setStatus(
        response.citations.length ? `Answer found with ${response.citations.length} cited sources.` : response.answer,
      );
    } catch {
      const body =
        "The evidence index could not be opened. Vishal’s essays and profile remain available through the normal site navigation.";
      setMessage({ title: "Search unavailable", body });
      setStatus("Founder evidence search is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const copyAnswer = async (): Promise<void> => {
    if (!answer?.citations.length || !navigator.clipboard) return;
    const sources = answer.citations.map((citation) => `${citation.title}: ${citation.url}`).join("\n");
    await navigator.clipboard.writeText(`${answer.label}\n\n${answer.answer}\n\nSources\n${sources}`);
    setStatus("Answer and source links copied.");
  };

  return (
    <EvidenceContext value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        className="founder-ai-dialog"
        aria-labelledby="founder-ai-title"
        aria-describedby="founder-ai-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="founder-ai-shell">
          <header className="founder-ai-header">
            <div>
              <p className="eyebrow">Approved public evidence</p>
              <p className="founder-ai-kicker">Private, browser-based retrieval</p>
            </div>
            <button className="founder-ai-close" type="button" onClick={close} aria-label="Close Ask Vishal’s Work">
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className="founder-ai-layout">
            <section className="founder-ai-controls" aria-label="Ask Vishal’s published work">
              <h2 id="founder-ai-title">Ask Vishal’s Work</h2>
              <p id="founder-ai-description">
                Search Vishal Chakravarty’s approved essays, verified biography and official public records. Every
                supported response quotes published evidence and links to its source.
              </p>
              <p className="founder-ai-boundary">
                <strong>Not Vishal speaking.</strong> This is an automated evidence summary. It does not use private
                files, infer new personal views, or provide medical, legal, investment or personalised regulatory
                advice.
              </p>
              <form className="founder-ai-form" aria-busy={busy} onSubmit={submit}>
                <label htmlFor="founder-ai-query">Question or topic</label>
                <div className="founder-ai-query-row">
                  <input
                    ref={inputRef}
                    id="founder-ai-query"
                    name="query"
                    type="search"
                    maxLength={400}
                    autoComplete="off"
                    spellCheck
                    placeholder="For example: how does Vishal assess CMO readiness?"
                    required
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button className="button button-primary" type="submit" disabled={busy}>
                    Search work
                  </button>
                </div>
              </form>
              <fieldset className="founder-ai-topics">
                <legend className="sr-only">Suggested topics</legend>
                {["CMO readiness", "Market access", "Supply resilience"].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => open(`How does Vishal assess ${topic.toLowerCase()}?`)}
                  >
                    {topic}
                  </button>
                ))}
              </fieldset>
              <p className="sr-only" aria-live="polite">
                {status}
              </p>
            </section>
            <section
              className="founder-ai-results"
              aria-label="Evidence response"
              aria-live="polite"
              aria-atomic="false"
            >
              {message ? (
                <article className="founder-ai-message">
                  <p className="founder-ai-label">{message.title}</p>
                  <p>{message.body}</p>
                </article>
              ) : answer ? (
                <article className="founder-ai-answer">
                  <p className="founder-ai-label">{answer.label}</p>
                  <p className="founder-ai-answer-copy">{answer.answer}</p>
                  <p className="founder-ai-evidence-status">{answer.evidenceStatus}</p>
                  {answer.citations.length ? (
                    <>
                      <h3>Sources</h3>
                      <ol className="founder-ai-sources">
                        {answer.citations.map((citation) => (
                          <li key={citation.sourceId}>
                            <a
                              href={citation.url}
                              target={citation.url.startsWith("https://vishal.") ? undefined : "_blank"}
                              rel={citation.url.startsWith("https://vishal.") ? undefined : "noopener noreferrer"}
                            >
                              {citation.title}
                            </a>
                            <span>
                              {citation.type} · {citation.heading}
                            </span>
                            <q>{citation.passage}</q>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </article>
              ) : (
                <div className="founder-ai-empty">
                  <p className="founder-ai-label">Source-first by design</p>
                  <h3>Explore the published record.</h3>
                  <p>
                    Use a suggested topic or ask a focused question. Unsupported questions receive a clear abstention
                    rather than an invented answer.
                  </p>
                </div>
              )}
            </section>
          </div>
          <footer className="founder-ai-footer">
            <p>No query is sent to an external AI provider or retained by this website.</p>
            <div>
              <Link href="/thinking/">Read all essays</Link>
              <Link href="/privacy/">Privacy</Link>
              {answer?.citations.length ? (
                <button type="button" onClick={copyAnswer}>
                  Copy cited answer
                </button>
              ) : null}
            </div>
          </footer>
        </div>
      </dialog>
    </EvidenceContext>
  );
}
