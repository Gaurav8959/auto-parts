"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { Tooltip } from "../ui/tooltip";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Day", icon: Sun },
  { value: "dark", label: "Night", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

const centerOf = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

// Segmented Day / Night / Auto. The pill slides with a CSS transition so rapid clicks retarget smoothly.
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setTheme } = useTheme();
  const index = OPTIONS.findIndex((o) => o.value === preference);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("relative grid grid-cols-3 rounded-lg bg-fg/[0.05] p-0.5 dark:bg-white/[0.05]", className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-md bg-surface shadow-card ring-1 ring-border transition-transform duration-200 [transition-timing-function:var(--ease-out)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={preference === value}
          onClick={(e) => setTheme(value, centerOf(e.currentTarget))}
          className={cn(
            "relative z-10 flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-150",
            preference === value ? "text-fg" : "text-fg-3 hover:text-fg-2"
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// Single button that cycles Day → Night → Auto, for the collapsed rail and mobile header
export function ThemeToggleButton({
  className,
  tooltipSide = "right",
}: {
  className?: string;
  tooltipSide?: "right" | "bottom";
}) {
  const { preference, setTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === preference) || OPTIONS[2];
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
  const Icon = current.icon;

  return (
    <Tooltip content={`Theme: ${current.label} · switch to ${next.label}`} side={tooltipSide}>
      <button
        onClick={(e) => setTheme(next.value, centerOf(e.currentTarget))}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
        className={cn(
          "pressable flex size-9 items-center justify-center rounded-lg text-fg-2 hover:bg-fg/[0.06] hover:text-fg",
          className
        )}
      >
        <Icon className="size-[18px]" />
      </button>
    </Tooltip>
  );
}
