import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import "./ProjectShowcase.css";

type Project = {
  accent: string;
  description: string;
  demoUrl: string;
  githubUrl: string;
  id: string;
  images: Array<{
    alt: string;
    id: string;
    label: string;
  }>;
  metric: string;
  stack: string[];
  title: string;
  usp: string;
};

type MagneticLinkProps = {
  children: ReactNode;
  href: string;
};

function MagneticLink({ children, href }: MagneticLinkProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 18, mass: 0.45, stiffness: 320 });
  const springY = useSpring(y, { damping: 18, mass: 0.45, stiffness: 320 });

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    x.set((event.clientX - centerX) * 0.2);
    y.set((event.clientY - centerY) * 0.22);
  };

  const resetPosition = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      onPointerDown={resetPosition}
      onPointerLeave={resetPosition}
      onPointerMove={handlePointerMove}
      style={{ x: springX, y: springY }}
      transition={{ duration: 0.18 }}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.a>
  );
}

const projects: Project[] = [
  {
    accent: "#346bf1",
    description:
      "A focused dashboard that turns messy user signals into product-ready decisions.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "signal-room",
    images: [
      { alt: "Signal Room dashboard overview", id: "overview", label: "Overview" },
      { alt: "Signal Room insight detail", id: "insights", label: "Insights" },
      { alt: "Signal Room review board", id: "review", label: "Review" },
      { alt: "Signal Room metrics panel", id: "metrics", label: "Metrics" },
      { alt: "Signal Room automation flow", id: "flow", label: "Flow" },
      { alt: "Signal Room settings screen", id: "settings", label: "Settings" },
    ],
    metric: "42% faster review loops",
    stack: ["React", "Node", "MongoDB"],
    title: "Signal Room",
    usp: "Decision intelligence for teams that ship quickly.",
  },
  {
    accent: "#8d55e8",
    description:
      "An evaluator workspace for comparing AI code output against real project rules.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "eval-forge",
    images: [
      { alt: "Eval Forge comparison screen", id: "compare", label: "Compare" },
      { alt: "Eval Forge scoring screen", id: "scoring", label: "Scoring" },
      { alt: "Eval Forge trace view", id: "traces", label: "Traces" },
      { alt: "Eval Forge rubric editor", id: "rubric", label: "Rubric" },
      { alt: "Eval Forge model list", id: "models", label: "Models" },
      { alt: "Eval Forge export screen", id: "export", label: "Export" },
    ],
    metric: "6 model tracks",
    stack: ["TypeScript", "WebGL", "LLM Eval"],
    title: "Eval Forge",
    usp: "Turns subjective code review into measurable feedback.",
  },
  {
    accent: "#1fa58a",
    description:
      "A visual workflow builder that lets non-technical users compose automations.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "flowline",
    images: [
      { alt: "Flowline Studio canvas", id: "canvas", label: "Canvas" },
      { alt: "Flowline Studio node editor", id: "nodes", label: "Nodes" },
      { alt: "Flowline Studio run preview", id: "run", label: "Run" },
      { alt: "Flowline Studio logs", id: "logs", label: "Logs" },
      { alt: "Flowline Studio templates", id: "templates", label: "Templates" },
      { alt: "Flowline Studio deploy screen", id: "deploy", label: "Deploy" },
    ],
    metric: "18 reusable nodes",
    stack: ["React", "Canvas", "API"],
    title: "Flowline Studio",
    usp: "Complex automation without the spreadsheet energy.",
  },
  {
    accent: "#f17835",
    description:
      "A commerce experiment for playful product discovery and frictionless checkout.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "cartwave",
    images: [
      { alt: "Cartwave product wall", id: "wall", label: "Wall" },
      { alt: "Cartwave product detail", id: "detail", label: "Detail" },
      { alt: "Cartwave cart view", id: "cart", label: "Cart" },
      { alt: "Cartwave checkout", id: "checkout", label: "Checkout" },
      { alt: "Cartwave recommendations", id: "recs", label: "Recs" },
      { alt: "Cartwave order success", id: "success", label: "Success" },
    ],
    metric: "3-step checkout",
    stack: ["Vite", "Express", "Payments"],
    title: "Cartwave",
    usp: "Shop interactions that feel closer to browsing a moodboard.",
  },
  {
    accent: "#d8a20d",
    description:
      "A portfolio CMS concept built around case studies, notes, and project timelines.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "folio-core",
    images: [
      { alt: "Folio Core dashboard", id: "dashboard", label: "Dashboard" },
      { alt: "Folio Core case study editor", id: "editor", label: "Editor" },
      { alt: "Folio Core timeline", id: "timeline", label: "Timeline" },
      { alt: "Folio Core media library", id: "media", label: "Media" },
      { alt: "Folio Core notes", id: "notes", label: "Notes" },
      { alt: "Folio Core publishing screen", id: "publish", label: "Publish" },
    ],
    metric: "1 source of truth",
    stack: ["MongoDB", "REST", "Design System"],
    title: "Folio Core",
    usp: "Keeps the story of the work as polished as the work itself.",
  },
  {
    accent: "#ff4d7d",
    description:
      "A lightweight analytics layer that makes tiny UX moments visible to builders.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "pulsekit",
    images: [
      { alt: "PulseKit event overview", id: "events", label: "Events" },
      { alt: "PulseKit funnel", id: "funnel", label: "Funnel" },
      { alt: "PulseKit session path", id: "paths", label: "Paths" },
      { alt: "PulseKit alert rules", id: "alerts", label: "Alerts" },
      { alt: "PulseKit segment builder", id: "segments", label: "Segments" },
      { alt: "PulseKit report export", id: "reports", label: "Reports" },
    ],
    metric: "12 event lenses",
    stack: ["Charts", "Node", "Product Analytics"],
    title: "PulseKit",
    usp: "Shows the moments users almost never tell you about.",
  },
];

