"use client";

import { api } from "@/lib/api";
import { printInFrame } from "@/lib/print";
import type { Invoice, InvoiceCopy } from "@/lib/types";

// Prints through a hidden frame: no new tab, the browser's print dialog opens over the current page
export const printInvoice = (
  invoiceId: number,
  options: { format?: "a4" | "thermal"; copy?: InvoiceCopy } = {},
  onStart?: () => void
) =>
  printInFrame(
    `/print/invoice/${invoiceId}?format=${options.format || "a4"}&copy=${options.copy || "ORIGINAL"}&autoprint=1`,
    String(invoiceId),
    onStart
  );

export const fetchInvoicePdf = async (invoice: Invoice, copy: InvoiceCopy = "ORIGINAL") => {
  const res = await api.get(`/invoice/${invoice.id}/pdf`, { params: { copy }, responseType: "blob" });
  return new File([res.data], `${invoice.invoiceNumber}.pdf`, { type: "application/pdf" });
};

export const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// a bill made without GST is a "bill", not an "invoice"
const noun = (invoice: Invoice) => (invoice.isGst === false ? "bill" : "invoice");

export const invoiceSummaryText = (invoice: Invoice) => {
  const due = Math.round((invoice.grandTotal - invoice.paidAmount) * 100) / 100;
  return [
    `Hi ${invoice.customerName},`,
    `Your ${noun(invoice)} ${invoice.invoiceNumber} from ${invoice.shop.name}:`,
    `Total ₹${money.format(invoice.grandTotal)}`,
    due > 0 ? `Balance due ₹${money.format(due)}` : "Paid in full. Thank you!",
    invoice.shop.upiId && due > 0 ? `Pay by UPI: ${invoice.shop.upiId}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

// WhatsApp click-to-chat; Indian 10-digit numbers get the 91 country code
export const whatsappLink = (invoice: Invoice) => {
  const digits = (invoice.customerPhone || "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(invoiceSummaryText(invoice))}`;
};

export const defaultEmailSubject = (invoice: Invoice) =>
  `${invoice.isGst === false ? "Bill" : "Invoice"} ${invoice.invoiceNumber} from ${invoice.shop.name}`;

export const defaultEmailMessage = (invoice: Invoice) => {
  const due = Math.round((invoice.grandTotal - invoice.paidAmount) * 100) / 100;
  const lines = [
    `Hi ${invoice.customerName},`,
    "",
    `Thank you for your purchase. Please find ${noun(invoice)} ${invoice.invoiceNumber} for ₹${money.format(invoice.grandTotal)} attached.`,
  ];
  if (due > 0) {
    const by = invoice.dueDate
      ? `, by ${new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
      : "";
    lines.push(`Balance due: ₹${money.format(due)}${by}.`);
  }
  lines.push("", "Regards,", invoice.shop.name);
  return lines.join("\n");
};
