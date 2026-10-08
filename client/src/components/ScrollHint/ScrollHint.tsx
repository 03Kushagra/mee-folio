import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { animateScrollTo } from "../../lib/smoothScroll";
import "./ScrollHint.css";

const WAIT_MS = 7000; // time at the top before hinting
const TOP_ZONE = 40; // px from the top that still counts as "at the top"
const NUDGE_PX = 120; // how far the page dips during the nudge
const DONE_AFTER = 300; // once a visitor scrolls this far, they know; no more hints

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(!signal.aborted), ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve(false);
    });
  });

/**
 * If a visitor sits at the top of the page for 7 seconds, show a "Scroll down for more"
 * pill in the bottom-right corner and give the page one small scroll nudge (down, then
 * back to where they were). Any wheel, touch or key press cancels the nudge.
 */
export function ScrollHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let done = window.scrollY > DONE_AFTER;
    let nudged = false;
    let timer = 0;
    let nudge: AbortController | null = null;

    const cancelNudge = () => nudge?.abort();

    const runNudge = async () => {
      nudged = true;
      nudge = new AbortController();
      const { signal } = nudge;
      const home = window.scrollY;
      try {
        if (!(await animateScrollTo(home + NUDGE_PX, 650, signal))) return;
        if (!(await wait(220, signal))) return;
        await animateScrollTo(home, 750, signal);
      } finally {
        nudge = null;
      }
    };

    const arm = () => {
      window.clearTimeout(timer);
      if (done || window.scrollY > TOP_ZONE) return;
      timer = window.setTimeout(() => {
        setVisible(true);
        if (!nudged && !reduceMotion) void runNudge();
      }, WAIT_MS);
    };

    const onScroll = () => {
      if (nudge) return; // our own nudge is moving the page
      if (window.scrollY > DONE_AFTER) {
        done = true;
        setVisible(false);
      } else if (window.scrollY > TOP_ZONE) {
        setVisible(false);
      }
      arm();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Capture phase so the nudge stops before the visitor's own scroll is handled.
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
      window.addEventListener(type, cancelNudge, { capture: true, passive: true });
    }
    arm();

    return () => {
      window.clearTimeout(timer);
      cancelNudge();
      window.removeEventListener("scroll", onScroll);
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
        window.removeEventListener(type, cancelNudge, { capture: true });
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          animate={{ opacity: 1, y: 0 }}
          className="scroll-hint"
          exit={{ opacity: 0, y: 12 }}
          href="#about"
          initial={{ opacity: 0, y: 12 }}
          onClick={() => setVisible(false)}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>Scroll down for more</span>
          <span aria-hidden="true" className="scroll-hint__arrow">
            <svg fill="none" height="14" viewBox="0 0 14 14" width="14">
              <path d="M7 2v10M2.5 7.5 7 12l4.5-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
