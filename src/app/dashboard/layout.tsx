"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearToken } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/dashboard/products" },
  { label: "Stores", href: "/dashboard/stores" },
  { label: "Transactions", href: "/dashboard/transactions" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="flex flex-1 bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6">
        <span className="px-2 text-lg font-semibold text-card-foreground">SupplyHub</span>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50"
              >
                {item.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Soon
                </span>
              </span>
            )
          )}
        </nav>

        <button
          type="button"
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
          className="mt-auto cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
