"use client";

import { Fragment, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { listStores, type Store } from "@/lib/stores";
import { getPhotoUrl, listProducts, type Product } from "@/lib/products";
import {
  createTransaction,
  deleteTransaction,
  paginateTransactions,
  syncTransactions,
  updateTransaction,
  type DeliveryStatus,
  type PaymentStatus,
  type Transaction,
  type TransactionFilters,
} from "@/lib/transactions";
import {
  createTransactionDetail,
  deleteTransactionDetail,
  paginateTransactionDetails,
  updateTransactionDetail,
  type TransactionDetail,
  type Unit,
} from "@/lib/transaction-details";
import { Pagination } from "@/components/Pagination";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  CollapseAllIcon,
  ExpandAllIcon,
  PencilIcon,
  PhotoIcon,
  TrashIcon,
} from "@/components/icons";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ConfirmDialog";
import { Select } from "@/components/Select";
import { DatePicker } from "@/components/DatePicker";
import { HoverImage } from "@/components/HoverImage";

type DetailsState = {
  items: TransactionDetail[];
  page: number;
  totalPage: number;
  totalItem: number;
  limit: number;
  size: number;
  loading: boolean;
  error: string | null;
};

const EMPTY_DETAILS: DetailsState = {
  items: [],
  page: 1,
  totalPage: 1,
  totalItem: 0,
  limit: 10,
  size: 10,
  loading: false,
  error: null,
};

const UNIT_OPTIONS = [
  { value: "PIECES", label: "Pieces" },
  { value: "DOZENS", label: "Dozens" },
];

const STATUS_BADGE: Record<PaymentStatus | DeliveryStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  UNPAID: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-700",
  ON_DELIVERY: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
};

function ProductThumb({ product, className }: { product: Product; className: string }) {
  const url = getPhotoUrl(product.photo);
  return url ? (
    <HoverImage src={url} alt={product.name} className={`${className} object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center bg-muted text-muted-foreground`}>
      <PhotoIcon className="h-1/2 w-1/2" />
    </div>
  );
}

