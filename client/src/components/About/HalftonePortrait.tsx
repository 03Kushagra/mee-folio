import { useEffect, useRef, useState } from "react";

type Dot = {
  hx: number;
  hy: number;
  r: number;
  seed: number;
  stiffness: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type HalftonePortraitProps = {
  alt: string;
  src: string;
};

const SPACING = 7;
const LENS_RADIUS = 88;
const REPEL_RADIUS = 70;
const REPEL_FORCE = 2600;

function coverRect(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  return {
    height: drawHeight,
    width: drawWidth,
    x: (width - drawWidth) / 2,
    // Bias toward the top so faces stay in frame.
    y: (height - drawHeight) * 0.3,
  };
}

/**
 * The portrait is printed as a halftone "press proof". Dots fly in and settle
 * when the section scrolls into view, get pushed aside by the cursor, and a
 * lens follows the pointer to show the real photo underneath. Clicking (or
 * tapping) develops the whole print from the point you pressed.
 */
export function HalftonePortrait({ alt, src }: HalftonePortraitProps) {
  const frameRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const developedRef = useRef(false);
  const revealOriginRef = useRef({ x: 0, y: 0 });
  const scatterRef = useRef<(() => void) | null>(null);
  const [isDeveloped, setIsDeveloped] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!frame || !canvas || !context) {
      setStatus("error");
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const image = new Image();
    const pointer = { active: false, presence: 0, tx: 0, ty: 0, x: 0, y: 0 };
    const reveal = { progress: 0 };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let gradient: CanvasGradient | null = null;
    let animationFrame: number | null = null;
    let lastTime = 0;
    let hasBuilt = false;
    let isVisible = false;
    let disposed = false;
    // Idle "living print": after a moment without the cursor, the ink keeps moving.
    let clock = 0;
    let idle = 0;
    let idleFor = 0;
    let nextPulse = 2.5;
    const pulses: Array<{ start: number; x: number; y: number }> = [];

    const makeGradient = (angle: number) => {
      const half = Math.hypot(width, height) / 2;
      const cx = width / 2;
      const cy = height / 2;
      const next = context.createLinearGradient(
        cx - Math.cos(angle) * half,
        cy - Math.sin(angle) * half,
        cx + Math.cos(angle) * half,
        cy + Math.sin(angle) * half,
      );
      next.addColorStop(0, "#0d4aff");
      next.addColorStop(0.55, "#8a33f5");
      next.addColorStop(1, "#ff3357");
      return next;
    };

    const buildDots = () => {
      const bounds = frame.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;

      if (width < 10 || height < 10) {
        return;
      }

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0d4aff");
      gradient.addColorStop(0.55, "#8a33f5");
      gradient.addColorStop(1, "#ff3357");

      const columns = Math.floor(width / SPACING);
      const rows = Math.floor(height / SPACING);
      const sampler = document.createElement("canvas");
      sampler.width = columns;
      sampler.height = rows;
      const samplerContext = sampler.getContext("2d", {
        willReadFrequently: true,
      });

      if (!samplerContext) {
        return;
      }

      const cover = coverRect(
        image.naturalWidth || 800,
        image.naturalHeight || 1000,
        columns,
        rows,
      );
      samplerContext.drawImage(image, cover.x, cover.y, cover.width, cover.height);
      const pixels = samplerContext.getImageData(0, 0, columns, rows).data;
      const luminance = new Float32Array(columns * rows);
      let minimum = 1;
      let maximum = 0;

      for (let index = 0; index < columns * rows; index += 1) {
        const offset = index * 4;
        const alpha = pixels[offset + 3] / 255;
        const value =
          ((0.2126 * pixels[offset] +
            0.7152 * pixels[offset + 1] +
            0.0722 * pixels[offset + 2]) /
            255) *
            alpha +
          (1 - alpha);

        luminance[index] = value;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }

      const range = maximum - minimum || 1;
      const offsetX = (width - (columns - 1) * SPACING) / 2;
      const offsetY = (height - (rows - 1) * SPACING) / 2;
      const nextDots: Dot[] = [];
      const startScattered = !hasBuilt && !reduceMotion;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const normalized = (luminance[row * columns + column] - minimum) / range;
          const radius = Math.pow(1 - normalized, 1.15) * SPACING * 0.58;

          if (radius < 0.35) {
            continue;
          }

          const homeX = offsetX + column * SPACING;
          const homeY = offsetY + row * SPACING;
          const seed = Math.random();
          let x = homeX;
          let y = homeY;

          if (startScattered) {
            const angle = Math.random() * Math.PI * 2;
            const distance =
              (0.55 + Math.random() * 0.9) * Math.max(width, height);
            x = width / 2 + Math.cos(angle) * distance;
            y = height / 2 + Math.sin(angle) * distance;
          }

          nextDots.push({
            hx: homeX,
            hy: homeY,
            r: radius,
            seed,
            stiffness: 7 + seed * 12,
            vx: 0,
            vy: 0,
            x,
            y,
          });
        }
      }

      dots = nextDots;
      hasBuilt = true;
      draw();
    };

    const drawPhoto = () => {
      const cover = coverRect(image.naturalWidth, image.naturalHeight, width, height);
      context.drawImage(image, cover.x, cover.y, cover.width, cover.height);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (gradient) {
        context.beginPath();

        for (const dot of dots) {
          // While idle, waves of heavier and lighter ink roll diagonally across the print.
          const radius =
            idle > 0.01
              ? Math.max(0, dot.r * (1 + idle * 0.42 * Math.sin(dot.hx * 0.03 + dot.hy * 0.018 - clock * 1.3)))
              : dot.r;
          if (radius < 0.2) continue;
          context.moveTo(dot.x + radius, dot.y);
          context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        }

        // The colour gradient slowly swings around while idle.
        context.fillStyle =
          idle > 0.01
            ? makeGradient(Math.atan2(height, width) + Math.sin(clock * 0.22) * 1.1 * idle)
            : gradient;
        context.fill();
      }

      const lensRadius = LENS_RADIUS * pointer.presence;
      const revealRadius =
        reveal.progress * Math.hypot(width, height) * 1.05;

      if (lensRadius < 0.5 && revealRadius < 0.5) {
        return;
      }

      context.save();
      context.beginPath();

      if (lensRadius >= 0.5) {
        context.moveTo(pointer.x + lensRadius, pointer.y);
        context.arc(pointer.x, pointer.y, lensRadius, 0, Math.PI * 2);
      }

      if (revealRadius >= 0.5) {
        const origin = revealOriginRef.current;
        context.moveTo(origin.x + revealRadius, origin.y);
        context.arc(origin.x, origin.y, revealRadius, 0, Math.PI * 2);
      }

      context.clip();
      drawPhoto();
      context.restore();

      if (lensRadius >= 0.5 && reveal.progress < 0.98) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, lensRadius, 0, Math.PI * 2);
        context.lineWidth = 2;
        context.strokeStyle = "rgb(255 255 255 / 90%)";
        context.stroke();
        context.beginPath();
        context.arc(pointer.x, pointer.y, lensRadius + 6, 0, Math.PI * 2);
        context.lineWidth = 1;
        context.strokeStyle = "rgb(23 32 51 / 28%)";
        context.stroke();
      }
    };

    const step = (time: number) => {
      animationFrame = null;

      if (disposed || !isVisible) {
        return;
      }

      const delta = Math.min((time - (lastTime || time)) / 1000, 1 / 30);
      const seconds = time / 1000;
      lastTime = time;

      const ease = 1 - Math.exp(-delta * 14);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.presence +=
        ((pointer.active ? 1 : 0) - pointer.presence) * (1 - Math.exp(-delta * 10));

      clock += delta;
      idleFor = pointer.active || developedRef.current ? 0 : idleFor + delta;
      idle += ((idleFor > 1.2 && !reduceMotion ? 1 : 0) - idle) * (1 - Math.exp(-delta * 1.5));

      // Every few seconds of idling, a soft ripple runs through the dots from a random spot.
      if (idle > 0.8 && clock > nextPulse) {
        pulses.push({ start: clock, x: Math.random() * width, y: Math.random() * height });
        nextPulse = clock + 4.5 + Math.random() * 3;
      }
      for (let index = pulses.length - 1; index >= 0; index -= 1) {
        if (clock - pulses[index].start > 2.4) pulses.splice(index, 1);
      }

      const revealTarget = developedRef.current ? 1 : 0;
      reveal.progress = reduceMotion
        ? revealTarget
        : reveal.progress + (revealTarget - reveal.progress) * (1 - Math.exp(-delta * 4.5));

      if (!reduceMotion) {
        const damping = Math.exp(-6 * delta);
        const repelRadiusSquared = REPEL_RADIUS * REPEL_RADIUS;

        for (const dot of dots) {
          let targetX = dot.hx + Math.sin(seconds * 1.3 + dot.seed * 40) * 0.35;
          let targetY = dot.hy + Math.cos(seconds * 1.1 + dot.seed * 40) * 0.35;

          if (idle > 0.01) {
            // A slow current drifts the dots, like ink moving on wet paper.
            targetX += idle * (Math.sin(dot.hy * 0.045 + clock * 0.8) * 1.6 + Math.sin(dot.hx * 0.02 - clock * 0.5) * 1.1);
            targetY += idle * Math.cos(dot.hx * 0.04 + clock * 0.7) * 1.6;
          }

          let accelerationX = (targetX - dot.x) * dot.stiffness;
          let accelerationY = (targetY - dot.y) * dot.stiffness;

          for (const pulse of pulses) {
            const age = clock - pulse.start;
            const dx = dot.x - pulse.x;
            const dy = dot.y - pulse.y;
            const distance = Math.hypot(dx, dy) || 1;
            const band = Math.abs(distance - age * 210);
            if (band < 24) {
              const force = (1 - band / 24) * 1100 * (1 - age / 2.4) * idle;
              accelerationX += (dx / distance) * force;
              accelerationY += (dy / distance) * force;
            }
          }

          if (pointer.presence > 0.05) {
            const dx = dot.x - pointer.x;
            const dy = dot.y - pointer.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared < repelRadiusSquared && distanceSquared > 0.01) {
              const distance = Math.sqrt(distanceSquared);
              const force =
                (1 - distance / REPEL_RADIUS) * REPEL_FORCE * pointer.presence;
              accelerationX += (dx / distance) * force;
              accelerationY += (dy / distance) * force;
            }
          }

          dot.vx = (dot.vx + accelerationX * delta) * damping;
          dot.vy = (dot.vy + accelerationY * delta) * damping;
          dot.x += dot.vx * delta;
          dot.y += dot.vy * delta;
        }
      }

      draw();
      animationFrame = window.requestAnimationFrame(step);
    };

    const start = () => {
      if (animationFrame === null && !disposed) {
        lastTime = 0;
        animationFrame = window.requestAnimationFrame(step);
      }
    };

    const stop = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    scatterRef.current = () => {
      if (reduceMotion) {
        return;
      }

      for (const dot of dots) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 380;
        dot.vx += Math.cos(angle) * speed;
        dot.vy += Math.sin(angle) * speed;
      }
    };

    const toLocal = (event: PointerEvent) => {
      const bounds = frame.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const point = toLocal(event);

      if (!pointer.active) {
        pointer.x = point.x;
        pointer.y = point.y;
      }

      pointer.tx = point.x;
      pointer.ty = point.y;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handlePointerDown = (event: PointerEvent) => {
      revealOriginRef.current = toLocal(event);
    };

    frame.addEventListener("pointermove", handlePointerMove);
    frame.addEventListener("pointerleave", handlePointerLeave);
    frame.addEventListener("pointerdown", handlePointerDown);

    const resizeObserver = new ResizeObserver(() => {
      if (image.complete && image.naturalWidth > 0) {
        buildDots();
      }
    });

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;

        if (isVisible) {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0.15 },
    );

    image.onload = () => {
      if (disposed) {
        return;
      }

      setStatus("ready");
      buildDots();
      resizeObserver.observe(frame);
      intersectionObserver.observe(frame);
    };
    image.onerror = () => {
      if (!disposed) {
        setStatus("error");
      }
    };
    image.src = src;

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      frame.removeEventListener("pointermove", handlePointerMove);
      frame.removeEventListener("pointerleave", handlePointerLeave);
      frame.removeEventListener("pointerdown", handlePointerDown);
      scatterRef.current = null;
    };
  }, [src]);

  const toggleDeveloped = (fromKeyboard: boolean) => {
    const frame = frameRef.current;

    if (fromKeyboard && frame) {
      revealOriginRef.current = {
        x: frame.clientWidth / 2,
        y: frame.clientHeight / 2,
      };
    }

    const next = !developedRef.current;
    developedRef.current = next;
    setIsDeveloped(next);

    if (!next) {
      scatterRef.current?.();
    }
  };

  return (
    <figure className="halftone">
      <div className="halftone__marks" aria-hidden="true">
        <span className="halftone__label halftone__label--top">
          FIG. 01 — PRESS PROOF
        </span>
        <span className="halftone__label halftone__label--side">
          HALFTONE · {SPACING}PX · C M Y K
        </span>
        <span className="halftone__registration" />
      </div>

      <button
        aria-label={`${alt}. ${
          isDeveloped
            ? "Press to return to the halftone print."
            : "Press to develop the full photo."
        }`}
        aria-pressed={isDeveloped}
        className={[
          "halftone__frame",
          isDeveloped ? "halftone__frame--developed" : "",
          status === "error" ? "halftone__frame--error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => toggleDeveloped(event.detail === 0)}
        ref={frameRef}
        type="button"
      >
        <canvas ref={canvasRef} />
        {status === "error" ? (
          <span className="halftone__fallback">Photo coming soon</span>
        ) : null}
      </button>

      <figcaption className="halftone__caption">
        <span className="halftone__hint halftone__hint--hover">
          Move over the print to develop it · click to reveal
        </span>
        <span className="halftone__hint halftone__hint--touch">
          Tap the print to develop it
        </span>
      </figcaption>
    </figure>
  );
}
