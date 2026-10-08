import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { normalizeProfile, type Profile } from "./types";

/*
 * Loads the site content from the server (GET /api/profile) once and shares it with every
 * section through React context. Nothing personal is stored in the code: change it at /admin.
 */

const ProfileContext = createContext<Profile | null>(null);

export function useProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile must be used inside <ProfileProvider>");
  return profile;
}

type State = { status: "loading" } | { status: "ready"; profile: Profile } | { status: "error"; message: string };

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/profile", { signal });
      if (response.status === 404) {
        setState({ message: "There's no content yet. Add it from the admin page (/admin).", status: "error" });
        return;
      }
      if (!response.ok) throw new Error(`Profile API returned ${response.status}`);
      const payload = (await response.json()) as { data?: Partial<Profile> };
      setState({ profile: normalizeProfile(payload.data), status: "ready" });
    } catch (error) {
      if (signal?.aborted) return;
      console.warn("Unable to load profile", error);
      setState({ message: "The site couldn't load its content. Please try again in a moment.", status: "error" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading" className="site-status">
        <span className="site-status__spinner" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="site-status" role="alert">
        <p>{state.message}</p>
        <button className="site-status__retry" onClick={() => void load()} type="button">
          Try again
        </button>
      </div>
    );
  }

  return <ProfileContext.Provider value={state.profile}>{children}</ProfileContext.Provider>;
}
