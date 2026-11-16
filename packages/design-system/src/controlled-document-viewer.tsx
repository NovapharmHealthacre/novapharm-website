import React, { type ReactNode } from "react";

/**
 * Render-only contract. A server must authenticate the user, authorise this
 * exact document/version and return a request-scoped permission decision.
 * The client must NEVER use these props as proof of access at an API boundary.
 */
export type ControlledDocumentAccess = Readonly<{
  verified: boolean;
  mayRead: boolean;
  mayDownload: boolean;
  scope: "private" | "approved_recipients" | "restricted";
  version: string | null;
  reviewedAt: string | null;
}>;

export function isRelativeAuthorisedDownload(href: string): boolean {
  // No external destinations, protocol-relative links, fragments, backslashes,
  // control characters or encoded separators that could change URL meaning.
  return /^\/(?!\/)[^\\\u0000-\u001f]*$/u.test(href)
    && !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f])/iu.test(href)
    && !href.includes("#");
}

/**
 * A private-document presentation boundary, NOT an access-control service.
 * No contents, recipients, versions or download actions are displayed unless
 * the authenticated server's decision says this identity may read the record.
 * The download endpoint MUST independently recheck permission and revocation.
 */
export function ControlledDocumentViewer({
  id,
  title,
  access,
  children,
  downloadHref,
}: Readonly<{
  id: string;
  title: string;
  access: ControlledDocumentAccess;
  children: ReactNode;
  downloadHref?: string;
}>) {
  const allowed = access.verified && access.mayRead;
  const readyDownload = allowed && access.mayDownload
    && typeof downloadHref === "string" && isRelativeAuthorisedDownload(downloadHref);
  return <section className="np-controlled-document" aria-labelledby={`${id}-title`}>
    <header className="np-controlled-document__header">
      <h2 id={`${id}-title`}>{title}</h2>
    </header>
    {!allowed ? <p role="status">Document preview unavailable. Your current access to this version has not been verified.</p> : <>
      <dl className="np-controlled-document__access" aria-label="Authorised document details">
        <div><dt>Access</dt><dd>{access.scope === "private" ? "Private to your account"
          : access.scope === "approved_recipients" ? "Shared with approved recipients" : "Restricted access"}</dd></div>
        {access.version ? <div><dt>Version</dt><dd>{access.version}</dd></div> : null}
        {access.reviewedAt ? <div><dt>Permissions checked</dt><dd>{access.reviewedAt}</dd></div> : null}
      </dl>
      {readyDownload ? <a href={downloadHref} rel="nofollow">Download authorised document</a> : null}
      <div className="np-controlled-document__content">{children}</div>
      <p className="np-controlled-document__note">Access can change. Opening or downloading this document requires separate authorisation at the private document service.</p>
    </>}
  </section>;
}
