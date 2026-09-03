"use client";

import { useEffect, useRef, useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "./icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

const SEARCH_THRESHOLD = 6;

export function Select({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  options,
  required,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const searchable = options.length > SEARCH_THRESHOLD;
  const filtered = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter("");
      return;
    }
    if (!searchable) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  return (
    <RadixSelect.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      required={required}
      open={open}
      onOpenChange={setOpen}
    >
      <RadixSelect.Trigger
        id={id}
        className={`inline-flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-ring ${className ?? ""}`}
      >
        <RadixSelect.Value placeholder={placeholder} className="truncate data-[placeholder]:text-muted-foreground" />
        <RadixSelect.Icon>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Content
        position="popper"
        sideOffset={6}
        className="animate-in z-50 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
        style={{ width: "var(--radix-select-trigger-width)" }}
      >
        {searchable && (
          <div className="border-b border-border p-1.5">
            <input
              ref={searchRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") e.stopPropagation();
              }}
              placeholder="Search..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <RadixSelect.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
          <ChevronDownIcon className="h-4 w-4 rotate-180" />
        </RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport className="max-h-[min(13rem,var(--radix-select-content-available-height))] overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No results.</p>
          )}
          {filtered.map((opt) => (
            <RadixSelect.Item
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="relative flex cursor-pointer items-center rounded-md py-2 pr-3 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 data-[state=checked]:text-primary data-[state=checked]:font-medium"
            >
              <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                <CheckIcon className="h-4 w-4" />
              </RadixSelect.ItemIndicator>
              <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
            </RadixSelect.Item>
          ))}
        </RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
          <ChevronDownIcon className="h-4 w-4" />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Root>
  );
}
