const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getToken(): string | null {
  return window.localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem("token", token);
  else window.localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = body?.error || {};
    // An expired/invalid session should send the user back to login
    // rather than showing a raw error on a protected page.
    if (res.status === 401) {
      setToken(null);
      window.location.href = "/login";
    }
    throw new ApiError(err.code || "UNKNOWN", err.message || "Something went wrong", res.status);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
};
