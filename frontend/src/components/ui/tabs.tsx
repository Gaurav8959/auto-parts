"use client";

import { cn } from "@/lib/cn";

// Underline tabs. Switching is instant: tabs are clicked many times a day.
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-5 border-b border-border px-5", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "-mb-px flex h-11 items-center gap-1.5 border-b-2 text-[13.5px] font-medium",
            value === tab.value ? "border-primary text-fg" : "border-transparent text-fg-3 hover:text-fg-2"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-surface-2 px-1.5 py-px text-[11px] tabular text-fg-3">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
