import { clearToken, getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type ApiResponse<T> = { message: string; data?: T };

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(status: number, message: string, errors?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T | undefined> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await res.json().catch(() => ({}))) as ApiResponse<T> & {
    errors?: { field: string; message: string }[];
  };

  if (!res.ok) {
    if (res.status === 401 && path !== "/login" && typeof window !== "undefined") {
      clearToken();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- plain lib function, no router access
      window.location.href = "/login";
    }
    throw new ApiError(res.status, body.message ?? "Request failed", body.errors);
  }

  return body.data;
}
