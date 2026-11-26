"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { currentCorporateNavigationAriaValue } from "../lib/navigation-current";

/** Responsive web navigation: desktop directory, native mobile disclosure. */
export function AppleFooterNavigation({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const query = window.matchMedia("(max-width: 833px)");
    const sync = () => {
      details.open = !query.matches;
      const summary = details.querySelector("summary");
      if (summary) summary.tabIndex = query.matches ? 0 : -1;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <details className="np-apple-footer-disclosure" ref={detailsRef} open>
      <summary tabIndex={-1}>{label}</summary>
      <div className="footer-link-list">{children}</div>
    </details>
  );
}

/** Footer-only sections retain their current page/location semantics. */
export function CurrentFooterLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  const pathname = usePathname();
  return <Link href={href} aria-current={currentCorporateNavigationAriaValue(pathname, href)}>{children}</Link>;
}
