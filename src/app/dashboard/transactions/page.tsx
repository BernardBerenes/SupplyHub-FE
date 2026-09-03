"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { listStores, type Store } from "@/lib/stores";
import { listProducts, type Product } from "@/lib/products";
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
import { ArrowPathIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ConfirmDialog";
import { Select } from "@/components/Select";

const LIMIT = 10;
const DETAIL_LIMIT = 10;

const UNIT_OPTIONS = [
  { value: "PIECES", label: "Pieces" },
  { value: "DOZENS", label: "Dozens" },
  { value: "BOX", label: "Box" },
  { value: "CARTON", label: "Carton" },
];

const STATUS_BADGE: Record<PaymentStatus | DeliveryStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  UNPAID: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-700",
  ON_DELIVERY: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
};

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  const detailsDialogRef = useRef<HTMLDialogElement>(null);
  const [detailsFor, setDetailsFor] = useState<Transaction | null>(null);
  const [details, setDetails] = useState<TransactionDetail[]>([]);
  const [detailsPage, setDetailsPage] = useState(1);
  const [detailsTotalPage, setDetailsTotalPage] = useState(1);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const detailFormDialogRef = useRef<HTMLDialogElement>(null);
  const [editingDetail, setEditingDetail] = useState<TransactionDetail | null>(null);
  const [detailFormKey, setDetailFormKey] = useState(0);
  const [detailProductId, setDetailProductId] = useState("");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailUnit, setDetailUnit] = useState<Unit>("PIECES");
  const [detailPriceDisplay, setDetailPriceDisplay] = useState("");
  const [detailFormError, setDetailFormError] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);

  const detailPriceIsCalculated = detailUnit === "PIECES" || detailUnit === "DOZENS";

  function recalcDetailPrice(productId: string, quantity: number, unit: Unit) {
    if (unit === "BOX" || unit === "CARTON") return;
    const product = products.find((p) => p.id === productId);
    if (!product || !quantity) {
      setDetailPriceDisplay("");
      return;
    }
    const multiplier = unit === "DOZENS" ? 12 : 1;
    setDetailPriceDisplay((product.price * quantity * multiplier).toLocaleString("id-ID"));
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await paginateTransactions(page, LIMIT, filters);
      if (data) {
        setTransactions(data.transactions);
        setTotalPage(data.total_page);
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
  }, [page, filters]);

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
    setFormKey((k) => k + 1);
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setFormKey((k) => k + 1);
    setFormError(null);
    dialogRef.current?.showModal();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

  async function loadDetails(transactionId: string, targetPage: number) {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const data = await paginateTransactionDetails(transactionId, targetPage, DETAIL_LIMIT);
      if (data) {
        setDetails(data.transaction_details);
        setDetailsTotalPage(data.total_page);
      }
    } catch (err) {
      setDetailsError(err instanceof ApiError ? err.message : "Failed to load transaction details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function openDetails(transaction: Transaction) {
    setDetailsFor(transaction);
    setDetailsPage(1);
    loadDetails(transaction.id, 1);
    detailsDialogRef.current?.showModal();
  }

  function changeDetailsPage(targetPage: number) {
    setDetailsPage(targetPage);
    if (detailsFor) loadDetails(detailsFor.id, targetPage);
  }

  function openAddDetail() {
    setEditingDetail(null);
    setDetailProductId("");
    setDetailQuantity(1);
    setDetailUnit("PIECES");
    setDetailPriceDisplay("");
    setDetailFormKey((k) => k + 1);
    setDetailFormError(null);
    detailFormDialogRef.current?.showModal();
  }

  function openEditDetail(detail: TransactionDetail) {
    setEditingDetail(detail);
    setDetailProductId(detail.product.id);
    setDetailQuantity(detail.quantity);
    setDetailUnit(detail.unit);
    setDetailPriceDisplay(detail.price.toLocaleString("id-ID"));
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
      loadDetails(detailsFor.id, detailsPage);
    } catch (err) {
      setDetailFormError(err instanceof ApiError ? err.message : "Failed to save transaction detail.");
    } finally {
      setDetailSaving(false);
    }
  }

  async function handleDeleteDetail(detail: TransactionDetail) {
    if (!detailsFor) return;
    const ok = await confirmRef.current?.confirm(`Remove "${detail.product.name}" from this transaction?`);
    if (!ok) return;
    try {
      await deleteTransactionDetail(detailsFor.id, detail.id);
      loadDetails(detailsFor.id, detailsPage);
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
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors active:scale-[0.98] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
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
        <input
          type="date"
          value={filters.date_from ?? ""}
          onChange={(e) => updateFilter("date_from", e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          value={filters.date_to ?? ""}
          onChange={(e) => updateFilter("date_to", e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Click a row to view its items.</p>

      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              transactions.map((tx, i) => (
                <tr
                  key={tx.id}
                  onClick={() => openDetails(tx)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-in cursor-pointer border-b border-border last:border-0 even:bg-muted/40 hover:bg-muted/60"
                >
                  <td className="px-4 py-3 text-card-foreground">{tx.store.name}</td>
                  <td className="px-4 py-3 text-card-foreground">{tx.date}</td>
                  <td className="px-4 py-3">
                    <Badge value={tx.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={tx.delivery_status} />
                  </td>
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
              ))}
          </tbody>
        </table>
        <div className="px-4">
          <Pagination page={page} totalPage={totalPage} onChange={setPage} />
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
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={editing?.date}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
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
        ref={detailsDialogRef}
        onClose={() => setDetailsFor(null)}
        className="fixed top-1/2 left-1/2 m-0 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{detailsFor?.store.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{detailsFor?.date}</p>
          </div>
          <button
            type="button"
            onClick={openAddDetail}
            className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-transform active:scale-[0.98] hover:bg-primary/90"
          >
            Add item
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {detailsLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
              {!detailsLoading && detailsError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                    {detailsError}
                  </td>
                </tr>
              )}
              {!detailsLoading && !detailsError && details.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No items yet.
                  </td>
                </tr>
              )}
              {!detailsLoading &&
                !detailsError &&
                details.map((detail, i) => (
                  <tr
                    key={detail.id}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="animate-in border-b border-border last:border-0 even:bg-muted/40"
                  >
                    <td className="px-4 py-3 text-card-foreground">{detail.product.name}</td>
                    <td className="px-4 py-3 text-card-foreground">{detail.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{detail.unit}</td>
                    <td className="px-4 py-3 text-card-foreground">Rp{detail.price.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditDetail(detail)}
                        aria-label={`Edit ${detail.product.name}`}
                        title="Edit"
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                      >
                        <PencilIcon className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDetail(detail)}
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
            <Pagination page={detailsPage} totalPage={detailsTotalPage} onChange={changeDetailsPage} />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => detailsDialogRef.current?.close()}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
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
                  recalcDetailPrice(v, detailQuantity, detailUnit);
                }}
                placeholder="Select a product"
                className="mt-1 w-full"
                options={products.map((product) => ({ value: product.id, label: product.name }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium">
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  required
                  value={detailQuantity}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const q = e.target.valueAsNumber;
                    const quantity = Number.isNaN(q) ? 0 : q;
                    setDetailQuantity(quantity);
                    recalcDetailPrice(detailProductId, quantity, detailUnit);
                  }}
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
                  onValueChange={(v) => {
                    const unit = v as Unit;
                    setDetailUnit(unit);
                    if (unit === "BOX" || unit === "CARTON") {
                      setDetailPriceDisplay("");
                    } else {
                      recalcDetailPrice(detailProductId, detailQuantity, unit);
                    }
                  }}
                  className="mt-1 w-full"
                  options={UNIT_OPTIONS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="detail_price" className="block text-sm font-medium">
                Price {detailPriceIsCalculated && <span className="text-muted-foreground">(auto-filled, editable)</span>}
              </label>
              <input
                id="detail_price"
                type="text"
                inputMode="numeric"
                required
                value={detailPriceDisplay}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDetailPriceDisplay(formatPrice(e.target.value))}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input type="hidden" name="price" value={detailPriceDisplay.replace(/\./g, "")} />
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
