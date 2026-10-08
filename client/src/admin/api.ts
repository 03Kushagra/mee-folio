/** Small fetch helper for the admin page: adds the login token and turns errors into messages. */

const TOKEN_KEY = "mee-folio:admin-token";

type Saved = { expiresAt: number; token: string };

export function readToken(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") as Saved | null;
    return saved && saved.expiresAt > Date.now() ? saved.token : null;
  } catch {
    return null;
  }
}

export function saveToken(saved: Saved) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(saved));
  } catch {
    /* private mode: stays logged in for this tab only */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: { body?: unknown; method?: string; token?: string | null } = {}) {
  const token = options.token === undefined ? readToken() : options.token;
  let response: Response;
  try {
    response = await fetch(path, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method: options.method ?? "GET",
    });
  } catch {
    throw new ApiError("Can't reach the server. Is it running (npm run dev)?", 0);
  }

  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(payload.message ?? `Request failed (${response.status})`, response.status);
  }
  return payload;
}
