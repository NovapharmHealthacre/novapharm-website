"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ArrowRight } from "@/components/icons";
import { capabilities } from "@/data/site";

export function CapabilityExplorer() {
  const [activeId, setActiveId] = useState(capabilities[0]?.id ?? "");
  const active = capabilities.find((item) => item.id === activeId) ?? capabilities[0];
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  return (
    <div className="capability-explorer">
      <div className="capability-explorer__nav" role="tablist" aria-label="Advisory capabilities">
        {capabilities.map((capability) => (
          <button
            type="button"
            key={capability.id}
            role="tab"
            id={`tab-${capability.id}`}
            aria-controls={`panel-${capability.id}`}
            aria-selected={active.id === capability.id}
            onClick={() => setActiveId(capability.id)}
          >
            <span>{capability.index}</span>
            <strong>{capability.title}</strong>
            <ArrowRight />
          </button>
        ))}
      </div>

      <div className="capability-explorer__panel-wrap">
        <AnimatePresence mode="wait">
          <motion.div
            className="capability-explorer__panel"
            key={active.id}
            role="tabpanel"
            id={`panel-${active.id}`}
            aria-labelledby={`tab-${active.id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="capability-explorer__number">{active.index}</p>
            <h3>{active.title}</h3>
            <p className="capability-explorer__short">{active.short}</p>
            <p>{active.statement}</p>
            <div className="capability-explorer__detail">
              <div>
                <h4>Questions we help answer</h4>
                <ul>
                  {active.questions.map((question) => <li key={question}>{question}</li>)}
                </ul>
              </div>
              <div>
                <h4>Typical outputs</h4>
                <ul>
                  {active.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}
                </ul>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
