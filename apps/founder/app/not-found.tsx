import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Vishal Chakravarty",
  description: "The requested page could not be found.",
};

export default function NotFound(): React.JSX.Element {
  return (
    <section className="utility-page">
      <p className="eyebrow">404</p>
      <h1>There is no page here.</h1>
      <p>Explore the founder profile, NovaPharm Healthcare and the latest pharmaceutical essays.</p>
      <div>
        <Link className="button button-primary" href="/">
          Return home
        </Link>
        <Link className="text-link" href="/thinking/">
          Read the essays <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
