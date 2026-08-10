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
      <p>Please try once more. No private information has been exposed.</p>
      <button className="button button-primary" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
