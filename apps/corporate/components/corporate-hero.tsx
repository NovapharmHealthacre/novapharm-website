"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";

export function CorporateHero({ children }: { readonly children: ReactNode }) {
  const scene = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let inView = true;
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--scene-x", "0px");
      element.style.setProperty("--scene-y", "0px");
    };
    const updatePreference = () => { setReduced(preference.matches); reset(); };
    const updateVisibility = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      updateVisibility();
      if (!inView) reset();
    });
    const move = (event: PointerEvent) => {
      if (preference.matches || !pointer.matches || element.dataset.motion !== "running") return;
      const bounds = element.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (element.dataset.motion !== "running") return;
        element.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
        element.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
      });
    };
    const leave = () => {
      if (element.dataset.motion === "running") reset();
    };
    updatePreference();
    updateVisibility();
    setReady(true);
    observer.observe(element);
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      reset();
    };
  }, []);

  const moving = ready && !reduced && !paused && visible;
  const label = paused ? "Play visual motion" : "Pause visual motion";
  return (
    <section ref={scene} className="corporate-hero" aria-label="NovaPharm Healthcare" data-motion={moving ? "running" : "still"}>
      <div className="corporate-hero-media" aria-hidden="true">
        <div className="corporate-hero-perspective"><div className="corporate-hero-drift">
          <picture>
            <source media="(max-width: 720px)" sizes="100vw" srcSet="/assets/media/home/medicine-evidence-hero-800.avif 800w, /assets/media/home/medicine-evidence-hero-1200.avif 1200w, /assets/media/home/medicine-evidence-hero.avif 1600w" />
            <Image src="/assets/media/home/medicine-evidence-hero.avif" alt="" fill loading="eager" fetchPriority="high" sizes="100vw" unoptimized />
          </picture>
        </div></div>
      </div>
      <div className="shell corporate-hero-content">{children}</div>
      {ready && !reduced ? <button
        type="button"
        className="corporate-hero-motion"
        aria-label={label}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        <span className="corporate-hero-tooltip" aria-hidden="true">{label}</span>
      </button> : null}
    </section>
  );
}
