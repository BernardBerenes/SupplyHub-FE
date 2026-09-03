import { apiFetch } from "./api";
import type { Paginated } from "./products";

export type PaymentStatus = "PAID" | "UNPAID";
export type DeliveryStatus = "PENDING" | "ON_DELIVERY" | "DELIVERED";

export type Transaction = {
  id: string;
  store: { id: number; name: string };
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  date: string;
};

export type TransactionFilters = {
  payment_status?: PaymentStatus;
  delivery_status?: DeliveryStatus;
  date_from?: string;
  date_to?: string;
};

export function paginateTransactions(page: number, limit: number, filters: TransactionFilters = {}) {
  return apiFetch<Paginated<Transaction, "transactions">>("/transactions/paginate", {
    method: "POST",
    body: JSON.stringify({ page, limit, ...filters }),
  });
}

export function createTransaction(storeId: number, date: string) {
  return apiFetch<void>("/transactions", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, date }),
  });
}

export function updateTransaction(
  id: string,
  data: Partial<{ store_id: number; payment_status: PaymentStatus; delivery_status: DeliveryStatus; date: string }>
) {
  return apiFetch<void>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteTransaction(id: string) {
  return apiFetch<void>(`/transactions/${id}`, { method: "DELETE" });
}

export function syncTransactions() {
  return apiFetch<void>("/transactions/sync", { method: "POST" });
}
