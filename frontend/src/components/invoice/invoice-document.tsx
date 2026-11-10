"use client";

import { amountInWords, upiPaymentLink } from "@/lib/invoice-calc";
import type { Invoice, InvoiceCopy } from "@/lib/types";
import { useQr } from "./use-qr";
import { splitTax, stateLabel } from "@/lib/gst";

// Paper colours are fixed: an invoice looks the same on screen, on paper and in the PDF, in any app theme
const INK = "#17171c";
const MUTED = "#6b6b76";
const BRAND = "#5a4ff3";

export const COPY_LABEL: Record<InvoiceCopy, string> = {
  ORIGINAL: "Original for recipient",
  DUPLICATE: "Duplicate for transporter",
  TRIPLICATE: "Triplicate for supplier",
};

const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (v: number | null | undefined) => `₹${money.format(Number(v || 0))}`;
const day = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-semibold tracking-[0.08em] uppercase" style={{ color: MUTED }}>
      {children}
    </div>
  );
}

export function balanceOf(invoice: Invoice) {
  return r2(invoice.grandTotal - invoice.paidAmount);
}

export function isOverdue(invoice: Invoice) {
  return (
    invoice.status === "ISSUED" &&
    balanceOf(invoice) > 0 &&
    !!invoice.dueDate &&
    new Date(invoice.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );
}

// A4 tax invoice, laid out like the PDF the customer receives
export function InvoiceDocument({ invoice, copy = "ORIGINAL" }: { invoice: Invoice; copy?: InvoiceCopy }) {
  const shop = invoice.shop;
  const cancelled = invoice.status === "CANCELLED";
  const due = balanceOf(invoice);
  const taxable = r2(invoice.grandTotal - invoice.roundOff - invoice.taxTotal);
  // within the shop's state the tax is CGST + SGST; to another state it is IGST
  const interState = !!invoice.isInterState;
  const totalTax = splitTax(invoice.taxTotal, interState);
  const placeOfSupply = stateLabel(invoice.placeOfSupply);
  const qr = useQr(
    shop.upiId && due > 0 && !cancelled ? upiPaymentLink(shop.upiId, shop.name, due, invoice.invoiceNumber) : null
  );

  const byRate = new Map<number, { taxable: number; tax: number }>();
  invoice.items?.forEach((item) => {
    const row = byRate.get(item.taxPercent) || { taxable: 0, tax: 0 };
    row.taxable += item.taxableAmount;
    row.tax += item.taxAmount;
    byRate.set(item.taxPercent, row);
  });
  const hasBank = [shop.bankName, shop.bankAccountName, shop.bankAccountNumber, shop.bankIfsc].some(Boolean);
  const billedBy = [invoice.createdBy?.firstName, invoice.createdBy?.lastName].filter(Boolean).join(" ");

  return (
    <article
      className="invoice-paper relative flex min-h-[297mm] w-[210mm] flex-col bg-white px-[13mm] pt-[12mm] pb-[10mm] text-[11px] leading-[1.45] antialiased"
      style={{ color: INK }}
    >
      {cancelled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="-rotate-[38deg] text-[150px] font-bold tracking-wider text-[#d02d2a] opacity-[0.07] select-none">
            CANCELLED
          </span>
        </div>
      )}

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
            {shop.gstin && (
              <div className="mt-1">
                <span style={{ color: MUTED }}>GSTIN </span>
                <span className="font-semibold tracking-wide">{shop.gstin}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-[62mm] shrink-0 text-right">
          <div className="text-[18px] font-bold tracking-[0.06em]" style={{ color: cancelled ? "#d02d2a" : BRAND }}>
            {cancelled ? "CANCELLED INVOICE" : "TAX INVOICE"}
          </div>
          <div className="mt-0.5 text-[8.5px] font-medium tracking-[0.08em] uppercase" style={{ color: MUTED }}>
            {COPY_LABEL[copy]}
          </div>
          <dl className="mt-3 space-y-0.5">
            <div className="flex justify-between gap-4">
              <dt style={{ color: MUTED }}>Invoice no.</dt>
              <dd className="font-semibold">{invoice.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: MUTED }}>Invoice date</dt>
              <dd>{day(invoice.invoiceDate)}</dd>
            </div>
            {invoice.dueDate && due > 0 && !cancelled && (
              <div className="flex justify-between gap-4">
                <dt style={{ color: MUTED }}>Due date</dt>
                <dd className="font-semibold">{day(invoice.dueDate)}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <div className="mt-4 h-[2px]" style={{ background: BRAND }} />

      {/* parties */}
      <section className="mt-4 grid grid-cols-[1fr_62mm] gap-[2px] overflow-hidden rounded-md">
        <div className="bg-[#f5f5f8] px-3 py-2.5">
          <Label>Bill to</Label>
          <div className="mt-1 text-[13px] font-semibold">{invoice.customerName}</div>
          {invoice.customerAddress && <div style={{ color: MUTED }}>{invoice.customerAddress}</div>}
          {invoice.customerPhone && <div style={{ color: MUTED }}>{invoice.customerPhone}</div>}
          {invoice.customerEmail && <div style={{ color: MUTED }}>{invoice.customerEmail}</div>}
          {invoice.customerGstin && (
            <div className="mt-0.5">
              <span style={{ color: MUTED }}>GSTIN </span>
              <span className="font-semibold">{invoice.customerGstin}</span>
            </div>
          )}
        </div>
        <div className="bg-[#f5f5f8] px-3 py-2.5">
          <Label>Details</Label>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
            {invoice.vehicleNumber && (
              <>
                <dt style={{ color: MUTED }}>Vehicle</dt>
                <dd className="font-semibold tracking-wide">{invoice.vehicleNumber}</dd>
              </>
            )}
            {placeOfSupply && (
              <>
                <dt style={{ color: MUTED }}>Place of supply</dt>
                <dd>{placeOfSupply}</dd>
              </>
            )}
            <dt style={{ color: MUTED }}>Payment</dt>
            <dd
              className="font-semibold"
              style={{ color: cancelled || invoice.paymentStatus !== "PAID" ? "#c8322f" : "#127a45" }}
            >
              {cancelled
                ? "Cancelled"
                : invoice.paymentStatus === "PAID"
                  ? "Paid"
                  : invoice.paymentStatus === "PARTIAL"
                    ? "Partly paid"
                    : "Unpaid"}
            </dd>
            {billedBy && (
              <>
                <dt style={{ color: MUTED }}>Billed by</dt>
                <dd>{billedBy}</dd>
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
            <th className="px-1.5 py-1.5 text-left">HSN</th>
            <th className="px-1.5 py-1.5 text-right">Qty</th>
            <th className="px-1.5 py-1.5 text-right">Rate</th>
            <th className="px-1.5 py-1.5 text-right">Disc.</th>
            <th className="px-1.5 py-1.5 text-right">Taxable</th>
            <th className="px-1.5 py-1.5 text-right">GST</th>
            <th className="px-1.5 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {invoice.items?.map((item, i) => (
            <tr key={item.id} className="border-b border-[#ececf0] align-top">
              <td className="px-1.5 py-2" style={{ color: MUTED }}>
                {i + 1}
              </td>
              <td className="px-1.5 py-2">
                <div className="font-semibold">{item.productName}</div>
                <div className="text-[9px]" style={{ color: MUTED }}>
                  {[item.sku, item.partNumber].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td className="px-1.5 py-2" style={{ color: MUTED }}>
                {item.hsnCode || "—"}
              </td>
              <td className="px-1.5 py-2 text-right whitespace-nowrap">
                {item.quantity} {item.unit}
              </td>
              <td className="px-1.5 py-2 text-right">{inr(item.unitPrice)}</td>
              <td className="px-1.5 py-2 text-right" style={{ color: MUTED }}>
                {item.discountAmount ? inr(item.discountAmount) : "—"}
              </td>
              <td className="px-1.5 py-2 text-right">{inr(item.taxableAmount)}</td>
              <td className="px-1.5 py-2 text-right">
                <div>{item.taxPercent}%</div>
                <div className="text-[9px]" style={{ color: MUTED }}>
                  {inr(item.taxAmount)}
                </div>
              </td>
              <td className="px-1.5 py-2 text-right font-semibold">{inr(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* summary */}
      <section className="mt-5 grid grid-cols-[1fr_66mm] gap-8">
        <div>
          <Label>Amount in words</Label>
          <div className="mt-0.5 font-semibold">{amountInWords(invoice.grandTotal)}</div>

          <div className="mt-4">
            <Label>GST summary</Label>
            <table className="mt-1 w-full border-collapse text-[9.5px] tabular">
              <thead>
                <tr className="border-b border-[#e2e2e8]" style={{ color: MUTED }}>
                  <th className="py-1 text-left font-medium">Rate</th>
                  <th className="py-1 text-right font-medium">Taxable</th>
                  {interState ? (
                    <th className="py-1 text-right font-medium">IGST</th>
                  ) : (
                    <>
                      <th className="py-1 text-right font-medium">CGST</th>
                      <th className="py-1 text-right font-medium">SGST</th>
                    </>
                  )}
                  <th className="py-1 text-right font-medium">Total tax</th>
                </tr>
              </thead>
              <tbody>
                {[...byRate.entries()]
                  .sort((a, b) => a[0] - b[0])
                  .map(([rate, row]) => {
                    const split = splitTax(row.tax, interState);
                    return (
                      <tr key={rate} className="border-b border-[#ececf0]">
                        <td className="py-1">{rate}%</td>
                        <td className="py-1 text-right">{inr(row.taxable)}</td>
                        {interState ? (
                          <td className="py-1 text-right">{inr(split.igst)}</td>
                        ) : (
                          <>
                            <td className="py-1 text-right">{inr(split.cgst)}</td>
                            <td className="py-1 text-right">{inr(split.sgst)}</td>
                          </>
                        )}
                        <td className="py-1 text-right">{inr(row.tax)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {(hasBank || qr) && (
            <div className="mt-4 flex gap-6">
              {hasBank && (
                <div className="min-w-0 flex-1">
                  <Label>Bank details</Label>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
                    {[
                      ["Bank", shop.bankName],
                      ["Account name", shop.bankAccountName],
                      ["Account no.", shop.bankAccountNumber],
                      ["IFSC", shop.bankIfsc],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt style={{ color: MUTED }}>{k}</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              )}
              {qr && (
                <div className="flex shrink-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="UPI QR code" className="size-[23mm]" />
                  <div>
                    <Label>Scan to pay</Label>
                    <div className="text-[14px] font-semibold">{inr(due)}</div>
                    <div className="text-[9px]" style={{ color: MUTED }}>
                      {shop.upiId}
                    </div>
                    <div className="text-[9px]" style={{ color: MUTED }}>
                      Any UPI app
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <dl className="tabular">
            {[
              ["Items total", inr(invoice.subTotal)],
              ...(invoice.discountTotal ? [["Discount", `− ${inr(invoice.discountTotal)}`]] : []),
              ["Taxable value", inr(taxable)],
              ...(interState
                ? [["IGST", inr(totalTax.igst)]]
                : [
                    ["CGST", inr(totalTax.cgst)],
                    ["SGST", inr(totalTax.sgst)],
                  ]),
              ...(invoice.roundOff ? [["Round off", inr(invoice.roundOff)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-[3px]">
                <dt style={{ color: MUTED }}>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="my-1 flex justify-between border-y border-[#17171c] py-1.5 text-[14px] font-semibold">
              <dt>Total</dt>
              <dd>{inr(invoice.grandTotal)}</dd>
            </div>
            <div className="flex justify-between py-[3px]">
              <dt style={{ color: MUTED }}>Paid</dt>
              <dd>{inr(invoice.paidAmount)}</dd>
            </div>
            {due > 0 && !cancelled && (
              <div className="flex justify-between py-[3px] font-semibold text-[#c8322f]">
                <dt>Balance due</dt>
                <dd>{inr(due)}</dd>
              </div>
            )}
          </dl>
          {invoice.paymentStatus === "PAID" && !cancelled && (
            <div className="mt-3 border border-[#127a45] py-1 text-center text-[11px] font-bold tracking-[0.14em] text-[#127a45]">
              PAID IN FULL
            </div>
          )}
        </div>
      </section>

      {/* closing */}
      <section className="mt-7 grid grid-cols-[1fr_60mm] gap-8">
        <div>
          {invoice.notes && (
            <div className="mb-3">
              <Label>Notes</Label>
              <div className="mt-0.5 whitespace-pre-line">{invoice.notes}</div>
            </div>
          )}
          {shop.invoiceTerms && (
            <div>
              <Label>Terms & conditions</Label>
              <div className="mt-0.5 text-[9.5px] whitespace-pre-line" style={{ color: MUTED }}>
                {shop.invoiceTerms}
              </div>
            </div>
          )}
          {cancelled && invoice.cancelReason && (
            <div className="mt-3 text-[#c8322f]">Cancelled: {invoice.cancelReason}</div>
          )}
        </div>
        <div className="text-center">
          <div className="font-semibold">For {shop.name}</div>
          <div className="mx-3 mt-12 border-t" style={{ borderColor: MUTED }} />
          <div className="mt-1 text-[9.5px]" style={{ color: MUTED }}>
            Authorised signatory
          </div>
        </div>
      </section>

      <footer className="mt-auto flex justify-between pt-8 text-[9px]" style={{ color: MUTED }}>
        <span>This is a computer-generated invoice.</span>
        <span>{invoice.invoiceNumber}</span>
      </footer>
    </article>
  );
}

// 80 mm counter receipt for thermal printers
export function InvoiceReceipt({ invoice }: { invoice: Invoice }) {
  const shop = invoice.shop;
  const cancelled = invoice.status === "CANCELLED";
  const due = balanceOf(invoice);
  const qr = useQr(
    shop.upiId && due > 0 && !cancelled ? upiPaymentLink(shop.upiId, shop.name, due, invoice.invoiceNumber) : null
  );
  const rule = <div className="my-2 border-t border-dashed border-black" />;

  return (
    <article className="invoice-receipt w-[72mm] bg-white px-[2mm] py-[3mm] text-[11px] leading-[1.35] text-black">
      <div className="text-center">
        <div className="text-[14px] font-bold">{shop.name}</div>
        {shop.address && <div className="whitespace-pre-line">{shop.address}</div>}
        {shop.phone && <div>Ph: {shop.phone}</div>}
        {shop.gstin && <div>GSTIN: {shop.gstin}</div>}
        <div className="mt-1.5 font-bold tracking-wider">{cancelled ? "CANCELLED" : "TAX INVOICE"}</div>
      </div>
      {rule}
      <div className="flex justify-between">
        <span>{invoice.invoiceNumber}</span>
        <span>{day(invoice.invoiceDate)}</span>
      </div>
      <div>To: {invoice.customerName}</div>
      {invoice.customerPhone && <div>Ph: {invoice.customerPhone}</div>}
      {invoice.vehicleNumber && <div>Vehicle: {invoice.vehicleNumber}</div>}
      {invoice.isInterState && invoice.placeOfSupply && <div>Place of supply: {stateLabel(invoice.placeOfSupply)}</div>}
      {rule}
      {invoice.items?.map((item) => (
        <div key={item.id} className="mb-1.5">
          <div className="font-semibold">{item.productName}</div>
          <div className="flex justify-between tabular">
            <span>
              {item.quantity} × {money.format(item.unitPrice)}
              {item.discountAmount ? ` −${money.format(item.discountAmount)}` : ""}
            </span>
            <span>{money.format(item.lineTotal)}</span>
          </div>
          <div className="text-[9.5px]">
            HSN {item.hsnCode || "—"} · GST {item.taxPercent}%
          </div>
        </div>
      ))}
      {rule}
      <div className="tabular">
        <div className="flex justify-between">
          <span>Items total</span>
          <span>{money.format(invoice.subTotal)}</span>
        </div>
        {!!invoice.discountTotal && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>−{money.format(invoice.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{invoice.isInterState ? "IGST included" : "GST included"}</span>
          <span>{money.format(invoice.taxTotal)}</span>
        </div>
        {!!invoice.roundOff && (
          <div className="flex justify-between">
            <span>Round off</span>
            <span>{money.format(invoice.roundOff)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>₹{money.format(invoice.grandTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{money.format(invoice.paidAmount)}</span>
        </div>
        {due > 0 && !cancelled && (
          <div className="flex justify-between font-bold">
            <span>Balance due</span>
            <span>{money.format(due)}</span>
          </div>
        )}
      </div>
      {qr && (
        <div className="mt-2 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="UPI QR code" className="size-[30mm]" />
          <div className="mt-1">Scan to pay ₹{money.format(due)}</div>
        </div>
      )}
      {rule}
      <div className="text-center">
        <div>{amountInWords(invoice.grandTotal)}</div>
        <div className="mt-1.5 font-semibold">Thank you! Visit again.</div>
      </div>
    </article>
  );
}

// Fits the fixed-width A4 sheet into whatever space the screen has
export { PaperPreview } from "./paper-preview";
