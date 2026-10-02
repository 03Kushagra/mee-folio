import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import "./ImageLightbox.css";

export type LightboxImage = { alt: string; id: string; label: string; url: string };

type ImageLightboxProps = {
  accent: string;
  images: LightboxImage[];
  index: number | null; // null = closed
  onChange: (index: number) => void;
  onClose: () => void;
  title: string;
};

/**
 * Full-screen viewer for a project's images.
 * Click the image to zoom in further (2.2×) and move the mouse to pan; arrows / ← → switch images; Esc closes.
 */
export function ImageLightbox({ accent, images, index, onChange, onClose, title }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const isOpen = index !== null;
  const image = index !== null ? images[index] : null;

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  useEffect(() => {
    if (index === null) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % images.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [images.length, index, onChange, onClose]);

  const trackPointer = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  // Rendered into <body> so animated/filtered parent sections can't trap the fixed overlay.
  return createPortal(
    <AnimatePresence>
      {image && index !== null ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label={`${title}: ${image.label}`}
          aria-modal="true"
          className="lightbox"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          role="dialog"
          style={{ "--lightbox-accent": accent } as CSSProperties}
          transition={{ duration: 0.22 }}
        >
          <div className="lightbox__bar">
            <span className="lightbox__title">
              {title} <span>· {image.label}</span>
            </span>
            <span className="lightbox__count">
              {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </span>
            <button aria-label="Close" className="lightbox__close" onClick={onClose} ref={closeRef} type="button">
              ✕
            </button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.button
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              className={zoomed ? "lightbox__stage lightbox__stage--zoomed" : "lightbox__stage"}
              exit={{ opacity: 0, scale: 0.97 }}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              key={image.id}
              onClick={(event) => {
                trackPointer(event);
                setZoomed((current) => !current);
              }}
              onMouseMove={zoomed ? trackPointer : undefined}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              type="button"
            >
              {image.url ? (
                <img
                  alt={image.alt}
                  draggable={false}
                  src={image.url}
                  style={{
                    transform: zoomed ? "scale(2.2)" : "scale(1)",
                    transformOrigin: `${origin.x}% ${origin.y}%`,
                  }}
                />
              ) : (
                <span
                  className="lightbox__placeholder"
                  style={{
                    transform: zoomed ? "scale(2.2)" : "scale(1)",
                    transformOrigin: `${origin.x}% ${origin.y}%`,
                  }}
                >
                  <strong>{title}</strong>
                  <span>{image.label} · screenshot coming soon</span>
                </span>
              )}
            </motion.button>
          </AnimatePresence>

          {images.length > 1 ? (
            <>
              <button
                aria-label="Previous image"
                className="lightbox__nav lightbox__nav--prev"
                onClick={() => onChange((index - 1 + images.length) % images.length)}
                type="button"
              >
                ←
              </button>
              <button
                aria-label="Next image"
                className="lightbox__nav lightbox__nav--next"
                onClick={() => onChange((index + 1) % images.length)}
                type="button"
              >
                →
              </button>
            </>
          ) : null}

          <p className="lightbox__hint">Click the image to zoom · ← → to browse · Esc to close</p>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
