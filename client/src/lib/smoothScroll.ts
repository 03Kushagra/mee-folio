/**
 * Smooth page scrolling.
 *
 * - `enableSmoothWheel()` makes mouse-wheel / trackpad scrolling glide instead of jumping.
 *   Each wheel event moves a target position; every frame the page eases a share of the
 *   way towards it. Scroll areas inside the page, ctrl+wheel (zoom), the image viewer
 *   (body overflow hidden) and visitors who prefer reduced motion keep native scrolling.
 * - `animateScrollTo()` plays a timed scroll (used by the scroll hint's nudge).
 * - `isProgrammaticScroll()` lets other code (the toolbar) ignore scrolls we started.
 */

let programmatic = false;

export function isProgrammaticScroll() {
  return programmatic;
}

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
const clamp = (value: number) => Math.max(0, Math.min(maxScroll(), value));

function jumpTo(y: number) {
  // "instant" so the global `scroll-behavior: smooth` doesn't animate each step again.
  window.scrollTo({ behavior: "instant", top: y });
}

/** True when the wheel should scroll an inner element rather than the page. */
function scrollsInside(target: EventTarget | null, deltaY: number) {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body && element !== document.documentElement) {
    if (element instanceof HTMLElement && element.dataset.nativeScroll !== undefined) return true;
    const { overflowY } = window.getComputedStyle(element);
    if ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight) {
      const atTop = element.scrollTop <= 0;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function enableSmoothWheel(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let target = window.scrollY;
  let lastSet = window.scrollY;
  let frame = 0;
  let lastTime = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const step = (time: number) => {
    const delta = Math.min(0.05, (time - (lastTime || time)) / 1000 || 1 / 60);
    lastTime = time;
    const y = window.scrollY;

    // Something else moved the page (scrollbar drag, keyboard, anchor link): let it win.
    if (Math.abs(y - lastSet) > 2) {
      stop();
      return;
    }

    let next = y + (target - y) * (1 - Math.exp(-delta * 11));
    if (Math.abs(target - next) < 0.5) next = target;
    jumpTo(next);
    lastSet = next;

    if (next === target) stop();
    else frame = requestAnimationFrame(step);
  };

  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || programmatic) return;
    if (document.body.style.overflow === "hidden") return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (scrollsInside(event.target, event.deltaY)) return;

    event.preventDefault();
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1;
    if (!frame) {
      target = window.scrollY;
      lastSet = window.scrollY;
      lastTime = 0;
    }
    target = clamp(target + event.deltaY * unit);
    if (!frame) frame = requestAnimationFrame(step);
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    stop();
    window.removeEventListener("wheel", onWheel);
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Scrolls to `to` over `duration` ms. Resolves true when finished, false if cancelled. */
export function animateScrollTo(to: number, duration: number, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    const from = window.scrollY;
    const end = clamp(to);
    const start = performance.now();
    programmatic = true;

    const finish = (done: boolean) => {
      programmatic = false;
      resolve(done);
    };

    const tick = (now: number) => {
      if (signal?.aborted) return finish(false);
      const t = Math.min(1, (now - start) / duration);
      jumpTo(from + (end - from) * easeInOut(t));
      if (t < 1) requestAnimationFrame(tick);
      else finish(true);
    };
    requestAnimationFrame(tick);
  });
}
