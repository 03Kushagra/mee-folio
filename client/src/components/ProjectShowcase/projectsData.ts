import { useEffect, useState } from "react";

/*
 * Project data shared by the projects section: the shape the UI uses, the fallback
 * examples shown until the database has projects, and the hook that loads them.
 */

export type Project = {
  accent: string;
  description: string;
  demoUrl: string;
  githubUrl: string;
  id: string;
  images: Array<{
    alt: string;
    id: string;
    label: string;
    url: string;
  }>;
  stack: string[];
  /** What each technology in `stack` was used for in this project (shown on hover). */
  stackUsage: Record<string, string>;
  title: string;
  usp: string;
};

export type ApiProject = {
  _id: string;
  description: string;
  featured?: boolean;
  featuredImageUrl?: string;
  githubUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
  liveUrl?: string;
  techStack?: string[];
  stackUsage?: Record<string, string>;
  title: string;
};

export const projectAccents = ["#346bf1", "#8d55e8", "#1fa58a", "#f17835", "#d8a20d", "#ff4d7d"];

export const fallbackProjects: Project[] = [
  {
    accent: "#346bf1",
    description:
      "A focused dashboard that turns messy user signals into product-ready decisions.",
    demoUrl: "#work",
    githubUrl: "#work",
    id: "signal-room",
    images: [
      { alt: "Signal Room dashboard overview", id: "overview", label: "Overview", url: "" },
      { alt: "Signal Room insight detail", id: "insights", label: "Insights", url: "" },
      { alt: "Signal Room review board", id: "review", label: "Review", url: "" },
      { alt: "Signal Room metrics panel", id: "metrics", label: "Metrics", url: "" },
      { alt: "Signal Room automation flow", id: "flow", label: "Flow", url: "" },
      { alt: "Signal Room settings screen", id: "settings", label: "Settings", url: "" },
    ],
    stack: ["React", "Node", "MongoDB"],
    stackUsage: {
      React: "Built the dashboard UI \u2014 filterable signal feeds, review boards and live charts as reusable components.",
      Node: "Runs the ingestion API that collects user signals and groups them into themes every few minutes.",
      MongoDB: "Stores raw signals and the decisions made from them, with indexes tuned for fast filtering by date and team.",
    },
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
      { alt: "Eval Forge comparison screen", id: "compare", label: "Compare", url: "" },
      { alt: "Eval Forge scoring screen", id: "scoring", label: "Scoring", url: "" },
      { alt: "Eval Forge trace view", id: "traces", label: "Traces", url: "" },
      { alt: "Eval Forge rubric editor", id: "rubric", label: "Rubric", url: "" },
      { alt: "Eval Forge model list", id: "models", label: "Models", url: "" },
      { alt: "Eval Forge export screen", id: "export", label: "Export", url: "" },
    ],
    stack: ["TypeScript", "WebGL", "LLM Eval"],
    stackUsage: {
      TypeScript: "Typed the whole evaluator end to end, so rubric changes surface as compile errors instead of silent bugs.",
      WebGL: "Renders large side-by-side diff views and trace timelines smoothly, even with thousands of lines.",
      "LLM Eval": "Scores model answers against project-specific rubrics and tracks quality across six model versions.",
    },
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
      { alt: "Flowline Studio canvas", id: "canvas", label: "Canvas", url: "" },
      { alt: "Flowline Studio node editor", id: "nodes", label: "Nodes", url: "" },
      { alt: "Flowline Studio run preview", id: "run", label: "Run", url: "" },
      { alt: "Flowline Studio logs", id: "logs", label: "Logs", url: "" },
      { alt: "Flowline Studio templates", id: "templates", label: "Templates", url: "" },
      { alt: "Flowline Studio deploy screen", id: "deploy", label: "Deploy", url: "" },
    ],
    stack: ["React", "Canvas", "API"],
    stackUsage: {
      React: "Powers the editor shell \u2014 node inspector, templates gallery and run history.",
      Canvas: "Draws the drag-and-drop workflow graph: nodes, connectors and live run highlights.",
      API: "A REST API that saves workflows, runs them and streams step-by-step logs back to the editor.",
    },
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
      { alt: "Cartwave product wall", id: "wall", label: "Wall", url: "" },
      { alt: "Cartwave product detail", id: "detail", label: "Detail", url: "" },
      { alt: "Cartwave cart view", id: "cart", label: "Cart", url: "" },
      { alt: "Cartwave checkout", id: "checkout", label: "Checkout", url: "" },
      { alt: "Cartwave recommendations", id: "recs", label: "Recs", url: "" },
      { alt: "Cartwave order success", id: "success", label: "Success", url: "" },
    ],
    stack: ["Vite", "Express", "Payments"],
    stackUsage: {
      Vite: "Fast dev server and build for the storefront, keeping the product wall snappy to iterate on.",
      Express: "Handles cart, order and recommendation endpoints behind the storefront.",
      Payments: "A three-step checkout with card payments and clear handling for failed and retried charges.",
    },
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
      { alt: "Folio Core dashboard", id: "dashboard", label: "Dashboard", url: "" },
      { alt: "Folio Core case study editor", id: "editor", label: "Editor", url: "" },
      { alt: "Folio Core timeline", id: "timeline", label: "Timeline", url: "" },
      { alt: "Folio Core media library", id: "media", label: "Media", url: "" },
      { alt: "Folio Core notes", id: "notes", label: "Notes", url: "" },
      { alt: "Folio Core publishing screen", id: "publish", label: "Publish", url: "" },
    ],
    stack: ["MongoDB", "REST", "Design System"],
    stackUsage: {
      MongoDB: "Holds case studies, notes and timelines in one flexible schema \u2014 a single source of truth.",
      REST: "Clean endpoints for drafting, publishing and versioning portfolio content.",
      "Design System": "Shared components and tokens so every case study page looks consistent without extra work.",
    },
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
      { alt: "PulseKit event overview", id: "events", label: "Events", url: "" },
      { alt: "PulseKit funnel", id: "funnel", label: "Funnel", url: "" },
      { alt: "PulseKit session path", id: "paths", label: "Paths", url: "" },
      { alt: "PulseKit alert rules", id: "alerts", label: "Alerts", url: "" },
      { alt: "PulseKit segment builder", id: "segments", label: "Segments", url: "" },
      { alt: "PulseKit report export", id: "reports", label: "Reports", url: "" },
    ],
    stack: ["Charts", "Node", "Product Analytics"],
    stackUsage: {
      Charts: "Funnels, session paths and event trends drawn as interactive charts.",
      Node: "Collects events from apps through a lightweight SDK and aggregates them in near real time.",
      "Product Analytics": "Defines the event lenses \u2014 segments, alerts and reports that surface small UX moments.",
    },
    title: "PulseKit",
    usp: "Shows the moments users almost never tell you about.",
  },
];

