import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Checkbox, Row, Text, TextList } from "./fields";

/* Projects tab: list, add, edit, delete and reorder projects (the `projects` collection). */

type ProjectDoc = {
  _id?: string;
  description: string;
  featured: boolean;
  featuredImageUrl: string;
  githubUrl: string;
  imageUrls: string[];
  isPrivate: boolean;
  liveUrl: string;
  lockDemo: boolean;
  lockGithub: boolean;
  order: number;
  stackUsage: Record<string, string>;
  techStack: string[];
  title: string;
  usp: string;
};

const blank = (order: number): ProjectDoc => ({
  description: "",
  featured: false,
  featuredImageUrl: "",
  githubUrl: "",
  imageUrls: [],
  isPrivate: false,
  liveUrl: "",
  lockDemo: true,
  lockGithub: true,
  order,
  stackUsage: {},
  techStack: [],
  title: "",
  usp: "",
});

/** Keeps only the fields the server stores (drops _id, timestamps, __v). */
function toBody(project: ProjectDoc & Record<string, unknown>) {
  const { description, featured, featuredImageUrl, githubUrl, imageUrls, isPrivate, liveUrl, lockDemo, lockGithub, order, stackUsage, techStack, title, usp } = project;
  // Drop notes for technologies that were removed from the stack.
  const usage = Object.fromEntries(techStack.filter((tech) => stackUsage[tech]?.trim()).map((tech) => [tech, stackUsage[tech].trim()]));
  return { description, featured, featuredImageUrl, githubUrl, imageUrls, isPrivate, liveUrl, lockDemo, lockGithub, order, stackUsage: usage, techStack, title, usp };
}

function fromApi(raw: Partial<ProjectDoc> & { imageUrl?: string }): ProjectDoc {
  return {
    ...blank(0),
    ...raw,
    featuredImageUrl: raw.featuredImageUrl || raw.imageUrl || "",
    imageUrls: raw.imageUrls ?? [],
    isPrivate: Boolean(raw.isPrivate),
    lockDemo: raw.lockDemo !== false,
    lockGithub: raw.lockGithub !== false,
    stackUsage: raw.stackUsage ?? {},
    techStack: raw.techStack ?? [],
  } as ProjectDoc;
}

