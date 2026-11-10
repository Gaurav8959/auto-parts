"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { get } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/format";
import type { Product } from "@/lib/types";

export type ProductPickerHandle = { focus: () => void };

// Type-ahead search over name / SKU / part number / vehicle. Fully keyboard driven:
// ↑ ↓ to move, Enter to pick. Results appear without animation because this is used constantly.
export const ProductPicker = forwardRef<
  ProductPickerHandle,
  {
    onPick: (product: Product) => void;
    placeholder?: string;
    showCost?: boolean;
    autoFocus?: boolean;
  }
>(function ProductPicker(
  { onPick, placeholder = "Search part by name, SKU, part no. or vehicle…", showCost, autoFocus },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => get<Product[]>("/catalog/products/search", { keyword: debounced }),
    enabled: open,
    staleTime: 5_000,
  });

  useEffect(() => setActive(0), [debounced]);

  const pick = (product: Product) => {
    onPick(product);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <input
            ref={inputRef}
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-controls="product-picker-list"
            aria-autocomplete="list"
            className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-fg-3 hover:border-border-strong focus:border-accent focus:ring-[3px] focus:ring-[var(--ring)] focus:outline-none"
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (inputRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
          className="z-50 max-h-80 w-[var(--radix-popover-trigger-width)] min-w-80 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-pop"
          role="listbox"
          id="product-picker-list"
        >
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-fg-3">
              {isFetching ? "Searching…" : debounced ? `No parts match "${debounced}"` : "Start typing to search"}
            </div>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
                  i === active && "bg-surface-2"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{p.name}</div>
                  <div className="truncate text-xs text-fg-3">
                    <span className="font-mono">{p.sku}</span>
                    {p.brand && ` · ${p.brand.name}`}
                    {p.vehicleCompatibility && ` · ${p.vehicleCompatibility}`}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tabular text-[13px] font-medium">
                    {inr(showCost ? p.purchasePrice : p.sellingPrice)}
                  </div>
                  <div
                    className={cn(
                      "tabular text-xs",
                      p.stockQuantity <= 0
                        ? "text-danger"
                        : p.stockQuantity <= p.reorderLevel
                          ? "text-warning"
                          : "text-fg-3"
                    )}
                  >
                    {p.stockQuantity} {p.unit} in stock
                  </div>
                </div>
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
