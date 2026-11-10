"use client";

import { Search, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./input";
import { useSyncedState } from "@/lib/hooks";

// Debounced so typing doesn't fire a request per keystroke
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useSyncedState(value);

  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
      <Input
        value={draft}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-9"
      />
      {draft && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-fg-3 hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
