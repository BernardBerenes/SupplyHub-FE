function getPageList(page: number, totalPage: number): (number | "…")[] {
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPage - 1, page + 1);

  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPage - 1) pages.push("…");
  if (totalPage > 1) pages.push(totalPage);

  return pages;
}

export function Pagination({
  page,
  totalPage,
  onChange,
}: {
  page: number;
  totalPage: number;
  onChange: (page: number) => void;
}) {
  if (totalPage <= 1) return null;

  const navButton =
    "cursor-pointer rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-between border-t border-border px-1 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPage}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(1)} className={navButton}>
          First
        </button>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={navButton}>
          Previous
        </button>

        {getPageList(page, totalPage).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-8 w-8 cursor-pointer rounded-lg font-medium transition-colors ${
                p === page
                  ? "bg-primary text-on-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPage}
          onClick={() => onChange(page + 1)}
          className={navButton}
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= totalPage}
          onClick={() => onChange(totalPage)}
          className={navButton}
        >
          Last
        </button>
      </div>
    </div>
  );
}
