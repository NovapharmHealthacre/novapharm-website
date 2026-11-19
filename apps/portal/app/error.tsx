"use client";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return <main className="system-page"><p className="eyebrow">Service interruption</p><h1>This workspace could not be loaded</h1><p>If you just submitted a change, check its status before trying again.</p><button className="button primary" type="button" onClick={reset}>Try again</button></main>;
}
