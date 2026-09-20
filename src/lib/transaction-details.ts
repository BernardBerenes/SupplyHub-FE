import { apiFetch } from "./api";
import type { Paginated } from "./products";

export type Unit = "PIECES" | "DOZENS";

export type TransactionDetail = {
  id: string;
  transaction_id: string;
  product: { id: string; name: string; price: number };
  quantity: number;
  unit: Unit;
  price_per_unit: number;
  total_price: number;
};

export function paginateTransactionDetails(transactionId: string, page: number, limit: number) {
  return apiFetch<Paginated<TransactionDetail, "transaction_details">>(
    `/transactions/${transactionId}/details/paginate`,
    { method: "POST", body: JSON.stringify({ page, limit }) }
  );
}

export function createTransactionDetail(
  transactionId: string,
  data: { product_id: string; quantity: number; unit: Unit; price: number }
) {
  return apiFetch<void>(`/transactions/${transactionId}/details`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTransactionDetail(
  transactionId: string,
  id: string,
  data: Partial<{ product_id: string; quantity: number; unit: Unit; price: number }>
) {
  return apiFetch<void>(`/transactions/${transactionId}/details/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTransactionDetail(transactionId: string, id: string) {
  return apiFetch<void>(`/transactions/${transactionId}/details/${id}`, { method: "DELETE" });
}