function Badge({ value }: { value: PaymentStatus | DeliveryStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[value]}`}>
      {value.replace("_", " ")}
    </span>
  );
}

function formatPrice(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function sanitizeQuantity(raw: string) {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [limit, setLimit] = useState(10);
  const [size, setSize] = useState(10);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [transactionDate, setTransactionDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailsFor, setDetailsFor] = useState<Transaction | null>(null);
  const [detailsByTx, setDetailsByTx] = useState<Record<string, DetailsState>>({});

  const detailFormDialogRef = useRef<HTMLDialogElement>(null);
  const [editingDetail, setEditingDetail] = useState<TransactionDetail | null>(null);
  const [detailFormKey, setDetailFormKey] = useState(0);
  const [detailProductId, setDetailProductId] = useState("");
  const [detailQuantityDisplay, setDetailQuantityDisplay] = useState("1");
  const [detailUnit, setDetailUnit] = useState<Unit>("PIECES");
  const [detailPricePerPieceDisplay, setDetailPricePerPieceDisplay] = useState("");
  const [detailFormError, setDetailFormError] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);

  function fillPricePerPiece(productId: string) {
    const product = products.find((p) => p.id === productId);
    setDetailPricePerPieceDisplay(product ? product.price.toLocaleString("id-ID") : "");
  }

  function detailPricePerUnit() {
    const pricePerPiece = Number(detailPricePerPieceDisplay.replace(/\./g, "")) || 0;
    return pricePerPiece * (detailUnit === "DOZENS" ? 12 : 1);
  }

  function detailTotalPrice() {
    const quantity = Number(detailQuantityDisplay) || 0;
    return detailPricePerUnit() * quantity;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await paginateTransactions(page, limit, filters);
      if (data) {
        setTransactions(data.transactions);
        setTotalPage(data.total_page);
        setTotalItem(data.total_item);
        setSize(data.size);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  function handleSizeChange(newSize: number) {
    setLimit(newSize);
    setPage(1);
  }

  useEffect(() => {
    listStores()
      .then((data) => data && setStores(data.stores))
      .catch(() => {});
    listProducts()
      .then((data) => data && setProducts(data.products))
      .catch(() => {});
  }, []);

  function updateFilter(key: keyof TransactionFilters, value: string) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncTransactions();
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to sync transactions.");
    } finally {
      setSyncing(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setTransactionDate("");
    setFormKey((k) => k + 1);
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setTransactionDate(transaction.date);
    setFormKey((k) => k + 1);
    setFormError(null);
    dialogRef.current?.showModal();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!transactionDate) {
      setFormError("Date is required.");
      return;
    }
    setFormError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateTransaction(editing.id, {
          store_id: Number(form.get("store_id")),
          payment_status: form.get("payment_status") as PaymentStatus,
          delivery_status: form.get("delivery_status") as DeliveryStatus,
          date: form.get("date") as string,
        });
      } else {
        await createTransaction(Number(form.get("store_id")), form.get("date") as string);
      }
      dialogRef.current?.close();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    const ok = await confirmRef.current?.confirm(
      `Delete transaction for "${transaction.store.name}" on ${transaction.date}?`
    );
    if (!ok) return;
    try {
      await deleteTransaction(transaction.id);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete transaction.");
    }
  }

  async function loadDetails(transactionId: string, targetPage: number, targetLimit?: number) {
    const limit = targetLimit ?? detailsByTx[transactionId]?.limit ?? EMPTY_DETAILS.limit;
    setDetailsByTx((prev) => ({
      ...prev,
      [transactionId]: { ...(prev[transactionId] ?? EMPTY_DETAILS), limit, loading: true, error: null },
    }));
    try {
      const data = await paginateTransactionDetails(transactionId, targetPage, limit);
      if (data) {
        setDetailsByTx((prev) => ({
          ...prev,
          [transactionId]: {
            items: data.transaction_details,
            page: targetPage,
            totalPage: data.total_page,
            totalItem: data.total_item,
            limit,
            size: data.size,
            loading: false,
            error: null,
          },
        }));
      }
    } catch (err) {
      setDetailsByTx((prev) => ({
        ...prev,
        [transactionId]: {
          ...(prev[transactionId] ?? EMPTY_DETAILS),
          loading: false,
          error: err instanceof ApiError ? err.message : "Failed to load transaction details.",
        },
      }));
    }
  }

  function toggleDetails(transaction: Transaction) {
    const isOpen = expandedIds.has(transaction.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isOpen) next.delete(transaction.id);
      else next.add(transaction.id);
      return next;
    });
    if (!isOpen) loadDetails(transaction.id, 1);
  }

  function expandAll() {
    setExpandedIds(new Set(transactions.map((t) => t.id)));
    transactions.forEach((t) => loadDetails(t.id, 1));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function changeDetailsPage(transactionId: string, targetPage: number) {
    loadDetails(transactionId, targetPage);
  }

  function changeDetailsSize(transactionId: string, newSize: number) {
    loadDetails(transactionId, 1, newSize);
  }

  function openAddDetail(transaction: Transaction) {
    setDetailsFor(transaction);
    setEditingDetail(null);
    setDetailProductId("");
    setDetailQuantityDisplay("1");
    setDetailUnit("PIECES");
    setDetailPricePerPieceDisplay("");
    setDetailFormKey((k) => k + 1);
    setDetailFormError(null);
    detailFormDialogRef.current?.showModal();
  }

  function openEditDetail(detail: TransactionDetail, transaction: Transaction) {
    setDetailsFor(transaction);
    setEditingDetail(detail);
    setDetailProductId(detail.product.id);
    setDetailQuantityDisplay(String(detail.quantity));
    setDetailUnit(detail.unit);
    setDetailPricePerPieceDisplay(detail.product.price.toLocaleString("id-ID"));
    setDetailFormKey((k) => k + 1);
    setDetailFormError(null);
    detailFormDialogRef.current?.showModal();
  }

  async function handleDetailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detailsFor) return;
    setDetailFormError(null);
    setDetailSaving(true);
    const form = new FormData(e.currentTarget);
    const data = {
      product_id: form.get("product_id") as string,
      quantity: Number(form.get("quantity")),
      unit: form.get("unit") as Unit,
      price: Number(form.get("price")),
    };
    try {
      if (editingDetail) {
        await updateTransactionDetail(detailsFor.id, editingDetail.id, data);
      } else {
        await createTransactionDetail(detailsFor.id, data);
      }
      detailFormDialogRef.current?.close();
      loadDetails(detailsFor.id, detailsByTx[detailsFor.id]?.page ?? 1);
    } catch (err) {
      setDetailFormError(err instanceof ApiError ? err.message : "Failed to save transaction detail.");
    } finally {
      setDetailSaving(false);
    }
  }

  async function handleDeleteDetail(detail: TransactionDetail, transaction: Transaction) {
    const ok = await confirmRef.current?.confirm(`Remove "${detail.product.name}" from this transaction?`);
    if (!ok) return;
    try {
      await deleteTransactionDetail(transaction.id, detail.id);
      loadDetails(transaction.id, detailsByTx[transaction.id]?.page ?? 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete transaction detail.");
    }
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track orders per store.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-[background-color,transform] active:scale-[0.98] hover:bg-primary/90"
        >
          New transaction
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          aria-label="Sync transactions"
          title="Sync"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors active:scale-[0.98] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        </button>
        <Select
          value={filters.payment_status ?? "ALL"}
          onValueChange={(v) => updateFilter("payment_status", v === "ALL" ? "" : v)}
          className="w-48"
          options={[
            { value: "ALL", label: "All payment status" },
            { value: "UNPAID", label: "Unpaid" },
            { value: "PAID", label: "Paid" },
          ]}
        />
        <Select
          value={filters.delivery_status ?? "ALL"}
          onValueChange={(v) => updateFilter("delivery_status", v === "ALL" ? "" : v)}
          className="w-48"
          options={[
            { value: "ALL", label: "All delivery status" },
            { value: "PENDING", label: "Pending" },
            { value: "ON_DELIVERY", label: "On delivery" },
            { value: "DELIVERED", label: "Delivered" },
          ]}
        />
        <DatePicker
          value={filters.date_from}
          onChange={(v) => updateFilter("date_from", v)}
          placeholder="From date"
          max={filters.date_to}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <DatePicker
          value={filters.date_to}
          onChange={(v) => updateFilter("date_to", v)}
          placeholder="To date"
          min={filters.date_from}
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            aria-label="Expand all"
            title="Expand all"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <ExpandAllIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={collapseAll}
            aria-label="Collapse all"
            title="Collapse all"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <CollapseAllIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Click a row to expand its items.</p>

      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Total Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              transactions.map((tx, i) => {
                const isExpanded = expandedIds.has(tx.id);
                const detailState = detailsByTx[tx.id] ?? EMPTY_DETAILS;
                return (
                <Fragment key={tx.id}>
                <tr
                  onClick={() => toggleDetails(tx)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-in cursor-pointer border-b border-border last:border-0 even:bg-muted/40 hover:bg-muted/60"
                >
                  <td className="px-4 py-3 text-card-foreground">
                    <div className="flex items-center gap-2">
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                      {tx.store.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-card-foreground">{tx.date}</td>
                  <td className="px-4 py-3">
                    <Badge value={tx.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={tx.delivery_status} />
                  </td>
                  <td className="px-4 py-3 text-card-foreground">Rp{tx.total_price.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(tx);
                      }}
                      aria-label={`Edit transaction for ${tx.store.name}`}
                      title="Edit"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                    >
                      <PencilIcon className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tx);
                      }}
                      aria-label={`Delete transaction for ${tx.store.name}`}
                      title="Delete"
                      className="ml-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <TrashIcon className="h-4.5 w-4.5" />
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="animate-in border-b border-border bg-muted/30 last:border-0">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-foreground">Items</p>
                        <button
                          type="button"
                          onClick={() => openAddDetail(tx)}
                          className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-transform active:scale-[0.98] hover:bg-primary/90"
                        >
                          Add item
                        </button>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="px-4 py-3 font-medium">Product</th>
                              <th className="px-4 py-3 font-medium">Price/piece</th>
                              <th className="px-4 py-3 font-medium">Qty</th>
                              <th className="px-4 py-3 font-medium">Unit</th>
                              <th className="px-4 py-3 font-medium">Price/unit</th>
                              <th className="px-4 py-3 font-medium">Total</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {detailState.loading && (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                  Loading...
                                </td>
                              </tr>
                            )}
                            {!detailState.loading && detailState.error && (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                                  {detailState.error}
                                </td>
                              </tr>
                            )}
                            {!detailState.loading && !detailState.error && detailState.items.length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                  No items yet.
                                </td>
                              </tr>
                            )}
                            {!detailState.loading &&
                              !detailState.error &&
                              detailState.items.map((detail, di) => (
                                <tr
                                  key={detail.id}
                                  style={{ animationDelay: `${di * 40}ms` }}
                                  className="animate-in border-b border-border last:border-0 even:bg-muted/40"
                                >
                                  <td className="px-4 py-3 text-card-foreground">
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const product = products.find((p) => p.id === detail.product.id);
                                        return product ? (
                                          <ProductThumb product={product} className="h-8 w-8 shrink-0 rounded-md" />
                                        ) : null;
                                      })()}
                                      {detail.product.name}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-card-foreground">
                                    Rp{detail.product.price.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-4 py-3 text-card-foreground">{detail.quantity}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{detail.unit}</td>
                                  <td className="px-4 py-3 text-card-foreground">
                                    Rp{detail.price_per_unit.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-4 py-3 text-card-foreground">
                                    Rp{detail.total_price.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => openEditDetail(detail, tx)}
                                      aria-label={`Edit ${detail.product.name}`}
                                      title="Edit"
                                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                                    >
                                      <PencilIcon className="h-4.5 w-4.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDetail(detail, tx)}
                                      aria-label={`Delete ${detail.product.name}`}
                                      title="Delete"
                                      className="ml-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10"
                                    >
                                      <TrashIcon className="h-4.5 w-4.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        <div className="px-4">
                          <Pagination
                            page={detailState.page}
                            totalPage={detailState.totalPage}
                            size={detailState.limit}
                            displaySize={detailState.size}
                            totalItem={detailState.totalItem}
                            onChange={(p) => changeDetailsPage(tx.id, p)}
                            onSizeChange={(s) => changeDetailsSize(tx.id, s)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
          </tbody>
        </table>
        <div className="px-4">
          <Pagination
            page={page}
            totalPage={totalPage}
            size={limit}
            displaySize={size}
            totalItem={totalItem}
            onChange={setPage}
            onSizeChange={handleSizeChange}
          />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setEditing(null)}
        className="fixed top-1/2 left-1/2 m-0 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground"
      >
        <form key={formKey} onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold">{editing ? "Edit transaction" : "New transaction"}</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="store_id" className="block text-sm font-medium">
                Store
              </label>
              <Select
                id="store_id"
                name="store_id"
                required
                defaultValue={editing ? String(editing.store.id) : undefined}
                placeholder="Select a store"
                className="mt-1 w-full"
                options={stores.map((store) => ({ value: String(store.id), label: store.name }))}
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                Date
              </label>
              <DatePicker
                id="date"
                value={transactionDate}
                onChange={setTransactionDate}
                placeholder="Select date"
                className="mt-1 w-full"
              />
              <input type="hidden" name="date" value={transactionDate} />
            </div>

            {editing && (
              <>
                <div>
                  <label htmlFor="payment_status" className="block text-sm font-medium">
                    Payment status
                  </label>
                  <Select
                    id="payment_status"
                    name="payment_status"
                    defaultValue={editing.payment_status}
                    className="mt-1 w-full"
                    options={[
                      { value: "UNPAID", label: "Unpaid" },
                      { value: "PAID", label: "Paid" },
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="delivery_status" className="block text-sm font-medium">
                    Delivery status
                  </label>
                  <Select
                    id="delivery_status"
                    name="delivery_status"
                    defaultValue={editing.delivery_status}
                    className="mt-1 w-full"
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "ON_DELIVERY", label: "On delivery" },
                      { value: "DELIVERED", label: "Delivered" },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-transform active:scale-[0.98] hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={detailFormDialogRef}
        onClose={() => setEditingDetail(null)}
        className="fixed top-1/2 left-1/2 m-0 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground"
      >
        <form key={detailFormKey} onSubmit={handleDetailSubmit}>
          <h2 className="text-lg font-semibold">{editingDetail ? "Edit item" : "Add item"}</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="product_id" className="block text-sm font-medium">
                Product
              </label>
              <Select
                id="product_id"
                name="product_id"
                required
                value={detailProductId}
                onValueChange={(v) => {
                  setDetailProductId(v);
                  fillPricePerPiece(v);
                }}
                placeholder="Select a product"
                className="mt-1 w-full"
                options={products.map((product) => ({
                  value: product.id,
                  label: product.name,
                  icon: <ProductThumb product={product} className="h-6 w-6 rounded-md" />,
                }))}
              />
              {detailProductId && (() => {
                const selectedProduct = products.find((p) => p.id === detailProductId);
                return selectedProduct ? (
                  <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                    <ProductThumb product={selectedProduct} className="h-10 w-10 shrink-0 rounded-lg" />
                    <p className="truncate text-sm font-medium text-foreground">{selectedProduct.name}</p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium">
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="text"
                  inputMode="numeric"
                  required
                  value={detailQuantityDisplay}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDetailQuantityDisplay(sanitizeQuantity(e.target.value))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium">
                  Unit
                </label>
                <Select
                  id="unit"
                  name="unit"
                  required
                  value={detailUnit}
                  onValueChange={(v) => setDetailUnit(v as Unit)}
                  className="mt-1 w-full"
                  options={UNIT_OPTIONS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="price_per_piece" className="block text-sm font-medium">
                Price per piece
              </label>
              <input
                id="price_per_piece"
                type="text"
                inputMode="numeric"
                required
                value={detailPricePerPieceDisplay}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDetailPricePerPieceDisplay(formatPrice(e.target.value))
                }
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input type="hidden" name="price" value={detailPricePerPieceDisplay.replace(/\./g, "")} />
            </div>

            <div>
              <label htmlFor="detail_price" className="block text-sm font-medium">
                Price per unit
              </label>
              <input
                id="detail_price"
                type="text"
                disabled
                value={detailPricePerPieceDisplay ? detailPricePerUnit().toLocaleString("id-ID") : ""}
                placeholder="0"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Total: Rp{detailTotalPrice().toLocaleString("id-ID")}</p>
            </div>
          </div>

          {detailFormError && <p className="mt-3 text-sm text-destructive">{detailFormError}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => detailFormDialogRef.current?.close()}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={detailSaving}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-transform active:scale-[0.98] hover:bg-primary/90 disabled:opacity-60"
            >
              {detailSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </dialog>

      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
