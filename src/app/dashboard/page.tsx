"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getRevenue, type RevenueGroupBy, type RevenuePeriod, type RevenuePoint } from "@/lib/transactions";
import { BanknoteIcon, ClipboardListIcon, ClockIcon, TruckIcon } from "@/components/icons";
import { Select } from "@/components/Select";
import { DatePicker } from "@/components/DatePicker";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type PeriodChoice = RevenuePeriod | "custom";

const PERIOD_OPTIONS: { value: PeriodChoice; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const GROUP_LABEL: Record<RevenueGroupBy, string> = { day: "day", week: "week", month: "month" };

type DashboardData = {
  totalRevenue: number;
  points: RevenuePoint[];
  groupBy: RevenueGroupBy;
  transactionCount: number;
  paidCount: number;
  unpaidCount: number;
  pendingDeliveries: number;
  onDelivery: number;
  delivered: number;
};

function groupByForPeriod(period: RevenuePeriod): RevenueGroupBy {
  if (period === "1d" || period === "1m") return "day";
  if (period === "3m" || period === "6m") return "week";
  return "month";
}

function daysBetween(dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function groupByForRange(dateFrom: string, dateTo: string): RevenueGroupBy {
  const days = daysBetween(dateFrom, dateTo);
  if (days <= 31) return "day";
  if (days <= 186) return "week";
  return "month";
}

function formatPeriodLabel(period: string) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(period);
  if (!match) return period;
  const [, , m, d] = match;
  const month = MONTHS[Number(m) - 1];
  return d ? `${Number(d)} ${month}` : month;
}

function formatCurrency(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

async function loadDashboardData(
  period: PeriodChoice,
  customRange: { from: string; to: string } | null
): Promise<DashboardData> {
  const groupBy =
    period === "custom" && customRange ? groupByForRange(customRange.from, customRange.to) : groupByForPeriod(period as RevenuePeriod);
  const revenue =
    period === "custom" && customRange
      ? await getRevenue({ date_from: customRange.from, date_to: customRange.to, group_by: groupBy })
      : await getRevenue({ period: period as RevenuePeriod, group_by: groupBy });
  if (!revenue) throw new Error("Failed to load revenue.");

  return {
    totalRevenue: revenue.total_revenue,
    points: revenue.points,
    groupBy,
    transactionCount: revenue.transaction_count,
    paidCount: revenue.paid_count,
    unpaidCount: revenue.unpaid_count,
    pendingDeliveries: revenue.pending_deliveries,
    onDelivery: revenue.on_delivery,
    delivered: revenue.delivered_count,
  };
}

function StatTile({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-card-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function RevenueBarChart({ points }: { points: RevenuePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 700;
  const height = 220;
  const paddingLeft = 4;
  const paddingRight = 4;
  const paddingTop = 12;
  const paddingBottom = 24;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const barGap = points.length > 20 ? 2 : 6;
  const barWidth = Math.max(chartWidth / Math.max(points.length, 1) - barGap, 1);
  const labelStep = Math.max(1, Math.ceil(points.length / 12));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Revenue chart">
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {points.map((p, i) => {
          const barHeight = Math.max((p.revenue / max) * chartHeight, 3);
          const x = paddingLeft + i * (barWidth + barGap);
          const y = paddingTop + chartHeight - barHeight;
          return (
            <g key={`${p.period}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(4, barWidth / 2)}
                fill="var(--color-primary)"
                opacity={hover === null || hover === i ? 1 : 0.4}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
              {i % labelStep === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-muted-foreground)"
                >
                  {formatPeriodLabel(p.period)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${((paddingLeft + hover * (barWidth + barGap) + barWidth / 2) / width) * 100}%`,
            top: `${(paddingTop / height) * 100}%`,
          }}
        >
          <p className="font-medium text-card-foreground">{formatPeriodLabel(points[hover].period)}</p>
          <p className="text-muted-foreground">{formatCurrency(points[hover].revenue)}</p>
        </div>
      )}
    </div>
  );
}

type StatusItem = { label: string; count: number; color: string; className: string };

function StatusDonutChart({ title, items }: { title: string; items: StatusItem[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const size = 140;
  const radius = 52;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gap = 3;

  const rawLengths = items.map((item) => (total > 0 ? (item.count / total) * circumference : 0));
  const startOffsets = rawLengths.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + rawLengths[i - 1]);
    return acc;
  }, []);
  const segments = items.map((item, i) => ({
    ...item,
    length: Math.max(rawLengths[i] - gap, 0),
    offset: -(startOffsets[i] + gap / 2),
    index: i,
  }));

  const centerLabel = hover !== null ? segments[hover].label : "Total";
  const centerValue = hover !== null ? segments[hover].count : total;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-medium text-card-foreground">{title}</h2>
      <div className="mt-4 flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            className="-rotate-90"
            role="img"
            aria-label={`${title} chart`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth={strokeWidth}
            />
            {segments.map(
              (seg) =>
                seg.count > 0 && (
                  <circle
                    key={seg.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="round"
                    opacity={hover === null || hover === seg.index ? 1 : 0.4}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHover(seg.index)}
                    onMouseLeave={() => setHover((h) => (h === seg.index ? null : h))}
                  />
                )
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-semibold text-card-foreground">{centerValue}</span>
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-sm"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.className}`} />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-card-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodChoice>("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customRangeIncomplete = period === "custom" && (!customFrom || !customTo);

  useEffect(() => {
    if (customRangeIncomplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadDashboardData(period, period === "custom" ? { from: customFrom, to: customTo } : null)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, customFrom, customTo, customRangeIncomplete]);

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue and transactions overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodChoice)}
            className="w-40"
            options={PERIOD_OPTIONS}
            searchable={false}
            maxVisibleItems={5}
          />
          {period === "custom" && (
            <>
              <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="From date" max={customTo} />
              <span className="text-xs text-muted-foreground">to</span>
              <DatePicker value={customTo} onChange={setCustomTo} placeholder="To date" min={customFrom} align="right" />
            </>
          )}
        </div>
      </div>

      {!loading && !error && customRangeIncomplete && (
        <div className="mt-10 flex items-center justify-center rounded-xl border border-dashed border-border bg-card py-24 text-sm text-muted-foreground">
          Select a from and to date to view revenue.
        </div>
      )}

      {loading && (
        <div className="mt-10 flex items-center justify-center rounded-xl border border-dashed border-border bg-card py-24 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}

      {!loading && error && (
        <div className="mt-10 flex items-center justify-center rounded-xl border border-dashed border-border bg-card py-24 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<BanknoteIcon className="h-5 w-5" />}
              label="Total revenue"
              value={formatCurrency(data.totalRevenue)}
              sublabel={
                period === "custom"
                  ? `${formatPeriodLabel(customFrom)} – ${formatPeriodLabel(customTo)}`
                  : PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? ""
              }
            />
            <StatTile
              icon={<ClipboardListIcon className="h-5 w-5" />}
              label="Transactions"
              value={String(data.transactionCount)}
              sublabel={`${data.paidCount} paid`}
            />
            <StatTile
              icon={<ClockIcon className="h-5 w-5" />}
              label="Unpaid transactions"
              value={String(data.unpaidCount)}
              sublabel="Awaiting payment"
            />
            <StatTile
              icon={<TruckIcon className="h-5 w-5" />}
              label="Deliveries pending"
              value={String(data.pendingDeliveries)}
              sublabel={`${data.onDelivery} on the way`}
            />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-card-foreground">Revenue by {GROUP_LABEL[data.groupBy]}</h2>
              <p className="text-lg font-semibold text-card-foreground">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="mt-4">
              <RevenueBarChart points={data.points} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusDonutChart
              title="Payment status"
              items={[
                { label: "Paid", count: data.paidCount, color: "#10b981", className: "bg-emerald-500" },
                { label: "Unpaid", count: data.unpaidCount, color: "#f59e0b", className: "bg-amber-500" },
              ]}
            />
            <StatusDonutChart
              title="Delivery status"
              items={[
                { label: "Pending", count: data.pendingDeliveries, color: "#94a3b8", className: "bg-slate-400" },
                { label: "On delivery", count: data.onDelivery, color: "#3b82f6", className: "bg-blue-500" },
                { label: "Delivered", count: data.delivered, color: "#10b981", className: "bg-emerald-500" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
