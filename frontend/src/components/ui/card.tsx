import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

const chipTones: Record<Tone, string> = {
  brand: "bg-brand-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-fg-2",
};

// Stat tile: the icon chip's colour carries meaning (money in, alerts…); values stay in text colour
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-lg [&_svg]:size-4", chipTones[tone])}>
            {icon}
          </span>
        )}
        <span className="text-[13px] font-medium text-fg-2">{label}</span>
      </div>
      <div className="mt-3 text-[26px] leading-none font-semibold tracking-tight text-fg">{value}</div>
      {hint && <div className="mt-2 text-[13px] text-fg-3">{hint}</div>}
    </Card>
  );
}
