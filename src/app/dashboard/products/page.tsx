"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { createProduct, deleteProduct, getPhotoUrl, paginateProducts, updateProduct, type Product } from "@/lib/products";
import { Pagination } from "@/components/Pagination";
import { PencilIcon, PhotoIcon, TrashIcon } from "@/components/icons";
import { HoverImage } from "@/components/HoverImage";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ConfirmDialog";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [limit, setLimit] = useState(10);
  const [size, setSize] = useState(10);
  const [nameInput, setNameInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await paginateProducts(page, limit, search);
      if (data) {
        setProducts(data.products);
        setTotalPage(data.total_page);
        setTotalItem(data.total_item);
        setSize(data.size);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  function handleSizeChange(newSize: number) {
    setLimit(newSize);
    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(nameInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  function openCreate() {
    setEditing(null);
    setPriceDisplay("");
    setPhotoPreview(undefined);
    setFormKey((k) => k + 1);
    setFormError(null);
    setFieldErrors({});
    dialogRef.current?.showModal();
  }

  function openEdit(product: Product) {
    setEditing(product);
    setPriceDisplay(product.price.toLocaleString("id-ID"));
    setPhotoPreview(getPhotoUrl(product.photo));
    setFormKey((k) => k + 1);
    setFormError(null);
    setFieldErrors({});
    dialogRef.current?.showModal();
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : getPhotoUrl(editing?.photo ?? null);
    });
  }

  function handlePriceChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setPriceDisplay(raw ? Number(raw).toLocaleString("id-ID") : "");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateProduct(editing.id, form);
      } else {
        await createProduct(form);
      }
      dialogRef.current?.close();
      load();
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        setFieldErrors(Object.fromEntries(err.errors.map((e) => [e.field, e.message])));
      } else {
        setFormError(err instanceof ApiError ? err.message : "Failed to save product.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const ok = await confirmRef.current?.confirm(`Delete "${product.name}"?`);
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete product.");
    }
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your product catalog.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-[background-color,transform] active:scale-[0.98] hover:bg-primary/90"
        >
          New product
        </button>
      </div>

      <input
        type="search"
        placeholder="Search by name..."
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        className="mt-6 w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Photo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No products yet.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              products.map((product, i) => (
                <tr
                  key={product.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-in border-b border-border last:border-0 even:bg-muted/40"
                >
                  <td className="px-4 py-3 text-card-foreground">{product.name}</td>
                  <td className="px-4 py-3 text-card-foreground">
                    Rp{product.price.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const photoUrl = getPhotoUrl(product.photo);
                      return photoUrl ? (
                        <HoverImage
                          src={photoUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                          <PhotoIcon className="h-4 w-4" />
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      aria-label={`Edit ${product.name}`}
                      title="Edit"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                    >
                      <PencilIcon className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      aria-label={`Delete ${product.name}`}
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
          <h2 className="text-lg font-semibold">{editing ? "Edit product" : "New product"}</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={100}
                defaultValue={editing?.name}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium">
                Price per Piece
              </label>
              <input
                id="price"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={handlePriceChange}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input type="hidden" name="price" value={priceDisplay.replace(/\./g, "")} />
              {fieldErrors.price && <p className="mt-1 text-xs text-destructive">{fieldErrors.price}</p>}
            </div>

            <div>
              <label htmlFor="photo" className="block text-sm font-medium">
                Photo {editing && <span className="text-muted-foreground">(optional, replaces existing)</span>}
              </label>
              <div className="mt-1 flex items-center gap-3">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <PhotoIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    className="w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">JPEG or PNG, up to 5 MB.</p>
                  {fieldErrors.photo && <p className="mt-1 text-xs text-destructive">{fieldErrors.photo}</p>}
                </div>
              </div>
            </div>
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

      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
