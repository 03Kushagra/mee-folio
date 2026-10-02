export type LoopPointer = {
  active: boolean;
  down: boolean;
  px: number;
  py: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

export type LoopContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  height: number;
  pixelRatio: number;
  pointer: LoopPointer;
  reduceMotion: boolean;
  section: HTMLElement;
  width: number;
};

type LoopOptions = {
  canvas: HTMLCanvasElement;
  maxPixelRatio?: number;
  onFrame: (loop: LoopContext, delta: number, time: number) => void;
  onResize?: (loop: LoopContext) => void;
  section: HTMLElement;
};

/**
 * Shared plumbing for the hero samples: sizes the canvas to its section,
 * tracks the pointer in section coordinates, and only animates while the
 * section is on screen. Returns a cleanup function.
 */
export function startCanvasLoop({
  canvas,
  maxPixelRatio = 2,
  onFrame,
  onResize,
  section,
}: LoopOptions) {
  const context = canvas.getContext("2d");

  if (!context) {
    return () => undefined;
  }

  const loop: LoopContext = {
    canvas,
    context,
    height: 0,
    pixelRatio: 1,
    pointer: { active: false, down: false, px: 0, py: 0, vx: 0, vy: 0, x: 0, y: 0 },
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    section,
    width: 0,
  };
  let frameId: number | null = null;
  let lastTime = 0;
  let isVisible = false;

  const resize = () => {
    const bounds = section.getBoundingClientRect();
    loop.pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    loop.width = bounds.width;
    loop.height = bounds.height;
    canvas.width = Math.max(1, Math.round(bounds.width * loop.pixelRatio));
    canvas.height = Math.max(1, Math.round(bounds.height * loop.pixelRatio));
    context.setTransform(loop.pixelRatio, 0, 0, loop.pixelRatio, 0, 0);
    onResize?.(loop);
  };

  const tick = (time: number) => {
    frameId = null;

    if (!isVisible) {
      return;
    }

    const delta = Math.min((time - (lastTime || time)) / 1000, 1 / 30);
    lastTime = time;

    if (delta > 0) {
      loop.pointer.vx = (loop.pointer.x - loop.pointer.px) / delta;
      loop.pointer.vy = (loop.pointer.y - loop.pointer.py) / delta;
    }

    onFrame(loop, delta, time / 1000);
    loop.pointer.px = loop.pointer.x;
    loop.pointer.py = loop.pointer.y;
    frameId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (frameId === null) {
      lastTime = 0;
      frameId = window.requestAnimationFrame(tick);
    }
  };

  const updatePointer = (event: PointerEvent) => {
    const bounds = section.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (!loop.pointer.active) {
      loop.pointer.px = x;
      loop.pointer.py = y;
    }

    loop.pointer.x = x;
    loop.pointer.y = y;
    loop.pointer.active = true;
  };
  const handleDown = (event: PointerEvent) => {
    updatePointer(event);
    loop.pointer.down = true;
  };
  const handleUp = () => {
    loop.pointer.down = false;
  };
  const handleLeave = (event: PointerEvent) => {
    loop.pointer.active = false;
    loop.pointer.down = event.buttons > 0 && loop.pointer.down;
  };

  section.addEventListener("pointermove", updatePointer, { passive: true });
  section.addEventListener("pointerdown", handleDown, { passive: true });
  window.addEventListener("pointerup", handleUp, { passive: true });
  section.addEventListener("pointerleave", handleLeave);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(section);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;

    if (isVisible) {
      start();
    } else if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  });
  intersectionObserver.observe(section);

  resize();

  return () => {
    isVisible = false;

    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }

    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    section.removeEventListener("pointermove", updatePointer);
    section.removeEventListener("pointerdown", handleDown);
    window.removeEventListener("pointerup", handleUp);
    section.removeEventListener("pointerleave", handleLeave);
  };
}

export function rectInSection(rect: DOMRect, section: HTMLElement) {
  const bounds = section.getBoundingClientRect();

  return {
    height: rect.height,
    width: rect.width,
    x: rect.left - bounds.left,
    y: rect.top - bounds.top,
  };
}

export const toneColors: Record<string, string> = {
  blue: "#346bf1",
  orange: "#f17835",
  purple: "#8d55e8",
  teal: "#1fa58a",
  yellow: "#d8a20d",
};
