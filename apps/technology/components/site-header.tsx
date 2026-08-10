"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { ArrowUpRight, Close, Menu } from "@/components/icons";
import { navigation } from "@/data/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const darkHeroAtTop = pathname === "/" || /^\/insights\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuOpen = open && openedAtPath === pathname;

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
    return () => document.documentElement.classList.remove("menu-open");
  }, [menuOpen]);

  return (
    <header className={`site-header${darkHeroAtTop ? " has-dark-hero" : ""}${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner shell">
        <Brand />
        <nav className="site-header__nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link className={active ? "is-active" : ""} href={item.href as Route} key={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link className="header-cta" href="/contact">
          Start a conversation
          <ArrowUpRight />
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => {
            setOpenedAtPath(pathname);
            setOpen((value) => !value);
          }}
        >
          {menuOpen ? <Close /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={reduceMotion ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={reduceMotion ? { opacity: 1, clipPath: "inset(0 0 0% 0)" } : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mobile-menu__inner shell">
              <nav aria-label="Mobile navigation">
                {navigation.map((item, index) => (
                  <Link href={item.href as Route} key={item.href} onClick={() => setOpen(false)}>
                    <span>0{index + 1}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link className="mobile-menu__cta" href="/contact" onClick={() => setOpen(false)}>
                <span>Bring us the decision</span>
                <ArrowUpRight />
              </Link>
              <div className="mobile-menu__meta">
                <span>Vadodara · India</span>
                <a href="mailto:bd@novapharmhealthcare.com">bd@novapharmhealthcare.com</a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
