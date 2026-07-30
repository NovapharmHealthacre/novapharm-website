"use client";

import { ExternalLink, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface MobileNavigationProps {
  readonly items: readonly (readonly [string, string])[];
  readonly portalOrigin: string;
}

export function MobileNavigation({ items, portalOrigin }: MobileNavigationProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathnameRef = useRef(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathnameRef.current !== pathname && detailsRef.current) {
      detailsRef.current.open = false;
      setOpen(false);
    }
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      detailsRef.current.open = false;
      setOpen(false);
      detailsRef.current.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function close() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    setOpen(false);
  }

  return (
    <details className="mobile-menu" ref={detailsRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-label={open ? "Close navigation" : "Open navigation"}>
        {open ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
      </summary>
      <nav aria-label="Mobile navigation">
        {items.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}
        <a href={portalOrigin} rel="nofollow" onClick={close}>Secure portal <ExternalLink aria-hidden="true" size={15} /></a>
      </nav>
    </details>
  );
}
