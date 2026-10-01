"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/public-link";

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
      <summary aria-label={open ? "Close navigation" : "Open navigation"} title={open ? "Close navigation" : "Open navigation"}>
        <Menu className="menu-open-icon" size={22} aria-hidden="true" />
        <X className="menu-close-icon" size={22} aria-hidden="true" />
      </summary>
      <nav aria-label="Mobile navigation">
        {items.map(([label, href]) => href === "/portal/" ? <a key={href} href={portalOrigin} rel="nofollow" onClick={close}>{label}</a> : <Link key={href} href={href} onClick={close}>{label}</Link>)}
      </nav>
    </details>
  );
}
