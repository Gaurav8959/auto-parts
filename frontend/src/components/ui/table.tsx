import { cn } from "@/lib/cn";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  className,
  children,
  align,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: "right" | "center";
}) {
  return (
    <th
      className={cn(
        "h-9 border-b border-border bg-surface-2/60 px-4 text-left text-[11px] font-semibold tracking-[0.04em] whitespace-nowrap text-fg-3 uppercase first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  align,
  colSpan,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: "right" | "center";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-border px-4 py-2.5 align-middle first:pl-5 last:pr-5",
        align === "right" && "text-right tabular",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  className,
  children,
  onClick,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <tr
      onClick={onClick}
      style={style}
      className={cn(
        "transition-colors duration-100 last:[&>td]:border-b-0",
        onClick && "cursor-pointer hover:bg-surface-2/60",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="border-b border-border px-4 py-3.5 first:pl-5 last:pr-5">
              <div
                className="h-3 animate-pulse rounded bg-surface-2"
                style={{ width: `${40 + ((r * 7 + c * 13) % 45)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
