import { apiFetch } from "./api";
import type { Paginated } from "./products";

export type Store = { id: number; name: string };

export function listStores(name?: string) {
  const qs = name ? `?name=${encodeURIComponent(name)}` : "";
  return apiFetch<{ stores: Store[] }>(`/stores${qs}`);
}

export function paginateStores(page: number, limit: number, name?: string) {
  return apiFetch<Paginated<Store, "stores">>("/stores/paginate", {
    method: "POST",
    body: JSON.stringify({ page, limit, name: name || undefined }),
  });
}

export function createStore(name: string) {
  return apiFetch<void>("/stores", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateStore(id: number, name: string) {
  return apiFetch<void>(`/stores/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function deleteStore(id: number) {
  return apiFetch<void>(`/stores/${id}`, { method: "DELETE" });
}
