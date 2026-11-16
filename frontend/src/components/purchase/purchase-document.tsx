"use client";

import { BRAND, INK, Label, MUTED } from "@/components/invoice/invoice-document";
import { amountInWords } from "@/lib/invoice-calc";
import type { Purchase } from "@/lib/types";

const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (v: number | null | undefined) => `₹${money.format(Number(v || 0))}`;
const pct = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const day = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

// A4 purchase bill: the supplier's bill as recorded by the shop, on the same paper as the invoice
export function PurchaseDocument({ purchase }: { purchase: Purchase }) {
  const shop = purchase.shop;
  const supplier = purchase.supplier;
  // a purchase without GST shows no GSTIN or tax: the price paid is the cost
  const isGst = purchase.isGst !== false;
  const items = purchase.items || [];
  const due = r2(purchase.grandTotal - purchase.paidAmount);
  const discountTotal = Number(purchase.discountTotal || 0);
  const hasDiscount = items.some((item) => Number(item.discountAmount) > 0);
  const enteredBy = [purchase.createdBy?.firstName, purchase.createdBy?.lastName].filter(Boolean).join(" ");

  const byRate = new Map<number, { taxable: number; tax: number }>();
  items.forEach((item) => {
    const row = byRate.get(Number(item.taxPercent)) || { taxable: 0, tax: 0 };
    row.taxable += Number(item.lineTotal) - Number(item.taxAmount);
    row.tax += Number(item.taxAmount);
    byRate.set(Number(item.taxPercent), row);
  });

  return (
    <article
      className="invoice-paper relative flex min-h-[297mm] w-[210mm] flex-col bg-white px-[13mm] pt-[12mm] pb-[10mm] text-[11px] leading-[1.45] antialiased print:min-h-[276mm] print:pt-[2mm] print:pb-0"
      style={{ color: INK }}
    >
      {/* header */}
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 gap-4">
          {shop.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo} alt="" className="size-[58px] shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <div className="text-[20px] leading-tight font-semibold tracking-tight">{shop.name}</div>
            {shop.tagline && <div style={{ color: MUTED }}>{shop.tagline}</div>}
            {shop.address && (
              <div className="mt-1.5 max-w-[78mm] whitespace-pre-line" style={{ color: MUTED }}>
                {shop.address}
              </div>
            )}
            <div style={{ color: MUTED }}>{[shop.phone, shop.email].filter(Boolean).join("  ·  ")}</div>
            {isGst && shop.gstin && (
              <div className="mt-1">
                <span style={{ color: MUTED }}>GSTIN </span>
                <span className="font-semibold tracking-wide">{shop.gstin}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-[62mm] shrink-0 text-right">
          <div className="text-[18px] font-bold tracking-[0.06em]" style={{ color: BRAND }}>
            PURCHASE BILL
          </div>
          <div className="mt-0.5 text-[8.5px] font-medium tracking-[0.08em] uppercase" style={{ color: MUTED }}>
            {isGst ? "With GST" : "Without GST"} · goods received
          </div>
          <dl className="mt-3 space-y-0.5">
            <div className="flex justify-between gap-4">
              <dt style={{ color: MUTED }}>Purchase no.</dt>
              <dd className="font-semibold">{purchase.purchaseNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: MUTED }}>Bill date</dt>
              <dd>{day(purchase.purchaseDate)}</dd>
            </div>
            {purchase.supplierBillNo && (
              <div className="flex justify-between gap-4">
                <dt style={{ color: MUTED }}>Supplier bill no.</dt>
                <dd className="font-semibold">{purchase.supplierBillNo}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <div className="mt-4 h-[2px]" style={{ background: BRAND }} />

      {/* parties */}
      <section className="mt-4 grid grid-cols-[1fr_62mm] gap-[2px] overflow-hidden rounded-md">
        <div className="bg-[#f5f5f8] px-3 py-2.5">
          <Label>Supplier</Label>
          <div className="mt-1 text-[13px] font-semibold">{supplier.name}</div>
          {supplier.contactPerson && <div style={{ color: MUTED }}>{supplier.contactPerson}</div>}
          {supplier.address && (
            <div className="whitespace-pre-line" style={{ color: MUTED }}>
              {supplier.address}
            </div>
          )}
          <div style={{ color: MUTED }}>{[supplier.phone, supplier.email].filter(Boolean).join("  ·  ")}</div>
          {isGst && supplier.gstin && (
            <div className="mt-0.5">
              <span style={{ color: MUTED }}>GSTIN </span>
              <span className="font-semibold">{supplier.gstin}</span>
            </div>
          )}
        </div>
        <div className="bg-[#f5f5f8] px-3 py-2.5">
          <Label>Details</Label>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
            <dt style={{ color: MUTED }}>Payment</dt>
            <dd className="font-semibold" style={{ color: purchase.paymentStatus === "PAID" ? "#127a45" : "#c8322f" }}>
              {purchase.paymentStatus === "PAID" ? "Paid" : purchase.paymentStatus === "PARTIAL" ? "Partly paid" : "Unpaid"}
            </dd>
            {enteredBy && (
              <>
                <dt style={{ color: MUTED }}>Entered by</dt>
                <dd>{enteredBy}</dd>
              </>
            )}
          </dl>
        </div>
      </section>

      {/* items */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr
            className="border-y border-[#e2e2e8] bg-[#f5f5f8] text-[8.5px] font-semibold tracking-[0.06em] uppercase"
            style={{ color: MUTED }}
          >
            <th className="px-1.5 py-1.5 text-left">#</th>
            <th className="px-1.5 py-1.5 text-left">Item</th>
            <th className="px-1.5 py-1.5 text-right">Qty</th>
            <th className="px-1.5 py-1.5 text-right">Unit cost</th>
            {hasDiscount && <th className="px-1.5 py-1.5 text-right">Disc.</th>}
            {isGst && (
              <>
                <th className="px-1.5 py-1.5 text-right">Taxable</th>
                <th className="px-1.5 py-1.5 text-right">GST</th>
              </>
            )}
            <th className="px-1.5 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {items.map((item, i) => (
            <tr key={item.id} className="break-inside-avoid border-b border-[#ececf0] align-top">
              <td className="px-1.5 py-2" style={{ color: MUTED }}>
                {i + 1}
              </td>
              <td className="px-1.5 py-2">
                <div className="font-semibold">{item.productName}</div>
                <div className="text-[9px]" style={{ color: MUTED }}>
                  {item.sku}
                </div>
              </td>
              <td className="px-1.5 py-2 text-right whitespace-nowrap">
                {Number(item.quantity)} {item.product?.unit || ""}
              </td>
              <td className="px-1.5 py-2 text-right">{inr(item.unitCost)}</td>
              {hasDiscount && (
                <td className="px-1.5 py-2 text-right" style={{ color: MUTED }}>
                  {Number(item.discountAmount) > 0 ? (
                    <>
                      <div>{inr(item.discountAmount)}</div>
                      {item.discountType === "PERCENT" && (
                        <div className="text-[9px]">{pct.format(Number(item.discountValue))}%</div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              )}
              {isGst && (
                <>
                  <td className="px-1.5 py-2 text-right">{inr(Number(item.lineTotal) - Number(item.taxAmount))}</td>
                  <td className="px-1.5 py-2 text-right">
                    <div>{Number(item.taxPercent)}%</div>
                    <div className="text-[9px]" style={{ color: MUTED }}>
                      {inr(item.taxAmount)}
                    </div>
                  </td>
                </>
              )}
              <td className="px-1.5 py-2 text-right font-semibold">{inr(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* summary */}
      <section className="mt-5 grid break-inside-avoid grid-cols-[1fr_66mm] gap-8">
        <div>
          <Label>Amount in words</Label>
          <div className="mt-0.5 font-semibold">{amountInWords(purchase.grandTotal)}</div>

          {isGst && byRate.size > 0 && (
            <div className="mt-4">
              <Label>GST summary</Label>
              <table className="mt-1 w-full border-collapse text-[9.5px] tabular">
                <thead>
                  <tr className="border-b border-[#e2e2e8]" style={{ color: MUTED }}>
                    <th className="py-1 text-left font-medium">Rate</th>
                    <th className="py-1 text-right font-medium">Taxable</th>
                    <th className="py-1 text-right font-medium">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byRate.entries()]
                    .sort((a, b) => a[0] - b[0])
                    .map(([rate, row]) => (
                      <tr key={rate} className="border-b border-[#ececf0]">
                        <td className="py-1">{rate}%</td>
                        <td className="py-1 text-right">{inr(row.taxable)}</td>
                        <td className="py-1 text-right">{inr(row.tax)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {!isGst && (
            <div className="mt-4" style={{ color: MUTED }}>
              Bought without GST: the price paid is the cost.
            </div>
          )}
        </div>

        <div>
          <dl className="tabular">
            {[
              ["Items total", inr(Number(purchase.subTotal) + discountTotal)],
              ...(discountTotal > 0 ? [["Discount", `− ${inr(discountTotal)}`]] : []),
              ...(isGst
                ? [
                    ["Taxable value", inr(purchase.subTotal)],
                    ["GST", inr(purchase.taxTotal)],
                  ]
                : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-[3px]">
                <dt style={{ color: MUTED }}>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="my-1 flex justify-between border-y border-[#17171c] py-1.5 text-[14px] font-semibold">
              <dt>Total</dt>
              <dd>{inr(purchase.grandTotal)}</dd>
            </div>
            <div className="flex justify-between py-[3px]">
              <dt style={{ color: MUTED }}>Paid</dt>
              <dd>{inr(purchase.paidAmount)}</dd>
            </div>
            {due > 0 && (
              <div className="flex justify-between py-[3px] font-semibold text-[#c8322f]">
                <dt>Balance due</dt>
                <dd>{inr(due)}</dd>
              </div>
            )}
          </dl>
          {purchase.paymentStatus === "PAID" && (
            <div className="mt-3 border border-[#127a45] py-1 text-center text-[11px] font-bold tracking-[0.14em] text-[#127a45]">
              PAID IN FULL
            </div>
          )}
        </div>
      </section>

      {/* closing */}
      <section className="mt-7 grid break-inside-avoid grid-cols-[1fr_60mm] gap-8">
        <div>
          {purchase.notes && (
            <div>
              <Label>Notes</Label>
              <div className="mt-0.5 whitespace-pre-line">{purchase.notes}</div>
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="font-semibold">For {shop.name}</div>
          <div className="mx-3 mt-12 border-t" style={{ borderColor: MUTED }} />
          <div className="mt-1 text-[9.5px]" style={{ color: MUTED }}>
            Received by
          </div>
        </div>
      </section>

      <footer className="mt-auto flex justify-between pt-8 text-[9px]" style={{ color: MUTED }}>
        <span>Purchase record kept by {shop.name}. Computer-generated.</span>
        <span>{purchase.purchaseNumber}</span>
      </footer>
    </article>
  );
}
