"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductPicker } from "@/components/product-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Field, Input, Select } from "@/components/ui/input";
import { errorMessage, get, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { inr, isoDay, label } from "@/lib/format";
import { P } from "@/lib/permissions";
import { PAYMENT_MODES, type Party, type PaymentMode, type Product, type Purchase } from "@/lib/types";
import { ShopChip } from "@/components/layout/shop-switcher";
import { useShopScope } from "@/lib/shop";
import { GstBadge, GstModeSwitch, type GstMode } from "@/components/gst-mode";
import { useStoredValue } from "@/lib/storage";

export type PurchaseLine = { product: Product; quantity: string; unitCost: string; taxPercent: string };
type Line = PurchaseLine;

// A recorded purchase as the form's starting point, when editing it
export type PurchasePrefill = {
  supplierId: string;
  supplierBillNo: string;
  purchaseDate: string;
  isGst: boolean;
  notes: string;
  lines: Line[];
};

// The recorded purchase being edited
export type PurchaseEditing = { id: number; purchaseNumber: string; paidAmount: number };

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

const cell =
  "h-8 w-full rounded-md border border-border bg-surface px-2 text-right text-sm tabular focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]";

// Record a supplier bill, or (with `editing`) change a recorded one
export function PurchaseForm({ prefill, editing }: { prefill?: PurchasePrefill; editing?: PurchaseEditing }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canCost = can(P.PRODUCT_VIEW_COST);
  const { currentShop } = useShopScope();
  // most supplier bills come without GST; the last choice sticks on this device (an edit starts from the bill's own)
  const [storedMode, setStoredMode] = useStoredValue<GstMode>("purchase.gst-mode", "non-gst");
  const [editMode, setEditMode] = useState<GstMode | null>(prefill ? (prefill.isGst ? "gst" : "non-gst") : null);
  const mode = editMode ?? storedMode;
  const setMode = (next: GstMode) => (editing ? setEditMode(next) : setStoredMode(next));
  const isGst = mode === "gst";

  const [supplierId, setSupplierId] = useState(prefill?.supplierId || "");
  const [supplierBillNo, setSupplierBillNo] = useState(prefill?.supplierBillNo || "");
  const [purchaseDate, setPurchaseDate] = useState(prefill?.purchaseDate || isoDay());
  const [lines, setLines] = useState<Line[]>(prefill?.lines || []);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("BANK_TRANSFER");
  const [notes, setNotes] = useState(prefill?.notes || "");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["supplier", "all"],
    queryFn: () => get<Party[]>("/supplier/all"),
  });

  const computed = useMemo(() => {
    const rows = lines.map((l) => {
      const base = r2(Number(l.quantity || 0) * Number(l.unitCost || 0));
      const tax = isGst ? r2((base * Number(l.taxPercent || 0)) / 100) : 0;
      return { base, tax, total: r2(base + tax) };
    });
    const subTotal = r2(rows.reduce((a, b) => a + b.base, 0));
    const taxTotal = r2(rows.reduce((a, b) => a + b.tax, 0));
    return { rows, subTotal, taxTotal, grandTotal: r2(subTotal + taxTotal) };
  }, [lines, isGst]);

  const addProduct = (product: Product) => {
    if (lines.some((l) => l.product.id === product.id)) {
      toast.message(`${product.name} is already on this purchase`);
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        product,
        quantity: "1",
        unitCost: product.purchasePrice ? String(product.purchasePrice) : "",
        taxPercent: String(product.taxPercent),
      },
    ]);
  };

  const update = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  // an edit doesn't take payment: what was paid to the supplier stays paid
  const paid = editing ? editing.paidAmount : Number(paidAmount || 0);
  const valid =
    supplierId &&
    lines.length > 0 &&
    lines.every((l) => Number(l.quantity) > 0 && l.unitCost !== "" && Number(l.unitCost) >= 0) &&
    paid <= computed.grandTotal;

  const create = useMutation({
    mutationFn: () => {
      const body = {
        supplierId: Number(supplierId),
        supplierBillNo: supplierBillNo || null,
        purchaseDate: new Date(purchaseDate + "T12:00:00").toISOString(),
        isGst,
        notes: notes || null,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
          ...(isGst && { taxPercent: Number(l.taxPercent) }),
        })),
      };
      if (editing) return put<Purchase>(`/purchase/${editing.id}`, body);
      return post<Purchase>("/purchase", { ...body, paidAmount: paid, ...(paid > 0 && { paymentMode }) });
    },
    onSuccess: (purchase) => {
      if (editing) {
        toast.success(`${purchase.purchaseNumber} updated. Stock and cost follow.`);
        qc.setQueryData(["purchase", purchase.id], purchase);
      } else {
        toast.success(`${purchase.purchaseNumber} saved. Stock updated.`);
      }
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/purchases/${purchase.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {editing ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                Edit <span className="font-mono">{editing.purchaseNumber}</span>
              </h1>
              <GstBadge isGst={isGst} />
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Record purchase</h1>
          )}
          <p className="mt-1 text-sm text-fg-3">
            {editing
              ? "Change the supplier, items, quantities or costs. Stock and average cost follow, and this edit is kept in the history."
              : isGst
              ? "Enter the supplier's GST bill. Costs are before GST. Saving adds the items to stock and updates average cost."
              : "Enter the supplier's bill. No GST: the price you pay is the cost. Saving adds the items to the same stock."}
          </p>
          {currentShop && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface py-0.5 pr-2.5 pl-1 text-xs text-fg-2 shadow-card dark:bg-surface-2">
              <ShopChip shop={currentShop} className="size-5 rounded-full text-[8px]" />
              Receiving into <span className="font-medium text-fg">{currentShop.name}</span>
            </p>
          )}
        </div>
        <GstModeSwitch value={mode} onChange={setMode} label="Supplier bill with or without GST" />
      </div>

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Supplier" required>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier bill no.">
          <Input value={supplierBillNo} onChange={(e) => setSupplierBillNo(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Bill date">
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <div className="border-b border-border p-3">
          <ProductPicker onPick={addProduct} showCost={canCost} placeholder="Add a part to this purchase…" />
        </div>
        {lines.length === 0 ? (
          <Empty
            icon={<PackageSearch />}
            title="No items yet"
            description="Search for each part on the supplier's bill."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-fg-3">
                  <th className="h-9 pl-5 text-left font-medium">Item</th>
                  <th className="w-24 px-1 text-right font-medium">Qty</th>
                  <th className="w-32 px-1 text-right font-medium">Unit cost</th>
                  {isGst && <th className="w-24 px-1 text-right font-medium">GST %</th>}
                  <th className="w-32 pr-3 text-right font-medium">Total</th>
                  <th className="w-10 pr-3" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={line.product.id} className="border-t border-border">
                    <td className="py-2 pl-5">
                      <div className="font-medium">{line.product.name}</div>
                      <div className="text-xs text-fg-3">
                        <span className="font-mono">{line.product.sku}</span> · {line.product.stockQuantity} in stock
                      </div>
                    </td>
                    <td className="px-1">
                      <input
                        type="number"
                        min="0"
                        className={cell}
                        value={line.quantity}
                        onChange={(e) => update(i, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="px-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={cn(cell, line.unitCost === "" && "border-warning")}
                        value={line.unitCost}
                        placeholder="0.00"
                        onChange={(e) => update(i, { unitCost: e.target.value })}
                      />
                    </td>
                    {isGst && (
                      <td className="px-1">
                        <input
                          type="number"
                          min="0"
                          aria-label={`GST % for ${line.product.name}`}
                          className={cell}
                          value={line.taxPercent}
                          onChange={(e) => update(i, { taxPercent: e.target.value })}
                        />
                      </td>
                    )}
                    <td className="pr-3 text-right font-medium tabular">{inr(computed.rows[i]?.total)}</td>
                    <td className="pr-3">
                      <button
                        type="button"
                        aria-label={`Remove ${line.product.name}`}
                        onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                        className="pressable rounded-md p-1 text-fg-3 hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-6 border-t border-border p-5 md:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {editing ? (
              <dl className="max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-fg-2">
                  <dt>Paid to supplier so far</dt>
                  <dd className="tabular">{inr(editing.paidAmount)}</dd>
                </div>
                {computed.grandTotal < editing.paidAmount ? (
                  <p className="text-xs text-danger">
                    {inr(editing.paidAmount)} has already been paid, so the bill total can&apos;t go below it.
                  </p>
                ) : (
                  <div className="flex justify-between font-medium text-fg-2">
                    <dt>{computed.grandTotal > editing.paidAmount ? "Still owed" : "Fully paid"}</dt>
                    <dd className="tabular">
                      {computed.grandTotal > editing.paidAmount ? inr(computed.grandTotal - editing.paidAmount) : ""}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Paid now"
                  hint={
                    paid > computed.grandTotal
                      ? undefined
                      : paid < computed.grandTotal
                        ? `${inr(computed.grandTotal - paid)} will be due to supplier`
                        : "Fully paid"
                  }
                  error={paid > computed.grandTotal ? "More than the bill total" : undefined}
                >
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      className="tabular"
                    />
                    <Button type="button" variant="secondary" onClick={() => setPaidAmount(String(computed.grandTotal))}>
                      Full
                    </Button>
                  </div>
                </Field>
                {paid > 0 && (
                  <Field label="Paid by">
                    <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {label(m)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
            )}
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <div>
            <dl className="space-y-1.5 text-sm">
              {isGst && (
                <>
                  <div className="flex justify-between text-fg-2">
                    <dt>Subtotal</dt>
                    <dd className="tabular">{inr(computed.subTotal)}</dd>
                  </div>
                  <div className="flex justify-between text-fg-2">
                    <dt>GST</dt>
                    <dd className="tabular">{inr(computed.taxTotal)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <dt className="font-medium">Bill total</dt>
                <dd className="text-xl font-semibold tracking-tight">{inr(computed.grandTotal)}</dd>
              </div>
            </dl>
            <Button
              className="mt-4 h-10 w-full"
              disabled={!valid}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              {editing ? "Save changes" : "Save purchase & add stock"}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
