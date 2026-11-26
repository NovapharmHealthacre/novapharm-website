"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("Founder page rendering failed", { digest: error.digest });
  }, [error.digest]);

  return (
    <section className="utility-page" role="alert">
      <p className="eyebrow">Service interruption</p>
      <h1>This page could not be opened.</h1>
      <p>Try again. If you just submitted information, check whether it was received before sending it again.</p>
      <button className="button button-primary" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