export function ProjectsAdmin({ notify }: { notify: (message: string, kind?: "ok" | "error") => void }) {
  const [projects, setProjects] = useState<ProjectDoc[] | null>(null);
  const [editing, setEditing] = useState<ProjectDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ data: ProjectDoc[] }>("/api/projects");
      setProjects(data.map(fromApi));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (project: ProjectDoc) => {
    if (!project.title.trim() || !project.description.trim()) {
      notify("Title and description are required.", "error");
      return;
    }
    setBusy(true);
    try {
      const body = toBody(project);
      if (project._id) await api(`/api/projects/${project._id}`, { body, method: "PUT" });
      else await api("/api/projects", { body, method: "POST" });
      notify("Project saved");
      setEditing(null);
      await load();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (project: ProjectDoc) => {
    if (!project._id || !window.confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    try {
      await api(`/api/projects/${project._id}`, { method: "DELETE" });
      notify("Project deleted");
      await load();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  /** Moves a project and renumbers everyone 1, 2, 3… saving only the ones that changed. */
  const move = async (from: number, to: number) => {
    if (!projects || to < 0 || to >= projects.length) return;
    const next = [...projects];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const renumbered = next.map((project, index) => ({ ...project, order: index + 1 }));
    setProjects(renumbered);
    try {
      await Promise.all(
        renumbered
          .filter((project) => project.order !== projects.find((old) => old._id === project._id)?.order)
          .map((project) => api(`/api/projects/${project._id}`, { body: toBody(project), method: "PUT" })),
      );
    } catch (error) {
      notify((error as Error).message, "error");
      await load();
    }
  };

  if (editing) {
    return <ProjectForm busy={busy} initial={editing} onCancel={() => setEditing(null)} onSave={save} />;
  }

  return (
    <section className="adm-group adm-group--wide">
      <div className="adm-group__head">
        <h2>Projects</h2>
        <button
          className="adm-primary"
          onClick={() => setEditing(blank(Math.max(0, ...(projects ?? []).map((project) => project.order)) + 1))}
          type="button"
        >
          + New project
        </button>
      </div>
      <p className="adm-hint">Shown on the site in this order. Changes here save straight away. Tip: Alt+↑/↓ on a row moves it.</p>

      {projects === null ? (
        <p className="adm-hint">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="adm-empty">No projects yet.</p>
      ) : (
        <ol className="adm-projects">
          {projects.map((project, index) => (
            <li
              key={project._id}
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                event.preventDefault();
                void move(index, event.key === "ArrowUp" ? index - 1 : index + 1);
              }}
            >
              {project.featuredImageUrl ? <img alt="" src={project.featuredImageUrl} /> : <span className="adm-projects__noimg" />}
              <div>
                <strong>
                  {project.title}
                  {project.isPrivate && <span className="adm-badge">Private</span>}
                </strong>
                <span>{project.techStack.join(" · ") || "No stack yet"}</span>
              </div>
              <div className="adm-card__tools">
                <button aria-disabled={index === 0} aria-label={`Move ${project.title} up`} onClick={() => void move(index, index - 1)} type="button">
                  ↑
                </button>
                <button
                  aria-disabled={index === projects.length - 1}
                  aria-label={`Move ${project.title} down`}
                  onClick={() => void move(index, index + 1)}
                  type="button"
                >
                  ↓
                </button>
                <button aria-label={`Edit ${project.title}`} onClick={() => setEditing(project)} type="button">
                  Edit
                </button>
                <button aria-label={`Delete ${project.title}`} className="adm-danger" onClick={() => void remove(project)} type="button">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ProjectForm({
  busy,
  initial,
  onCancel,
  onSave,
}: {
  busy: boolean;
  initial: ProjectDoc;
  onCancel: () => void;
  onSave: (project: ProjectDoc) => void;
}) {
  const [project, setProject] = useState(initial);
  const set = (patch: Partial<ProjectDoc>) => setProject((current) => ({ ...current, ...patch }));
  const images = [project.featuredImageUrl, ...project.imageUrls].filter(Boolean);
  const changed = JSON.stringify(project) !== JSON.stringify(initial);

  const leave = () => {
    if (!changed || window.confirm("Discard your changes to this project?")) onCancel();
  };

  // Esc leaves the form; Ctrl/Cmd + S saves it.
  const latest = useRef({ leave, project, onSave });
  latest.current = { leave, project, onSave };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") latest.current.leave();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        latest.current.onSave(latest.current.project);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="adm-group adm-group--wide">
      <div className="adm-group__head">
        <h2>{initial._id ? `Edit project: ${initial.title}` : "New project"}</h2>
        <button onClick={leave} type="button">
          ← Back to list
        </button>
      </div>

      <div className="adm-split">
        <div className="adm-col">
          <h3>Details</h3>
          <Text autoFocus label="Title" onChange={(title) => set({ title })} value={project.title} />
          <Text label="Description" multiline onChange={(description) => set({ description })} rows={5} value={project.description} />
          <Text
            hint="One line on what makes it stand out. Leave empty to show “Built with …”."
            label="USP"
            multiline
            onChange={(usp) => set({ usp })}
            rows={2}
            value={project.usp}
          />

          <h3>Links</h3>
          <Checkbox
            checked={project.isPrivate}
            label="Private (company / client project)"
            onChange={(isPrivate) => set({ isPrivate })}
          />
          {project.isPrivate ? (
            <fieldset className="adm-locks">
              <legend>Lock these links</legend>
              <Checkbox checked={project.lockGithub} label="Lock GitHub" onChange={(lockGithub) => set({ lockGithub })} />
              <Checkbox checked={project.lockDemo} label="Lock Live demo" onChange={(lockDemo) => set({ lockDemo })} />
              <p className="adm-hint">
                Locked links show greyed out with “Not allowed as per company policy”. Unlocked ones work as normal.
              </p>
            </fieldset>
          ) : (
            <p className="adm-hint">Visitors can open both links.</p>
          )}
          <Row>
            <Text label="GitHub link" onChange={(githubUrl) => set({ githubUrl })} type="url" value={project.githubUrl} />
            <Text label="Live demo link" onChange={(liveUrl) => set({ liveUrl })} type="url" value={project.liveUrl} />
          </Row>
          <Checkbox checked={project.featured} label="Featured" onChange={(featured) => set({ featured })} />
        </div>

        <div className="adm-col">
          <h3>Tech stack</h3>
          <TextList commas label="Technologies" onChange={(techStack) => set({ techStack })} placeholder="React, Node, MongoDB" value={project.techStack} />
          {project.techStack.map((tech) => (
            <Text
              key={tech}
              label={`How ${tech} was used`}
              multiline
              onChange={(value) => set({ stackUsage: { ...project.stackUsage, [tech]: value } })}
              rows={2}
              value={project.stackUsage[tech] ?? ""}
            />
          ))}

          <h3>Screenshots</h3>
          <Text
            hint={<>Put files in <code>client/public/images/</code> and enter <code>/images/name.png</code>, or paste any image link. Empty = a mock screen is shown.</>}
            label="Main image"
            onChange={(featuredImageUrl) => set({ featuredImageUrl })}
            value={project.featuredImageUrl}
          />
          <TextList hint="One link per line, up to 5." label="More images" onChange={(imageUrls) => set({ imageUrls: imageUrls.slice(0, 5) })} value={project.imageUrls} />
          {images.length > 0 && (
            <div className="adm-thumbs">
              {images.map((url, index) => (
                <img alt={`Screenshot ${index + 1}`} key={`${url}-${index}`} src={url} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-actions">
        <button onClick={leave} type="button">
          Cancel
        </button>
        <button className="adm-primary" disabled={busy} onClick={() => onSave(project)} type="button">
          {busy ? "Saving…" : "Save project"}
        </button>
      </div>
    </section>
  );
}
