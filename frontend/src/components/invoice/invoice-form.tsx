"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, PackageSearch, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductPicker, type ProductPickerHandle } from "@/components/product-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Field, Input, Select } from "@/components/ui/input";
import { errorMessage, get, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { inr, label } from "@/lib/format";
import { calculateInvoice } from "@/lib/invoice-calc";
import { P } from "@/lib/permissions";
import { PAYMENT_MODES, type Invoice, type Party, type PaymentMode, type Product } from "@/lib/types";
import { date } from "@/lib/format";
import { useSyncedState } from "@/lib/hooks";
import { ShopChip } from "@/components/layout/shop-switcher";
import { useShopScope } from "@/lib/shop";
import { GST_STATES, stateCodeOf, stateLabel } from "@/lib/gst";
import { GstBadge, GstModeSwitch, type GstMode } from "@/components/gst-mode";
import { useStoredValue } from "@/lib/storage";

export type InvoiceLine = { product: Product; quantity: number; unitPrice: number; discountPercent: number };
type Line = InvoiceLine;

// What the form starts with: "Bill again" copies an earlier invoice; editing loads the invoice itself
export type InvoicePrefill = {
  sourceNumber?: string;
  lines: Line[];
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleNumber: string;
  isGst: boolean;
  extraDiscount?: number;
  notes?: string;
  placeOfSupply?: string;
  // on an edit: what this bill already holds of each product, which stays available to it
  held?: Record<number, number>;
};
type Prefill = InvoicePrefill;

// The issued invoice being edited
export type InvoiceEditing = {
  id: number;
  invoiceNumber: string;
  isGst: boolean;
  paidAmount: number;
  dueDate?: string | null;
};

const PAYMENT_TERMS = [
  { days: 0, label: "On receipt" },
  { days: 7, label: "In 7 days" },
  { days: 15, label: "In 15 days" },
  { days: 30, label: "In 30 days" },
  { days: 45, label: "In 45 days" },
  { days: 60, label: "In 60 days" },
];

function NumberCell({
  value,
  onChange,
  disabled,
  className,
  invalid,
  step = "1",
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  step?: string;
}) {
  const [draft, setDraft] = useSyncedState(String(value));
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={draft}
      disabled={disabled}
      aria-invalid={invalid}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value !== "") onChange(Number(e.target.value));
      }}
      onBlur={() => setDraft(String(value))}
      className={cn(
        "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm tabular hover:border-border focus:border-accent focus:bg-surface focus:outline-none disabled:text-fg-2 disabled:hover:border-transparent aria-invalid:border-danger aria-invalid:text-danger",
        className
      )}
    />
  );
}

