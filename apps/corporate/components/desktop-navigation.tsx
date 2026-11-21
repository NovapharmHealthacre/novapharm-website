"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";
import { currentCorporateNavigationAriaValue } from "../lib/navigation-current";

interface DesktopNavigationProps {
  readonly items: readonly (readonly [string, string])[];
  readonly portalOrigin: string;
  readonly locale: InterfaceLocale;
}

interface MegaLink {
  readonly label: string;
  readonly href: string;
}
interface MegaColumn {
  readonly title: string;
  readonly links: readonly MegaLink[];
}
interface MegaCategory {
  readonly id: string;
  readonly label: string;
  readonly columns: readonly MegaColumn[];
}

/** Shared approved static-site category destinations; no protected Portal routes. */
const megaCategories: readonly MegaCategory[] = [
  { id: "company", label: "Company", columns: [
    { title: "Explore", links: [
      { label: "Company overview", href: "/about/" },
      { label: "Leadership", href: "/leadership/" },
      { label: "Governance", href: "/about/governance/" },
    ] },
    { title: "Work with NovaPharm", links: [
      { label: "Partnerships", href: "/partner-with-us/" },
      { label: "Investor information", href: "/investor-information/" },
      { label: "Careers", href: "/careers/" },
    ] },
    { title: "More", links: [
      { label: "Trust Centre", href: "/trust-centre/" },
      { label: "Contact", href: "/contact/" },
    ] },
  ] },
  { id: "capabilities", label: "Capabilities", columns: [
    { title: "Explore", links: [
      { label: "All capabilities", href: "/capabilities/" },
      { label: "Sourcing & market access", href: "/services/" },
      { label: "Regulatory & Quality", href: "/regulatory-services/" },
    ] },
    { title: "Specialist work", links: [
      { label: "Clinical Research & CRO", href: "/cro/" },
      { label: "Oncology", href: "/oncology/" },
    ] },
    { title: "Technology", links: [
      { label: "NovaPharm Intelligence", href: "/technology/" },
      { label: "Governance", href: "/about/governance/" },
    ] },
  ] },
  { id: "oncology", label: "Oncology", columns: [
    { title: "Explore oncology", links: [
      { label: "Oncology overview", href: "/oncology/" },
      { label: "Strategic portfolio", href: "/products/strategic-portfolio/" },
    ] },
    { title: "Our approach", links: [
      { label: "Regulatory & Quality", href: "/regulatory-services/" },
      { label: "Sourcing services", href: "/services/" },
    ] },
    { title: "Connect", links: [
      { label: "Discuss an opportunity", href: "/contact/?enquiry=Oncology" },
    ] },
  ] },
  { id: "products", label: "Products", columns: [
    { title: "Explore products", links: [
      { label: "Products overview", href: "/products/" },
      { label: "Nutraxin", href: "/products/nutraxin/" },
      { label: "Strategic portfolio", href: "/products/strategic-portfolio/" },
    ] },
    { title: "Discover", links: [
      { label: "Oncology", href: "/oncology/" },
      { label: "Market access", href: "/services/" },
    ] },
    { title: "Partner", links: [
      { label: "Distribution enquiries", href: "/contact/?enquiry=Distribution" },
      { label: "Business account", href: "/account-application/" },
    ] },
  ] },
  { id: "intelligence", label: "NovaPharm Intelligence", columns: [
    { title: "Explore", links: [
      { label: "NovaPharm Intelligence", href: "/technology/" },
      { label: "The Medicines Terminal", href: "/technology/#intelligence-platform" },
      { label: "NOVA & PANDORA", href: "/technology/#intelligence-ecosystem" },
    ] },
    { title: "Intelligence workspaces", links: [
      { label: "Medicine identity", href: "/technology/#intelligence-workspaces" },
      { label: "Markets & geography", href: "/technology/#intelligence-platform" },
      { label: "Trends & forecasting", href: "/technology/#intelligence-platform" },
    ] },
    { title: "Discover", links: [
      { label: "Evidence & trust", href: "/technology/#intelligence-trust" },
      { label: "Platform roadmap", href: "/technology/#intelligence-roadmap" },
    ] },
  ] },
  { id: "insights", label: "Insights", columns: [
    { title: "Explore", links: [
      { label: "Insights overview", href: "/news-insights/" },
      { label: "Supply-chain traceability", href: "/news-insights/batch-to-buyer-pharmaceutical-traceability/" },
    ] },
    { title: "Perspectives", links: [
      { label: "Oncology forecasting", href: "/news-insights/oncology-supply-chain-demand-forecasting/" },
      { label: "GDP & quality systems", href: "/news-insights/gdp-qms-pharmaceutical-distribution-foundations/" },
    ] },
    { title: "More", links: [
      { label: "PLPI strategy", href: "/news-insights/plpi-pharmaceutical-supply-resilience/" },
      { label: "Contact the team", href: "/contact/" },
    ] },
  ] },
];

