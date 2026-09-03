import { apiFetch } from "./api";

const TOKEN_KEY = "supplyhub_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(username: string, password: string) {
  const data = await apiFetch<{ access_token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (data) setToken(data.access_token);
}