export function ProjectShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeProject = projects[activeIndex];
  const activeImage = activeProject.images[activeImageIndex];
  const projectDisplayNumber = String(activeIndex + 1).padStart(2, "0");

  const handleProjectChange = (nextProjectIndex: number) => {
    setActiveIndex(nextProjectIndex);
    setActiveImageIndex(0);
  };

  return (
    <div
      className="project-showcase"
      style={{ "--project-accent": activeProject.accent } as CSSProperties}
    >
      <article className="project-showcase__stage">
        <div className="project-showcase__preview">
          <div className="project-showcase__orb project-showcase__orb--one" />
          <div className="project-showcase__orb project-showcase__orb--two" />
          <div
            aria-hidden="true"
            className="project-showcase__mockup-companion"
          />
          <motion.div
            aria-label={activeImage.alt}
            className="project-showcase__mockup"
            role="img"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="project-showcase__mockup-topline" />
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                className="project-showcase__mockup-title"
                exit={{ filter: "blur(6px)", opacity: 0, y: -12 }}
                initial={{ filter: "blur(8px)", opacity: 0, y: 16 }}
                key={`${activeProject.id}-${activeImage.id}-mockup-title`}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeProject.title}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                className="project-showcase__mockup-grid"
                exit={{ filter: "blur(6px)", opacity: 0, y: -10 }}
                initial={{ filter: "blur(8px)", opacity: 0, y: 14 }}
                key={`${activeProject.id}-${activeImage.id}-mockup-grid`}
                transition={{ delay: 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <span />
                <span />
                <span />
                <span />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div
            aria-label="Choose project image"
            className="project-showcase__image-nav"
          >
            {activeProject.images.map((image, imageIndex) => (
              <motion.button
                aria-label={`Show ${image.label} image`}
                aria-pressed={imageIndex === activeImageIndex}
                className={
                  imageIndex === activeImageIndex
                    ? "project-showcase__number project-showcase__number--active"
                    : "project-showcase__number"
                }
                key={image.id}
                onClick={() => setActiveImageIndex(imageIndex)}
                whileTap={{ scale: 0.9 }}
                type="button"
              >
                {imageIndex + 1}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="project-showcase__details">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="project-showcase__counter"
            initial={{ opacity: 0, y: -8 }}
            key={`${activeProject.id}-counter`}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {projectDisplayNumber} / {String(projects.length).padStart(2, "0")}
          </motion.span>
          <motion.h3
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            initial={{ filter: "blur(10px)", opacity: 0, y: 18 }}
            key={`${activeProject.id}-title`}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeProject.title}
          </motion.h3>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 14 }}
            key={`${activeProject.id}-description`}
            transition={{ delay: 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeProject.description}
          </motion.p>

          <div className="project-showcase__usp">
            <span>USP</span>
            <motion.strong
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 10 }}
              key={`${activeProject.id}-usp`}
              transition={{ delay: 0.06, duration: 0.28, ease: "easeOut" }}
            >
              {activeProject.usp}
            </motion.strong>
          </div>

          <div className="project-showcase__meta">
            <div>
              <span>Signal</span>
              <motion.strong
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 8 }}
                key={`${activeProject.id}-metric`}
                transition={{ delay: 0.08, duration: 0.26, ease: "easeOut" }}
              >
                {activeProject.metric}
              </motion.strong>
            </div>
            <div>
              <span>Stack</span>
              <motion.strong
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 8 }}
                key={`${activeProject.id}-stack`}
                transition={{ delay: 0.1, duration: 0.26, ease: "easeOut" }}
              >
                {activeProject.stack.join(" / ")}
              </motion.strong>
            </div>
          </div>

          <div className="project-showcase__actions">
            <MagneticLink href={activeProject.githubUrl}>GitHub</MagneticLink>
            <MagneticLink href={activeProject.demoUrl}>Demo</MagneticLink>
          </div>

          <div
            aria-label="Choose project"
            className="project-showcase__project-nav"
          >
            {projects.map((project, index) => (
              <motion.button
                aria-label={`Show ${project.title}`}
                aria-pressed={index === activeIndex}
                className={
                  index === activeIndex
                    ? "project-showcase__number project-showcase__number--active"
                    : "project-showcase__number"
                }
                key={project.id}
                onClick={() => handleProjectChange(index)}
                whileTap={{ scale: 0.9 }}
                type="button"
              >
                {index + 1}
              </motion.button>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
