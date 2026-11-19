"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  useEffect(() => { console.error("Corporate page render failed", { digest: error.digest }); }, [error.digest]);
  return <section className="error-page"><div className="shell"><span className="eyebrow">Service interruption</span><h1>This page is temporarily unavailable.</h1><p>Please try again. If you recently submitted a form, check whether it was received before submitting it again.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button></div></section>;
}
