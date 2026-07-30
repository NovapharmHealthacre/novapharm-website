"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  useEffect(() => { console.error("Corporate page render failed", { digest: error.digest }); }, [error.digest]);
  return <section className="error-page"><div className="shell"><span className="eyebrow">Service interruption</span><h1>This page is temporarily unavailable.</h1><p>No information has been submitted. Please try again or use the corporate contact route later.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button></div></section>;
}
