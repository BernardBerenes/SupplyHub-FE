"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "./icons";
import { announcePopoverOpen, POPOVER_OPEN_EVENT } from "@/lib/popover";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function isSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
  min,
  max,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
}) {
  const selected = parseDateValue(value);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selected ?? today);
  const rootRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  function toggleOpen() {
    if (!open) {
      setViewDate(selected ?? today);
      announcePopoverOpen(instanceId);
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    function handleOtherOpen(e: Event) {
      if ((e as CustomEvent<string>).detail !== instanceId) setOpen(false);
    }
    window.addEventListener(POPOVER_OPEN_EVENT, handleOtherOpen);
    return () => window.removeEventListener(POPOVER_OPEN_EVENT, handleOtherOpen);
  }, [instanceId]);

  const grid = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={toggleOpen}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-ring ${
          selected ? "text-foreground" : "text-muted-foreground"
        } ${className ?? ""}`}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selected
          ? selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
          : placeholder}
      </button>

      {open && (
        <div className="animate-in absolute top-full left-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDownIcon className="h-4 w-4 rotate-90" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDownIcon className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {grid.map((date) => {
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              const disabled = (!!minDate && date < minDate) || (!!maxDate && date > maxDate);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(toDateValue(date));
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    disabled
                      ? "cursor-not-allowed text-muted-foreground/30"
                      : `cursor-pointer ${
                          isSelected
                            ? "bg-primary font-medium text-on-primary"
                            : isToday
                              ? "font-medium text-primary ring-1 ring-inset ring-primary/40 hover:bg-muted"
                              : inMonth
                                ? "text-foreground hover:bg-muted"
                                : "text-muted-foreground/50 hover:bg-muted"
                        }`
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="cursor-pointer text-primary hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={(!!minDate && today < minDate) || (!!maxDate && today > maxDate)}
              onClick={() => {
                onChange(toDateValue(today));
                setViewDate(today);
                setOpen(false);
              }}
              className="cursor-pointer text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground/30 disabled:no-underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
