"use client";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return <main className="system-page"><p className="eyebrow">Service interruption</p><h1>This workspace could not be loaded</h1><p>No data has been changed. Try the request again or return to sign in.</p><button className="button primary" type="button" onClick={reset}>Try again</button></main>;
}
