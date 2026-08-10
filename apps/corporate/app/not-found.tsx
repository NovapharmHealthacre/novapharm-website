import Link from "next/link";

export default function NotFound() {
  return <section className="error-page"><div className="shell"><span className="eyebrow">404</span><h1>Page not found.</h1><p>The page may have moved, or the address may be incorrect.</p><Link className="button button-primary" href="/">Return home</Link></div></section>;
}
