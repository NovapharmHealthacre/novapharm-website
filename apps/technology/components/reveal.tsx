"use client";

import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 28,
  as = "div",
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li";
  immediate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const MotionElement = as === "li" ? motion.li : motion.div;
  return (
    <MotionElement
      className={className}
      initial={immediate || reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionElement>
  );
}
