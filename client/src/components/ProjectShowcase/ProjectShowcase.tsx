import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FakeScreen } from "./FakeScreen";
import { ImageLightbox } from "./ImageLightbox";
import { ProjectNav } from "./ProjectNav";
import { useProjects, type Project } from "./projectsData";
import "./screens.css";
import "./ProjectShowcase.css";

const FRAME_W = 360;
const FRAME_H = 225;
const GAP_X = 80;
const GAP_Y = 90;
const COLUMNS = 3;
const PANEL_W = 76;
const TOP_RESERVE = 58; // toolbar
const BOTTOM_RESERVE = 62; // bottom bar (image pills + links)
const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5];

function framePosition(index: number) {
  return {
    x: (index % COLUMNS) * (FRAME_W + GAP_X),
    y: Math.floor(index / COLUMNS) * (FRAME_H + GAP_Y),
  };
}

/** How one technology was used in this project; shown while its chip is hovered (or tapped). */
function StackUsage({
  className,
  id,
  project,
  technology,
}: {
  className: string;
  id?: string;
  project: Project;
  technology: string | null;
}) {
  return (
    <div aria-live="polite" className={`stack-usage ${className}`} id={id}>
      <AnimatePresence mode="wait">
        {technology ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="stack-usage__card"
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, y: 8 }}
            key={technology}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="stack-usage__label">
              How <b>{technology}</b> was used
            </span>
            <p>{project.stackUsage[technology] ?? "Details coming soon."}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Projects section: each project's screenshots are frames on a design canvas.
 * Frames are picked from a layers panel (or pills on small screens) and the view glides
 * to them; the selected frame opens full size on click.
 */
export function ProjectShowcase() {
  const projects = useProjects();
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [projectIndex, setProjectIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoomStep, setZoomStep] = useState(2);
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ height: 540, width: 780 });
  const project = projects[Math.min(projectIndex, projects.length - 1)];
  const images = project.images;
  const selected = Math.min(imageIndex, images.length - 1);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setViewport({ height: element.clientHeight, width: element.clientWidth }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ---- Camera ----
  const panel = viewport.width > 640 ? PANEL_W : 0;
  const usableW = viewport.width - panel;
  const usableH = viewport.height - TOP_RESERVE - BOTTOM_RESERVE;
  const fitScale = Math.min((usableW - 70) / FRAME_W, (usableH - 50) / FRAME_H, 1.3);
  const scale = fitScale * ZOOM_STEPS[zoomStep];
  const frame = framePosition(selected);
  const focusX = frame.x + FRAME_W / 2;
  const focusY = frame.y + FRAME_H / 2;
  const cameraX = panel + usableW / 2 - focusX * scale;
  const cameraY = TOP_RESERVE + usableH / 2 + 8 - focusY * scale;
  const zoomPercent = Math.round(((FRAME_W * scale) / 1440) * 100);

  // Moving between frames zooms out a little mid-flight; plain zoom changes don't.
  const lastFrameRef = useRef(selected);
  const isTravelling = lastFrameRef.current !== selected;
  useEffect(() => {
    lastFrameRef.current = selected;
  }, [selected]);

  const selectImage = (index: number) => {
    setImageIndex(index);
  };

  const selectProject = (index: number) => {
    setProjectIndex(index);
    setImageIndex(0);
    setHoveredTech(null);
  };

  return (
    <div className="projects" ref={sectionRef} style={{ "--accent": project.accent } as CSSProperties}>
      <div className="projects__layout">
        <div className="projects__media">
          <div className="canvas" ref={viewportRef}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                animate={{
                  opacity: 1,
                  scale: isTravelling ? [null, scale * 0.78, scale] : scale,
                  x: cameraX,
                  y: cameraY,
                }}
                className="canvas__world"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, scale, x: cameraX, y: cameraY }}
                key={project.id}
                transition={{ duration: 0.75, ease: [0.65, 0, 0.35, 1], opacity: { duration: 0.3 } }}
              >
                {images.map((image, index) => {
                  const position = framePosition(index);
                  const isSelected = index === selected;
                  return (
                    <div
                      className={isSelected ? "canvas__frame canvas__frame--selected" : "canvas__frame"}
                      key={image.id}
                      style={{ height: FRAME_H, left: position.x, top: position.y, width: FRAME_W }}
                    >
                      <div aria-hidden="true" className="canvas__frame-label">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <button
                        aria-label={isSelected ? `Open ${image.label} full size` : `Show ${image.label}`}
                        className="canvas__frame-button"
                        onClick={() => (isSelected ? setLightbox(index) : selectImage(index))}
                        type="button"
                      >
                        <FakeScreen
                          accent={project.accent}
                          label={image.label}
                          title={project.title}
                          url={image.url}
                          variant={index}
                        />
                      </button>
                      {isSelected ? (
                        <>
                          <span aria-hidden="true" className="canvas__handle canvas__handle--tl" />
                          <span aria-hidden="true" className="canvas__handle canvas__handle--tr" />
                          <span aria-hidden="true" className="canvas__handle canvas__handle--bl" />
                          <span aria-hidden="true" className="canvas__handle canvas__handle--br" />
                          <span aria-hidden="true" className="canvas__size">
                            1440 × 900
                          </span>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            <div className="canvas__toolbar" style={{ left: panel + usableW / 2 }}>
              <button
                aria-label="Zoom out"
                disabled={zoomStep === 0}
                onClick={() => setZoomStep((step) => Math.max(0, step - 1))}
                type="button"
              >
                −
              </button>
              <span className="canvas__zoom">{zoomPercent}%</span>
              <button
                aria-label="Zoom in"
                disabled={zoomStep === ZOOM_STEPS.length - 1}
                onClick={() => setZoomStep((step) => Math.min(ZOOM_STEPS.length - 1, step + 1))}
                type="button"
              >
                +
              </button>
            </div>

            {panel ? (
              <div aria-label="Images" className="canvas__layers" role="group">
                {images.map((image, index) => (
                  <button
                    aria-label={`Show image ${index + 1}: ${image.label}`}
                    aria-pressed={index === selected}
                    className={index === selected ? "canvas__layer canvas__layer--active" : "canvas__layer"}
                    key={image.id}
                    onClick={() => selectImage(index)}
                    title={image.label}
                    type="button"
                  >
                    <span aria-hidden="true" className="canvas__layer-number">
                      {index + 1}
                    </span>
                    <span className="canvas__layer-thumb">
                      <FakeScreen accent={project.accent} label="" title="" url={image.url} variant={index} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Bottom bar: image pills (small screens) on the left, links pinned to the right corner. */}
            <div className="canvas__bar" style={{ left: panel + 12 }}>
              <div className="canvas__pills">
                {!panel
                  ? images.map((image, index) => (
                      <button
                        aria-label={`Show image ${index + 1}: ${image.label}`}
                        aria-pressed={index === selected}
                        key={image.id}
                        onClick={() => selectImage(index)}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    ))
                  : null}
              </div>
              <div className="canvas__links">
                <a aria-label="GitHub" href={project.githubUrl} rel="noreferrer" target="_blank">
                  <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  <span className="canvas__link-text">GitHub</span>
                </a>
                <a className="canvas__links-demo" href={project.demoUrl} rel="noreferrer" target="_blank">
                  <span className="canvas__link-text">Live demo</span>
                  <span className="canvas__link-short">Demo</span> <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="projects__stack-block"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 6 }}
              key={project.id}
              transition={{ duration: 0.22 }}
            >
              <ul aria-label="Tech stack" className="projects__stack">
                {project.stack.map((technology) => (
                  <li key={technology}>
                    <button
                      aria-describedby={hoveredTech === technology ? "stack-usage" : undefined}
                      aria-pressed={hoveredTech === technology}
                      onBlur={() => setHoveredTech((current) => (current === technology ? null : current))}
                      onClick={() => setHoveredTech(technology)}
                      onFocus={() => setHoveredTech(technology)}
                      onMouseEnter={() => setHoveredTech(technology)}
                      onMouseLeave={() => setHoveredTech((current) => (current === technology ? null : current))}
                      type="button"
                    >
                      {technology}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="projects__stack-hint">
                <span aria-hidden="true">↑</span>
                <span className="projects__hint-hover">Hover over a technology to see how it was used</span>
                <span className="projects__hint-touch">Tap a technology to see how it was used</span>
              </p>
              <StackUsage className="stack-usage--inline" project={project} technology={hoveredTech} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="projects__details">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 12 }}
              key={project.id}
              transition={{ duration: 0.25 }}
            >
              <h3 className="projects__title">{project.title}</h3>
              <p className="projects__description">{project.description}</p>
              <div className="projects__usp">
                <span>USP</span>
                <strong>{project.usp}</strong>
              </div>
            </motion.div>
          </AnimatePresence>

          <StackUsage className="stack-usage--side" id="stack-usage" project={project} technology={hoveredTech} />

          {/* Pinned to the bottom-right, level with the bottom of the canvas. */}
          <div className="projects__nav">
            <ProjectNav count={projects.length} index={projectIndex} onChange={selectProject} scopeRef={sectionRef} />
          </div>
        </div>
      </div>

      <ImageLightbox
        accent={project.accent}
        images={images}
        index={lightbox}
        onChange={(index) => {
          setLightbox(index);
          setImageIndex(index);
        }}
        onClose={() => setLightbox(null)}
        title={project.title}
      />
    </div>
  );
}
