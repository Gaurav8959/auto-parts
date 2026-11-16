import { cn } from "@/lib/cn";
import { inr, num } from "@/lib/format";
import { mrpDiscount } from "@/lib/discount";
import type { DiscountType } from "@/lib/types";

export type MrpLine = {
  mrp?: number | null;
  mrpDiscountType?: DiscountType | null;
  mrpDiscountValue?: number | null;
  quantity: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

// MRP and its discount over the lines that have an MRP, times their quantities
function mrpTotals(lines: MrpLine[]) {
  let mrp = 0;
  let off = 0;
  let items = 0;
  lines.forEach((line) => {
    const offer = mrpDiscount(line.mrp, line.mrpDiscountType, line.mrpDiscountValue);
    if (!offer) return;
    mrp += offer.mrp * line.quantity;
    off += offer.off * line.quantity;
    items += 1;
  });
  if (!items) return null;
  return {
    mrp: round2(mrp),
    off: round2(off),
    net: round2(mrp - off),
    percent: mrp > 0 ? round2((off / mrp) * 100) : 0,
    items,
  };
}

// Read-only MRP reference for whoever bills. It never changes the bill and is never printed or sent.
export function MrpSummary({ lines, className }: { lines: MrpLine[]; className?: string }) {
  const totals = mrpTotals(lines);
  if (!totals) return null;
  return (
    <div className={cn("rounded-lg border border-border bg-surface-2 p-3 text-[13px]", className)}>
      <div className="mb-2 flex items-center justify-between text-xs text-fg-3">
        <span className="font-medium">MRP reference</span>
        <span>Not on the invoice</span>
      </div>
      <dl className="space-y-1.5">
        <div className="flex justify-between text-fg-2">
          <dt>
            MRP
            {totals.items < lines.length && (
              <span className="text-fg-3">
                {" "}
                ({totals.items} of {lines.length} items)
              </span>
            )}
          </dt>
          <dd className="tabular">{inr(totals.mrp)}</dd>
        </div>
        {totals.off > 0 && (
          <>
            <div className="flex justify-between text-fg-2">
              <dt>Discount on MRP ({num(totals.percent)}%)</dt>
              <dd className="tabular">− {inr(totals.off)}</dd>
            </div>
            <div className="flex justify-between font-medium text-fg">
              <dt>MRP after discount</dt>
              <dd className="tabular">{inr(totals.net)}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
