import { useEffect, useState, type RefObject } from "react";

type ProjectNavProps = {
  count: number;
  index: number;
  onChange: (index: number) => void;
  /** Arrow keys switch projects while the pointer is over this element. */
  scopeRef: RefObject<HTMLElement | null>;
};

/** Compact project navigator: ‹ one segment per project › — click a segment to jump. */
export function ProjectNav({ count, index, onChange, scopeRef }: ProjectNavProps) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const enter = () => setIsHovered(true);
    const leave = () => setIsHovered(false);
    scope.addEventListener("pointerenter", enter);
    scope.addEventListener("pointerleave", leave);
    return () => {
      scope.removeEventListener("pointerenter", enter);
      scope.removeEventListener("pointerleave", leave);
    };
  }, [scopeRef]);

  useEffect(() => {
    if (!isHovered) return;

    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [role='slider']") || document.querySelector(".lightbox")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange((index + 1) % count);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange((index - 1 + count) % count);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [count, index, isHovered, onChange]);

  return (
    <nav aria-label="Projects" className="pnav">
      <span aria-live="polite" className="sr-only">
        Project {index + 1} of {count}
      </span>

      <button
        aria-label="Previous project"
        className="pnav__arrow"
        onClick={() => onChange((index - 1 + count) % count)}
        type="button"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <span className="pnav__segments">
        {Array.from({ length: count }, (_, segment) => (
          <button
            aria-current={segment === index ? "step" : undefined}
            aria-label={`Go to project ${segment + 1}`}
            className={segment === index ? "pnav__segment pnav__segment--active" : "pnav__segment"}
            key={segment}
            onClick={() => onChange(segment)}
            type="button"
          />
        ))}
      </span>

      <button
        aria-label="Next project"
        className="pnav__arrow"
        onClick={() => onChange((index + 1) % count)}
        type="button"
      >
        <span aria-hidden="true">›</span>
      </button>

      <span aria-hidden="true" className={isHovered ? "pnav__hint pnav__hint--visible" : "pnav__hint"}>
        <kbd>←</kbd> <kbd>→</kbd> to switch
      </span>
    </nav>
  );
}
