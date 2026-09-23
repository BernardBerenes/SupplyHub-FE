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
  total_price: number;
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

export type RevenuePeriod = "1d" | "1m" | "3m" | "6m" | "1y" | "all";
export type RevenueGroupBy = "day" | "week" | "month";

export type RevenueFilters = {
  period?: RevenuePeriod;
  date_from?: string;
  date_to?: string;
  group_by?: RevenueGroupBy;
};

export type RevenuePoint = { period: string; revenue: number };

export type StoreRevenue = { store_id: number; store_name: string; revenue: number };

export type RevenueResponse = {
  period: string;
  group_by: RevenueGroupBy | "total";
  date_from: string;
  date_to: string;
  total_revenue: number;
  points: RevenuePoint[];
  transaction_count: number;
  paid_count: number;
  unpaid_count: number;
  pending_deliveries: number;
  on_delivery: number;
  delivered_count: number;
  stores: StoreRevenue[];
};

export function getRevenue(filters: RevenueFilters = {}) {
  return apiFetch<RevenueResponse>("/transactions/revenue", {
    method: "POST",
    body: JSON.stringify(filters),
  });
}
