export default function DashboardPage() {
  return (
    <div className="animate-in">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of your products, stores, and transactions.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-24 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3.75m8.5-3.75 1 3.75m-9.5 0h10.5"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-card-foreground">No data yet</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Once products, stores, and transactions come in, a summary will show up here.
        </p>
      </div>
    </div>
  );
}
