import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline-danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg shadow-button hover:bg-primary-hover",
  secondary:
    "bg-surface text-fg border border-border shadow-card hover:bg-surface-2 hover:border-border-strong dark:bg-surface-2 dark:hover:bg-surface-3",
  ghost: "text-fg-2 hover:bg-fg/[0.05] hover:text-fg dark:hover:bg-white/[0.05]",
  danger: "bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:opacity-90",
  "outline-danger":
    "border border-border bg-surface text-danger shadow-card hover:bg-danger-soft hover:border-danger/30 dark:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  icon: "size-9 rounded-lg",
  "icon-sm": "size-8 rounded-md",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "pressable inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
});
