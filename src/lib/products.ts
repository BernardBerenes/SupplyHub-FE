import { apiFetch } from "./api";

export type Product = {
  id: string;
  name: string;
  price: number;
  photo: string | null;
};

const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_URL?.replace(/\/$/, "");

export function getPhotoUrl(photo: string | null): string | undefined {
  return photo && ASSET_BASE ? `${ASSET_BASE}/${photo}` : undefined;
}

export type Paginated<T, K extends string> = {
  page: number;
  size: number;
  total_item: number;
  total_page: number;
} & Record<K, T[]>;

export function listProducts(name?: string) {
  const qs = name ? `?name=${encodeURIComponent(name)}` : "";
  return apiFetch<{ products: Product[] }>(`/products${qs}`);
}

export function paginateProducts(page: number, limit: number, name?: string) {
  return apiFetch<Paginated<Product, "products">>("/products/paginate", {
    method: "POST",
    body: JSON.stringify({ page, limit, name: name || undefined }),
  });
}

export function createProduct(form: FormData) {
  return apiFetch<void>("/products", { method: "POST", body: form });
}

export function updateProduct(id: string, form: FormData) {
  return apiFetch<void>(`/products/${id}`, { method: "PATCH", body: form });
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}