/**
 * Desktop category menus retain the real overview links as no-JavaScript
 * fallback; only an unmodified desktop click opens the disclosure panel.
 * Escape restores focus, and leaving the header closes dormant menus.
 */
export function DesktopNavigation({ items, portalOrigin, locale }: DesktopNavigationProps) {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const focusFirstLink = useRef(false);
  const triggerRefs = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    setActiveCategory(null);
  }, [pathname]);

  useEffect(() => {
    const header = navRef.current?.closest("header");
    if (!header) return;

    const closeOutside = (event: PointerEvent) => {
      if (!header.contains(event.target as Node)) setActiveCategory(null);
    };
    const closeOnHeaderLeave = () => {
      const focused = document.activeElement;
      if (!(focused instanceof Element) || !header.contains(focused) ||
          (!focused.closest(".npd-mega") && !focused.closest("[data-mega-trigger]"))) {
        setActiveCategory(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !activeCategory) return;
      const trigger = triggerRefs.current.get(activeCategory);
      const inPanel = !!(event.target instanceof Element && event.target.closest(".npd-mega"));
      setActiveCategory(null);
      if (inPanel) trigger?.focus({ preventScroll: true });
      event.preventDefault();
    };
    const closeAtBreakpoint = () => setActiveCategory(null);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    header.addEventListener("pointerleave", closeOnHeaderLeave);
    window.addEventListener("resize", closeAtBreakpoint);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      header.removeEventListener("pointerleave", closeOnHeaderLeave);
      window.removeEventListener("resize", closeAtBreakpoint);
    };
  }, [activeCategory]);

  useEffect(() => {
    if (!activeCategory || !focusFirstLink.current) return;
    focusFirstLink.current = false;
    const panel = document.getElementById(`npd-mega-${activeCategory}`);
    panel?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
  }, [activeCategory]);

  function isDesktop() {
    return typeof window !== "undefined" && window.matchMedia("(min-width: 1301px)").matches;
  }

  function openFor(label: string) {
    if (!isDesktop()) return;
    const category = megaCategories.find((item) => item.label === label);
    setActiveCategory(category?.id ?? null);
  }

  function activatePanel(categoryId: string) {
    focusFirstLink.current = true;
    setActiveCategory(categoryId);
    // Already-hovered / focused triggers may open the same panel twice,
    // so a state-dependent effect alone cannot guarantee focus transfer.
    window.requestAnimationFrame(() => {
      const panel = document.getElementById(`npd-mega-${categoryId}`);
      const first = panel?.querySelector<HTMLAnchorElement>("a");
      if (first?.getClientRects().length) {
        focusFirstLink.current = false;
        first.focus({ preventScroll: true });
      }
    });
  }

  return <>
    <nav className="desktop-nav npd-global-nav site-nav" aria-label={interfaceLabel(locale, "Primary navigation")} ref={navRef}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Element) || !next.closest(".site-header")) setActiveCategory(null);
      }}>
      {items.map(([label, href]) => {
        const isPortal = href === "/portal/";
        const category = megaCategories.find((item) => item.label === label);
        const isOpen = activeCategory === category?.id;
        return <a
          key={href}
          href={isPortal ? portalOrigin : href}
          rel={isPortal ? "nofollow" : undefined}
          aria-current={!isPortal ? currentCorporateNavigationAriaValue(pathname, href) : undefined}
          data-mega-trigger={category?.id}
          aria-expanded={category ? isOpen : undefined}
          aria-controls={category ? `npd-mega-${category.id}` : undefined}
          ref={category ? (element) => {
            if (element) triggerRefs.current.set(category.id, element);
            else triggerRefs.current.delete(category.id);
          } : undefined}
          onPointerEnter={() => openFor(label)}
          onFocus={() => openFor(label)}
          onClick={(event) => {
            if (!category || !isDesktop() || event.button !== 0 ||
                event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            event.preventDefault();
            activatePanel(category.id);
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" || !category || !isDesktop()) return;
            event.preventDefault();
            activatePanel(category.id);
          }}
        >{interfaceLabel(locale, label)}</a>;
      })}
    </nav>
    {megaCategories.map((category) => (
      <div key={category.id} className={`npd-mega${activeCategory === category.id ? " is-open" : ""}`}
        id={`npd-mega-${category.id}`} data-mega-panel={category.id} aria-hidden={activeCategory !== category.id}
        lang="en-GB" dir="ltr"
        onFocus={() => setActiveCategory(category.id)}>
        <nav className="container npd-mega-inner" aria-label={`${category.label} category navigation`}>
          {category.columns.map((column) => (
            <div className="npd-mega-column" key={column.title}>
              <p>{column.title}</p>
              {column.links.map((link, index) => (
                <a key={`${link.href}-${index}`} className={index === 0 ? "npd-mega-feature" : undefined}
                  href={link.href} onClick={() => setActiveCategory(null)}>{link.label}</a>
              ))}
            </div>
          ))}
        </nav>
      </div>
    ))}
  </>;
}
