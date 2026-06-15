import { useEffect, useRef, useState } from "react";
import { GpuParticleEngine } from "./GpuParticleEngine";
import "./HeroParticles.css";

export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let engine: GpuParticleEngine | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    try {
      const particleCount = window.innerWidth < 720 ? 500 : 1_200;
      engine = new GpuParticleEngine(canvas, { particleCount });
      setIsSupported(true);

      const resizeObserver = new ResizeObserver(() => engine?.resize());
      resizeObserver.observe(canvas);

      const handlePointerMove = (event: PointerEvent) => {
        engine?.setPointer(event.clientX, event.clientY);
      };
      const handlePointerLeave = () => engine?.clearPointer();

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        "pointerleave",
        handlePointerLeave,
      );

      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !reducedMotionQuery.matches) {
            engine?.start();
          } else {
            engine?.stop();
          }
        },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(canvas);

      return () => {
        resizeObserver.disconnect();
        intersectionObserver?.disconnect();
        window.removeEventListener("pointermove", handlePointerMove);
        document.documentElement.removeEventListener(
          "pointerleave",
          handlePointerLeave,
        );
        engine?.destroy();
      };
    } catch (error) {
      console.warn("GPU particles are unavailable:", error);
      setIsSupported(false);
      engine?.destroy();
      intersectionObserver?.disconnect();
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`hero-particles ${isSupported ? "" : "hero-particles--fallback"}`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