function createProjectImages(project: ApiProject) {
  const featuredImageUrl = project.featuredImageUrl || project.imageUrl || "";
  const imageUrls = [
    featuredImageUrl,
    ...(project.imageUrls ?? []),
  ]
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (imageUrls.length === 0) {
    return [
      {
        alt: `${project.title} preview`,
        id: `${project._id}-preview`,
        label: "Preview",
        url: "",
      },
    ];
  }

  return imageUrls.map((imageUrl, index) => ({
    alt:
      index === 0
        ? `${project.title} featured image`
        : `${project.title} image ${index + 1}`,
    id: `${project._id}-image-${index + 1}`,
    label: index === 0 ? "Featured" : `Image ${index + 1}`,
    url: imageUrl,
  }));
}

export function mapApiProject(project: ApiProject, index: number): Project {
  const stack = project.techStack ?? [];

  return {
    accent: projectAccents[index % projectAccents.length],
    description: project.description,
    demoUrl: project.liveUrl || "#work",
    githubUrl: project.githubUrl || "#work",
    id: project._id,
    images: createProjectImages(project),
    stack,
    stackUsage: project.stackUsage ?? {},
    title: project.title,
    usp:
      stack.length > 0
        ? `Built with ${stack.slice(0, 3).join(", ")}.`
        : "Project data served from MongoDB.",
  };
}

/** Loads projects from the API, falling back to the example projects. */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(fallbackProjects);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects");

        if (!response.ok) {
          throw new Error(`Projects API returned ${response.status}`);
        }

        const payload = (await response.json()) as { data?: ApiProject[] };
        const fetchedProjects = Array.isArray(payload.data)
          ? payload.data.map(mapApiProject)
          : [];

        if (shouldIgnore || fetchedProjects.length === 0) {
          return;
        }

        setProjects(fetchedProjects);
      } catch (error) {
        if (!shouldIgnore) {
          console.warn(
            "Unable to load projects from API. Using fallback projects.",
            error,
          );
        }
      }
    }

    void loadProjects();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  return projects;
}