// Billing screen: a new invoice, or (with `editing`) changes to an issued one
export function InvoiceForm({ prefill, editing }: { prefill?: Prefill; editing?: InvoiceEditing }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canDiscount = can(P.INVOICE_DISCOUNT);
  const canNonGst = can(P.INVOICE_NON_GST);
  // With or without GST: the last choice sticks on this device; "Bill again" follows the original bill
  const [storedMode, setStoredMode] = useStoredValue<GstMode>("billing.gst-mode", "gst");
  const [modeOverride, setModeOverride] = useState<GstMode | null>(
    prefill ? (prefill.isGst ? "gst" : "non-gst") : null
  );
  // an edit keeps the invoice's kind (GST or not): its number belongs to that series
  const mode: GstMode = editing
    ? editing.isGst
      ? "gst"
      : "non-gst"
    : canNonGst
      ? (modeOverride ?? storedMode)
      : "gst";
  const isGst = mode === "gst";
  const setMode = (next: GstMode) => {
    setModeOverride(next);
    setStoredMode(next);
  };
  const pickerRef = useRef<ProductPickerHandle>(null);
  const { currentShop } = useShopScope();

  const [lines, setLines] = useState<Line[]>(prefill?.lines || []);
  const [customerId, setCustomerId] = useState(prefill?.customerId || "");
  const [customerName, setCustomerName] = useState(prefill?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(prefill?.customerPhone || "");
  const [customerEmail, setCustomerEmail] = useState(prefill?.customerEmail || "");
  const [vehicleNumber, setVehicleNumber] = useState(prefill?.vehicleNumber || "");
  // on an edit, -1 keeps the due date the invoice already has
  const [paymentTermsDays, setPaymentTermsDays] = useState(editing ? -1 : 0);
  const [extraDiscount, setExtraDiscount] = useState(prefill?.extraDiscount || 0);
  const [paidInFull, setPaidInFull] = useState(true);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [notes, setNotes] = useState(prefill?.notes || "");
  // "" = automatic: the registered customer's state, else the shop's own state
  const [placeOfSupply, setPlaceOfSupply] = useState(prefill?.placeOfSupply || "");

  const { data: customers = [] } = useQuery({
    queryKey: ["customer", "all"],
    queryFn: () => get<Party[]>("/customer/all"),
  });

  // GST: a supply to another state is taxed as IGST instead of CGST + SGST
  const shopState = stateCodeOf(currentShop?.gstin);
  const autoPlace = stateCodeOf(customers.find((c) => String(c.id) === customerId)?.gstin) || shopState;
  const effectivePlace = placeOfSupply || autoPlace;
  const interState = !!shopState && !!effectivePlace && effectivePlace !== shopState;

  const totals = useMemo(
    () =>
      calculateInvoice(
        lines.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          // without GST nothing is carved out of the price as tax
          taxPercent: isGst ? l.product.taxPercent : 0,
        })),
        extraDiscount
      ),
    [lines, extraDiscount, isGst]
  );

  // an edit doesn't take payment: what was paid stays paid, and the total can't drop below it
  const received = editing
    ? editing.paidAmount
    : paidInFull
      ? totals.grandTotal
      : Math.min(paidAmount, totals.grandTotal);
  const balance = Math.round((totals.grandTotal - received) * 100) / 100;
  const belowPaid = !!editing && totals.grandTotal < editing.paidAmount;
  const shortStock = lines.filter((l) => l.quantity > l.product.stockQuantity);

  const held = prefill?.held || {};
  const addProduct = (picked: Product) => {
    // on an edit, what this bill already holds of a product stays available to it
    const product = held[picked.id] ? { ...picked, stockQuantity: picked.stockQuantity + held[picked.id] } : picked;
    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.product.id === product.id);
      if (existing >= 0) {
        return prev.map((l, i) => (i === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice, discountPercent: 0 }];
    });
  };

  const update = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const create = useMutation({
    mutationFn: () => {
      const body = {
        customerId: customerId ? Number(customerId) : null,
        customerName: customerId ? null : customerName || null,
        customerPhone: customerId ? null : customerPhone || null,
        customerEmail: customerId ? null : customerEmail.trim() || null,
        vehicleNumber: vehicleNumber || null,
        placeOfSupply: isGst ? placeOfSupply || null : null,
        notes: notes || null,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent || 0,
        })),
        extraDiscount: extraDiscount || 0,
      };
      if (editing) {
        return put<Invoice>(`/invoice/${editing.id}`, {
          ...body,
          ...(balance > 0 && paymentTermsDays >= 0 && { paymentTermsDays }),
        });
      }
      return post<Invoice>("/invoice", {
        ...body,
        isGst,
        paymentTermsDays: received < totals.grandTotal ? paymentTermsDays : 0,
        paidAmount: received,
        ...(received > 0 && { paymentMode }),
      });
    },
    onSuccess: (invoice) => {
      const noun = invoice.isGst === false ? "Bill" : "Invoice";
      if (editing) {
        toast.success(`${noun} ${invoice.invoiceNumber} updated`);
        qc.setQueryData(["invoice", invoice.id], invoice);
      } else {
        toast.success(`${noun} ${invoice.invoiceNumber} created`, {
          action: { label: "Print", onClick: () => window.open(`/print/invoice/${invoice.id}`, "_blank") },
        });
      }
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSubmit =
    lines.length > 0 && shortStock.length === 0 && !totals.exceeds && !belowPaid && !create.isPending;

  // ⌘/Ctrl + Enter saves from anywhere on the screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
        e.preventDefault();
        create.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSubmit, create]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {editing ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                Edit <span className="font-mono">{editing.invoiceNumber}</span>
              </h1>
              <GstBadge isGst={editing.isGst} />
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{isGst ? "New invoice" : "New bill without GST"}</h1>
          )}
          <p className="mt-1 text-sm text-fg-3">
            {editing
              ? "Change items, quantities, prices or the customer. Stock follows, and this edit is kept in the history."
              : isGst
                ? "Search a part, adjust quantities, take payment. Prices include GST."
                : "Same stock, no GST: the price is the amount, and the bill is numbered in its own series."}
          </p>
          {currentShop && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface py-0.5 pr-2.5 pl-1 text-xs text-fg-2 shadow-card dark:bg-surface-2">
              <ShopChip shop={currentShop} className="size-5 rounded-full text-[8px]" />
              Billing from <span className="font-medium text-fg">{currentShop.name}</span>
            </p>
          )}
        </div>
        {canNonGst && !editing && <GstModeSwitch value={mode} onChange={setMode} label="Bill with or without GST" />}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="border-b border-border p-3">
            <ProductPicker ref={pickerRef} onPick={addProduct} autoFocus />
          </div>
          {lines.length === 0 ? (
            <Empty
              icon={<PackageSearch />}
              title="No items yet"
              description="Search by part name, SKU, part number or vehicle model. Press Enter to add the highlighted part."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-fg-3">
                    <th className="h-9 pl-5 text-left font-medium">Item</th>
                    <th className="w-32 text-center font-medium">Qty</th>
                    <th className="w-28 px-1 text-right font-medium">Price</th>
                    {canDiscount && <th className="w-20 px-1 text-right font-medium">Disc %</th>}
                    <th className="w-28 pr-3 text-right font-medium">Amount</th>
                    <th className="w-10 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const amount = totals.items[i]?.lineTotal ?? 0;
                    const short = line.quantity > line.product.stockQuantity;
                    return (
                      <tr key={line.product.id} className="border-t border-border">
                        <td className="py-2 pl-5">
                          <div className="font-medium">{line.product.name}</div>
                          <div className={cn("text-xs", short ? "text-danger" : "text-fg-3")}>
                            <span className="font-mono">{line.product.sku}</span> · {line.product.stockQuantity} in
                            stock
                            {short && " — not enough"}
                            {isGst && ` · GST ${line.product.taxPercent}%`}
                          </div>
                        </td>
                        <td className="px-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              aria-label="Decrease"
                              onClick={() =>
                                line.quantity <= 1
                                  ? setLines((p) => p.filter((_, j) => j !== i))
                                  : update(i, { quantity: line.quantity - 1 })
                              }
                              className="pressable rounded-md p-1 text-fg-3 hover:bg-surface-2 hover:text-fg"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <NumberCell
                              value={line.quantity}
                              invalid={short}
                              onChange={(v) => update(i, { quantity: Math.max(0, v) })}
                              className="w-14 text-center"
                            />
                            <button
                              type="button"
                              aria-label="Increase"
                              onClick={() => update(i, { quantity: line.quantity + 1 })}
                              className="pressable rounded-md p-1 text-fg-3 hover:bg-surface-2 hover:text-fg"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-1">
                          <NumberCell
                            value={line.unitPrice}
                            step="0.01"
                            disabled={!canDiscount}
                            onChange={(v) => update(i, { unitPrice: v })}
                          />
                        </td>
                        {canDiscount && (
                          <td className="px-1">
                            <NumberCell
                              value={line.discountPercent}
                              step="0.5"
                              onChange={(v) => update(i, { discountPercent: Math.min(100, v) })}
                            />
                          </td>
                        )}
                        <td className="pr-3 text-right font-medium tabular">{inr(amount)}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="space-y-3 p-4">
            <Field label="Customer">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {!customerId && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Name (optional)"
                />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone"
                  type="tel"
                />
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email, to send the invoice (optional)"
                  type="email"
                  className="col-span-2"
                />
              </div>
            )}
            <Field label="Vehicle number">
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="DL 3C AB 1234"
                className="font-mono"
              />
            </Field>
            {isGst && shopState && (
              <Field
                label="Place of supply"
                hint={interState ? "Another state: billed with IGST" : "Same state as the shop: CGST + SGST"}
              >
                <Select value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)}>
                  <option value="">Automatic ({stateLabel(autoPlace)})</option>
                  {Object.keys(GST_STATES).map((code) => (
                    <option key={code} value={code}>
                      {stateLabel(code)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </Card>

          <Card className="p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-fg-2">
                <dt>Items total</dt>
                <dd className="tabular">{inr(totals.subTotal)}</dd>
              </div>
              {canDiscount && (
                <div className="flex items-center justify-between gap-3 text-fg-2">
                  <dt>Extra discount (₹)</dt>
                  <dd className="w-24">
                    <NumberCell
                      value={extraDiscount}
                      step="1"
                      invalid={totals.exceeds}
                      onChange={(v) => setExtraDiscount(v)}
                      className="border-border bg-surface"
                    />
                  </dd>
                </div>
              )}
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-fg-2">
                  <dt>Discount</dt>
                  <dd className="tabular text-success">− {inr(totals.discountTotal)}</dd>
                </div>
              )}
              {isGst && (
                <div className="flex justify-between text-fg-3">
                  <dt>GST included</dt>
                  <dd className="tabular">{inr(totals.taxTotal)}</dd>
                </div>
              )}
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-fg-3">
                  <dt>Round off</dt>
                  <dd className="tabular">
                    {totals.roundOff > 0 ? "+" : "−"} {inr(Math.abs(totals.roundOff))}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="text-2xl font-semibold tracking-tight">{inr(totals.grandTotal)}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {editing ? (
                <>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-fg-2">
                      <dt>Paid so far</dt>
                      <dd className="tabular">{inr(editing.paidAmount)}</dd>
                    </div>
                    <div className={cn("flex justify-between font-medium", balance > 0 ? "text-danger" : "text-success")}>
                      <dt>{balance > 0 ? "Balance due" : "Fully paid"}</dt>
                      <dd className="tabular">{balance > 0 ? inr(balance) : ""}</dd>
                    </div>
                  </dl>
                  {belowPaid && (
                    <p className="text-xs text-danger">
                      {inr(editing.paidAmount)} has already been paid, so the total can&apos;t go below it.
                    </p>
                  )}
                  {balance > 0 && (
                    <Field label="Payment due">
                      <Select value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(Number(e.target.value))}>
                        <option value={-1}>
                          {editing.dueDate ? `Keep ${date(editing.dueDate)}` : "On receipt"}
                        </option>
                        {PAYMENT_TERMS.filter((t) => t.days > 0).map((t) => (
                          <option key={t.days} value={t.days}>
                            {t.label} of the bill date
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMode(m)}
                        className={cn(
                          "pressable h-7 rounded-md border px-2.5 text-xs font-medium",
                          paymentMode === m
                            ? "border-accent/40 bg-accent-soft text-accent"
                            : "border-border text-fg-2 hover:border-border-strong"
                        )}
                      >
                        {label(m)}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={paidInFull}
                      onChange={(e) => {
                        setPaidInFull(e.target.checked);
                        setPaidAmount(e.target.checked ? 0 : totals.grandTotal);
                      }}
                      className="size-4 accent-[var(--primary)]"
                    />
                    Paid in full
                  </label>
                  {!paidInFull && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Received now" hint={balance > 0 ? `${inr(balance)} stays due` : undefined}>
                        <Input
                          type="number"
                          min="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(Number(e.target.value))}
                          className="tabular"
                        />
                      </Field>
                      <Field label="Payment due">
                        <Select value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(Number(e.target.value))}>
                          {PAYMENT_TERMS.map((t) => (
                            <option key={t.days} value={t.days}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  )}
                </>
              )}
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note on invoice (optional)"
              />
              <Button
                className="h-10 w-full"
                disabled={!canSubmit}
                loading={create.isPending}
                onClick={() => create.mutate()}
              >
                {editing ? "Save changes" : isGst ? "Create invoice" : "Create bill"} · {inr(totals.grandTotal)}
              </Button>
              <p className="text-center text-xs text-fg-3">
                {shortStock.length ? (
                  <span className="text-danger">Reduce quantities that exceed stock to continue.</span>
                ) : (
                  <>
                    <kbd className="rounded border border-border px-1 font-sans">⌘</kbd> +{" "}
                    <kbd className="rounded border border-border px-1 font-sans">Enter</kbd> to save
                  </>
                )}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
