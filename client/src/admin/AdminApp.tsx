import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { emptyProfile, normalizeProfile, type Profile } from "../content/types";
import { api, ApiError, clearToken, readToken, saveToken, setUnauthorizedHandler } from "./api";
import { Text } from "./fields";
import { LeadsAdmin } from "./LeadsAdmin";
import { AboutForm, AiWorkForm, EducationForm, ExperienceForm, HeroForm } from "./ProfileForms";
import { ProjectsAdmin } from "./ProjectsAdmin";
import "./admin.css";

/*
 * /admin: log in with ADMIN_PASSWORD (server/.env), then edit everything the site shows.
 * Profile tabs share one draft that is saved with the Save button (PUT /api/profile).
 * Projects save one by one (/api/projects). Leads are read-only.
 */

const TABS = [
  { id: "about", label: "About & contact" },
  { id: "hero", label: "Hero roles" },
  { id: "ai", label: "AI work" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "leads", label: "Leads" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const PROFILE_TABS: TabId[] = ["about", "hero", "ai", "experience", "education"];

type Toast = { id: number; kind: "ok" | "error"; message: string };

export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Admin · Mee-folio";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    setUnauthorizedHandler(() => {
      clearToken();
      setLoggedIn(false);
    });

    const token = readToken();
    if (!token) {
      setLoggedIn(false);
      return;
    }
    api<{ loggedIn: boolean }>("/api/auth/session")
      .then(({ loggedIn: ok }) => {
        if (!ok) clearToken();
        setLoggedIn(ok);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) return <div className="adm-center">Loading…</div>;
  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />;
  return (
    <Dashboard
      onLogout={() => {
        clearToken();
        setLoggedIn(false);
      }}
    />
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ expiresAt: number; token: string }>("/api/auth/login", {
        body: { password },
        method: "POST",
        token: null,
      });
      saveToken({ expiresAt: result.expiresAt, token: result.token });
      onDone();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={submit}>
        <p className="adm-brand">
          <span className="adm-brand__mark" /> Mee-folio admin
        </p>
        <Text autoFocus label="Password" onChange={setPassword} type="password" value={password} />
        {error && <p className="adm-error">{error}</p>}
        <button className="adm-primary" disabled={busy || !password} type="submit">
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

function checkProfile(profile: Profile) {
  if (!profile.name.trim()) return "Add your name (About & contact).";
  const missingEnd = profile.experience.findIndex((role) => role.end === "");
  if (missingEnd >= 0) return `Experience ${missingEnd + 1}: add an end month or tick “I currently work here”.`;
  const missingStart = profile.experience.findIndex((role) => !role.start);
  if (missingStart >= 0) return `Experience ${missingStart + 1}: add a start month.`;
  return "";
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<TabId>(() => {
    const fromHash = window.location.hash.slice(1) as TabId;
    return TABS.some((item) => item.id === fromHash) ? fromHash : "about";
  });
  const [saved, setSaved] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [version, setVersion] = useState(0); // remounts forms after load/discard
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((message: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), kind === "error" ? 6000 : 2600);
  }, []);

  useEffect(() => {
    api<{ data: Partial<Profile> }>("/api/profile", { token: null })
      .then(({ data }) => {
        const profile = normalizeProfile(data);
        setSaved(profile);
        setDraft(profile);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          setIsNew(true);
          setSaved(emptyProfile);
          setDraft(emptyProfile);
        } else {
          notify((error as Error).message, "error");
        }
      });
  }, [notify]);

  const dirty = draft !== null && saved !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const choose = (id: TabId, focus = false) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) document.getElementById(`adm-tab-${id}`)?.focus();
  };

  // Tabs: arrow keys move between them (focus follows selection), Home / End jump to the ends.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    choose(TABS[next].id, true);
  };

  const update = (patch: Partial<Profile>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!draft) return;
    const problem = checkProfile(draft);
    if (problem) {
      notify(problem, "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api<{ data: Partial<Profile> }>("/api/profile", { body: draft, method: "PUT" });
      const profile = normalizeProfile(data);
      setSaved(profile);
      setDraft(profile);
      setVersion((value) => value + 1);
      setIsNew(false);
      notify("Saved. Refresh the site to see it.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(saved);
    setVersion((value) => value + 1);
  };

  const isProfileTab = PROFILE_TABS.includes(tab);

  // Ctrl/Cmd + S saves the profile from anywhere on a profile tab.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isProfileTab && dirty && !saving) void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, isProfileTab, saving]);

  return (
    <div className="adm">
      <a className="adm-skip" href="#adm-panel">
        Skip to content
      </a>
      <header className="adm-top">
        <p className="adm-brand">
          <span className="adm-brand__mark" /> Mee-folio admin
        </p>
        <div className="adm-top__links">
          <a href="/" rel="noreferrer" target="_blank">
            View site ↗
          </a>
          <button onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      <nav aria-label="Admin sections" className="adm-nav">
        <div aria-orientation="vertical" className="adm-nav__tabs" role="tablist">
          {TABS.map((item) => (
            <button
              aria-controls="adm-panel"
              aria-selected={tab === item.id}
              id={`adm-tab-${item.id}`}
              key={item.id}
              onClick={() => choose(item.id)}
              onKeyDown={onTabKeyDown}
              role="tab"
              tabIndex={tab === item.id ? 0 : -1}
              type="button"
            >
              {item.label}
              {dirty && PROFILE_TABS.includes(item.id) && (
                <>
                  <span aria-hidden="true" className="adm-nav__dot" />
                  <span className="adm-sr-only">(unsaved changes)</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main aria-labelledby={`adm-tab-${tab}`} className="adm-main" id="adm-panel" role="tabpanel" tabIndex={-1}>
        {isProfileTab && isNew && (
          <p className="adm-note">
            There's no content in the database yet. Fill in the tabs and press Save, or run{" "}
            <code>npm run seed:profile --workspace server</code> to start from the example content.
          </p>
        )}

        {isProfileTab && !draft && <p className="adm-hint">Loading…</p>}
        {isProfileTab && draft && (
          <div className="adm-panel" key={version}>
            {tab === "about" && <AboutForm profile={draft} update={update} />}
            {tab === "hero" && <HeroForm profile={draft} update={update} />}
            {tab === "ai" && <AiWorkForm profile={draft} update={update} />}
            {tab === "experience" && <ExperienceForm profile={draft} update={update} />}
            {tab === "education" && <EducationForm profile={draft} update={update} />}
          </div>
        )}
        {tab === "projects" && <ProjectsAdmin notify={notify} />}
        {tab === "leads" && <LeadsAdmin notify={notify} />}
      </main>

      {isProfileTab && draft && (
        <div className={dirty ? "adm-savebar adm-savebar--dirty" : "adm-savebar"}>
          <span>{dirty ? "You have unsaved changes" : "All changes saved"}</span>
          <button disabled={!dirty || saving} onClick={discard} type="button">
            Discard
          </button>
          <button className="adm-primary" disabled={!dirty || saving} onClick={() => void save()} type="button">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      <div aria-live="polite" className="adm-toasts">
        {toasts.map((toast) => (
          <p className={`adm-toast adm-toast--${toast.kind}`} key={toast.id}>
            {toast.message}
          </p>
        ))}
      </div>
    </div>
  );
}
