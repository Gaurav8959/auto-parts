import moment from "moment-timezone";
import { Invoice } from "../entities/invoice/invoice.entity";
import { formatInr } from "../utilities/amount-in-words.utility";
import { twoDecimalFloat } from "../utilities/common.utility";
import { SHOP_TIME_ZONE } from "../utilities/date-time.utility";

const day = (date: Date) => moment(date).tz(SHOP_TIME_ZONE).format("DD MMM YYYY");

// a bill made without GST is a "bill", not an "invoice"
const noun = (invoice: Invoice) => (invoice.isGst === false ? "Bill" : "Invoice");

const escapeHtml = (value: string) =>
  (value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const defaultInvoiceSubject = (invoice: Invoice) => `${noun(invoice)} ${invoice.invoiceNumber} from ${invoice.shop.name}`;

export const defaultInvoiceMessage = (invoice: Invoice) => {
  const due = twoDecimalFloat(invoice.grandTotal - invoice.paidAmount);
  const lines = [
    `Hi ${invoice.customerName},`,
    "",
    `Thank you for your purchase. Please find ${noun(invoice).toLowerCase()} ${invoice.invoiceNumber} for ${formatInr(invoice.grandTotal)} attached.`,
  ];
  if (due > 0) {
    lines.push(`Balance due: ${formatInr(due)}${invoice.dueDate ? `, by ${day(invoice.dueDate)}` : ""}.`);
  }
  lines.push("", "Regards,", invoice.shop.name);
  return lines.join("\n");
};

// Table-based, inline-styled HTML so it renders the same in Gmail, Outlook and phone mail apps
export const invoiceEmailHtml = (invoice: Invoice, message: string) => {
  const shop = invoice.shop;
  const due = twoDecimalFloat(invoice.grandTotal - invoice.paidAmount);
  const row = (label: string, value: string, strong = false, color = "#17171c") =>
    `<tr><td style="padding:6px 0;color:#6b6b76;font-size:14px">${label}</td><td style="padding:6px 0;text-align:right;font-size:14px;color:${color};${strong ? "font-weight:600" : ""}">${value}</td></tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f2f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f5;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e4e4e9;overflow:hidden">
  <tr><td style="padding:24px 28px;border-bottom:3px solid #5a4ff3">
    ${shop.logo ? `<img src="cid:shop-logo" alt="" height="40" style="display:block;margin-bottom:10px;max-height:40px">` : ""}
    <div style="font-size:18px;font-weight:700">${escapeHtml(shop.name)}</div>
    ${shop.tagline ? `<div style="font-size:13px;color:#6b6b76;margin-top:2px">${escapeHtml(shop.tagline)}</div>` : ""}
  </td></tr>
  <tr><td style="padding:24px 28px 8px;font-size:15px;line-height:1.6">${escapeHtml(message).replace(/\n/g, "<br>")}</td></tr>
  <tr><td style="padding:12px 28px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;border-radius:10px;padding:14px 18px">
      ${row(noun(invoice), escapeHtml(invoice.invoiceNumber), true)}
      ${row("Date", day(invoice.invoiceDate))}
      ${row("Total", formatInr(invoice.grandTotal), true)}
      ${row("Paid", formatInr(invoice.paidAmount))}
      ${due > 0 ? row("Balance due", formatInr(due), true, "#c8322f") : row("Status", "Paid in full", true, "#127a45")}
      ${due > 0 && invoice.dueDate ? row("Due by", day(invoice.dueDate)) : ""}
    </table>
  </td></tr>
  <tr><td style="padding:14px 28px 24px;font-size:13px;color:#6b6b76">The full ${noun(invoice).toLowerCase()} is attached as a PDF.${shop.upiId && due > 0 ? ` You can pay by UPI to <b style="color:#17171c">${escapeHtml(shop.upiId)}</b>.` : ""}</td></tr>
  <tr><td style="padding:16px 28px;background:#fafafb;border-top:1px solid #ececf0;font-size:12px;color:#6b6b76;line-height:1.6">
    ${escapeHtml(shop.name)}${shop.address ? ` · ${escapeHtml(shop.address)}` : ""}<br>
    ${[shop.phone, shop.email].filter(Boolean).map(escapeHtml).join(" · ")}${shop.gstin && invoice.isGst !== false ? ` · GSTIN ${escapeHtml(shop.gstin)}` : ""}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};
