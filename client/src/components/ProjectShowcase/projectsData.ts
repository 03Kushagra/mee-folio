import { useEffect, useState } from "react";

/*
 * Project data shared by the projects section: the shape the UI uses and the hook that
 * loads projects from the server (GET /api/projects). Add and edit projects at /admin.
 */

export type Project = {
  accent: string;
  description: string;
  demoUrl: string;
  githubUrl: string;
  id: string;
  /** Company work: links are shown disabled with a "company policy" note. */
  isPrivate: boolean;
  /** On a private project: which links are locked. */
  lockDemo: boolean;
  lockGithub: boolean;
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
  isPrivate?: boolean;
  lockDemo?: boolean;
  lockGithub?: boolean;
  liveUrl?: string;
  techStack?: string[];
  stackUsage?: Record<string, string>;
  title: string;
  usp?: string;
};

export const projectAccents = ["#346bf1", "#8d55e8", "#1fa58a", "#f17835", "#d8a20d", "#ff4d7d"];

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
    isPrivate: Boolean(project.isPrivate),
    lockDemo: project.lockDemo !== false,
    lockGithub: project.lockGithub !== false,
    stack,
    stackUsage: project.stackUsage ?? {},
    title: project.title,
    usp:
      project.usp?.trim() ||
      (stack.length > 0 ? `Built with ${stack.slice(0, 3).join(", ")}.` : ""),
  };
}

/** Loads projects from the API, falling back to the example projects. */
export type ProjectsStatus = "loading" | "ready" | "error";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<ProjectsStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { signal: controller.signal });
        if (!response.ok) throw new Error(`Projects API returned ${response.status}`);
        const payload = (await response.json()) as { data?: ApiProject[] };
        setProjects(Array.isArray(payload.data) ? payload.data.map(mapApiProject) : []);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Unable to load projects from the API.", error);
        setStatus("error");
      }
    }

    void loadProjects();
    return () => controller.abort();
  }, []);

  return { projects, status };
}
