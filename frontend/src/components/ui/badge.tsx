import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-2 ring-border",
  success: "bg-success-soft text-success ring-success/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  accent: "bg-accent-soft text-accent ring-accent/15",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const paymentTone = { PAID: "success", PARTIAL: "warning", UNPAID: "danger" } as const;
const paymentLabel = { PAID: "Paid", PARTIAL: "Partly paid", UNPAID: "Unpaid" } as const;

export function PaymentBadge({ status }: { status: keyof typeof paymentTone }) {
  return (
    <Badge tone={paymentTone[status]} dot>
      {paymentLabel[status]}
    </Badge>
  );
}

export function StockBadge({
  quantity,
  reorderLevel,
  unit,
}: {
  quantity: number;
  reorderLevel: number;
  unit?: string;
}) {
  if (quantity <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (quantity <= reorderLevel)
    return (
      <Badge tone="warning">
        Low · {quantity} {unit}
      </Badge>
    );
  return (
    <Badge tone="success">
      {quantity} {unit}
    </Badge>
  );
}
