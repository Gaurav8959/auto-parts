"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, get, post } from "@/lib/api";
import { cn } from "@/lib/cn";
import { label } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductPicker } from "./product-picker";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input, Select } from "./ui/input";
import { useOnOpen } from "@/lib/hooks";
import { useShopScope } from "@/lib/shop";

const REASONS_OUT = ["DAMAGED", "LOST", "RETURNED_TO_SUPPLIER", "STOCK_COUNT", "OTHER"];
const REASONS_IN = ["FOUND", "RETURNED_BY_CUSTOMER", "STOCK_COUNT", "OTHER"];

export function StockAdjustDialog({
  open,
  onOpenChange,
  product: initialProduct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Product | null>(initialProduct || null);
  const { currentShop } = useShopScope();
  // re-read the product so the numbers are this shop's, even right after switching shops
  const { data: fresh } = useQuery({
    queryKey: ["product", picked?.id, "in-shop", currentShop?.id],
    queryFn: () => get<Product>(`/catalog/products/${picked!.id}`),
    enabled: open && !!picked,
  });
  const product = picked ? fresh || picked : null;
  const setProduct = setPicked;
  const [direction, setDirection] = useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("ADJUSTMENT_OUT");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("DAMAGED");
  const [note, setNote] = useState("");

  useOnOpen(open, () => {
    setProduct(initialProduct || null);
    setDirection("ADJUSTMENT_OUT");
    setQuantity("1");
    setReason("DAMAGED");
    setNote("");
  });

  const reasons = direction === "ADJUSTMENT_IN" ? REASONS_IN : REASONS_OUT;
  const qty = Number(quantity) || 0;
  const after = product ? product.stockQuantity + (direction === "ADJUSTMENT_IN" ? qty : -qty) : 0;

  const mutation = useMutation({
    mutationFn: () =>
      post("/inventory/adjust", { productId: product!.id, type: direction, quantity: qty, reason, note: note || null }),
    onSuccess: () => {
      toast.success(`Stock updated · ${product!.name} now ${after} ${product!.unit}`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", product!.id] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust stock"
      description={`For damage, loss, returns or a recount${currentShop ? ` at ${currentShop.name}` : ""}. Every change is recorded.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!product || qty <= 0 || after < 0}
          >
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {product ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{product.name}</div>
              <div className="font-mono text-xs text-fg-3">{product.sku}</div>
            </div>
            <div className="text-right text-[13px] text-fg-3">
              In stock <span className="tabular font-medium text-fg">{product.stockQuantity}</span>
              {!initialProduct && (
                <button className="ml-3 text-accent hover:underline" onClick={() => setProduct(null)}>
                  Change
                </button>
              )}
            </div>
          </div>
        ) : (
          <ProductPicker onPick={setProduct} autoFocus />
        )}

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
          {(["ADJUSTMENT_OUT", "ADJUSTMENT_IN"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDirection(d);
                setReason(d === "ADJUSTMENT_IN" ? "FOUND" : "DAMAGED");
              }}
              className={cn(
                "pressable h-8 rounded-md text-[13px] font-medium",
                direction === d ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-3 hover:text-fg"
              )}
            >
              {d === "ADJUSTMENT_OUT" ? "Remove stock" : "Add stock"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" error={product && after < 0 ? "More than what's in stock" : undefined}>
            <Input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {label(r)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </Field>
        {product && qty > 0 && after >= 0 && (
          <p className="text-[13px] text-fg-3">
            Stock goes from <span className="tabular font-medium text-fg">{product.stockQuantity}</span> to{" "}
            <span className="tabular font-medium text-fg">{after}</span> {product.unit}.
          </p>
        )}
      </div>
    </Dialog>
  );
}
