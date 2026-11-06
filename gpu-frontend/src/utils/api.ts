import { buildPath } from "./buildPath";
import { clearSession, getSession } from "./session";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: ApiUser;
}

export interface RegisterResponse {
  message: string;
}

export async function apiFetch<T>(
  route: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const session = getSession();

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers["Authorization"] = `Bearer ${session.token}`;

  const response = await fetch(buildPath(route), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (response.status === 401 && session) {
    clearSession();
    window.location.href = "/";
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? undefined : data?.error ?? `Request failed (${response.status})`,
  };
}
