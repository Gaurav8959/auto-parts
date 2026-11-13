"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// Every purchase and sale is either with GST or without it; both work on the same stock
export type GstMode = "gst" | "non-gst";

export function GstModeSwitch({
  value,
  onChange,
  label,
  className,
}: {
  value: GstMode;
  onChange: (value: GstMode) => void;
  label: string;
  className?: string;
}) {
  const options: { value: GstMode; label: string }[] = [
    { value: "gst", label: "With GST" },
    { value: "non-gst", label: "Without GST" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-lg border border-border bg-surface-2 p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "pressable h-8 rounded-md px-3 text-[13px] font-medium",
            value === option.value ? "bg-surface text-fg shadow-card" : "text-fg-3 hover:text-fg-2"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Marks a purchase or sale as GST or non-GST in lists and headers
export function GstBadge({ isGst }: { isGst?: boolean }) {
  return isGst === false ? <Badge>Non-GST</Badge> : <Badge tone="accent">GST</Badge>;
}
