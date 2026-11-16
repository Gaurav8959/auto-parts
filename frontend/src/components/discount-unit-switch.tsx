"use client";

import { cn } from "@/lib/cn";
import type { DiscountType } from "@/lib/types";

const OPTIONS: { value: DiscountType; label: string; name: string }[] = [
  { value: "PERCENT", label: "%", name: "Percent" },
  { value: "AMOUNT", label: "₹", name: "Amount in rupees" },
];

// % or ₹: how a discount is entered (on a product's MRP, or on a purchase line)
export function DiscountUnitSwitch({
  value,
  onChange,
  disabled,
  className,
}: {
  value: DiscountType;
  onChange: (value: DiscountType) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Discount in percent or rupees"
      className={cn(
        "inline-flex h-9 shrink-0 rounded-lg border border-border bg-surface-2 p-0.5",
        disabled && "opacity-60",
        className
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.name}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "pressable w-7 rounded-md text-[13px] font-medium disabled:cursor-not-allowed",
            value === option.value ? "bg-surface text-fg shadow-card" : "text-fg-3 hover:text-fg-2"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
