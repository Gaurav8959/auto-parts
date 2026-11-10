import moment from "moment-timezone";
import { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import QRCode from "qrcode";
import { Invoice } from "../entities/invoice/invoice.entity";
import { TInvoiceCopy, TInvoiceStatus } from "../types/invoice.type";
import { TPaymentStatus } from "../types/purchase.type";
import { amountInWords, formatInr, upiPaymentLink } from "../utilities/amount-in-words.utility";
import { twoDecimalFloat } from "../utilities/common.utility";
import { SHOP_TIME_ZONE } from "../utilities/date-time.utility";
import { splitTax, stateLabel } from "../utilities/gst.utility";

const INK = "#17171c";
const MUTED = "#6b6b76";
const LINE = "#e2e2e8";
const SOFT = "#f5f5f8";
const BRAND = "#5a4ff3";
const SUCCESS = "#127a45";
const DANGER = "#c8322f";

const LEFT = "left" as const;
const RIGHT = "right" as const;
const CENTER = "center" as const;

export const COPY_LABEL: Record<TInvoiceCopy, string> = {
  [TInvoiceCopy.ORIGINAL]: "ORIGINAL FOR RECIPIENT",
  [TInvoiceCopy.DUPLICATE]: "DUPLICATE FOR TRANSPORTER",
  [TInvoiceCopy.TRIPLICATE]: "TRIPLICATE FOR SUPPLIER",
};

const day = (date: Date) => moment(date).tz(SHOP_TIME_ZONE).format("DD MMM YYYY");
const isImage = (dataUrl?: string) => !!dataUrl && /^data:image\/(png|jpe?g);base64,/.test(dataUrl);

const label = (text: string): Content => ({ text: text.toUpperCase(), fontSize: 7, bold: true, color: MUTED, characterSpacing: 0.6 });

const thinLines = {
  hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4),
  vLineWidth: () => 0,
  hLineColor: () => LINE,
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 4,
  paddingRight: () => 4,
};

// GST split per rate, for the tax summary under the items
const taxByRate = (invoice: Invoice) => {
  const map = new Map<number, { taxable: number; tax: number }>();
  invoice.items.forEach((item) => {
    const row = map.get(Number(item.taxPercent)) || { taxable: 0, tax: 0 };
    row.taxable += Number(item.taxableAmount);
    row.tax += Number(item.taxAmount);
    map.set(Number(item.taxPercent), row);
  });
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
};

export const invoicePdfDefinition = async (invoice: Invoice, copy: TInvoiceCopy): Promise<TDocumentDefinitions> => {
  const shop = invoice.shop;
  const cancelled = invoice.status === TInvoiceStatus.CANCELLED;
  const due = twoDecimalFloat(invoice.grandTotal - invoice.paidAmount);
  const taxable = twoDecimalFloat(invoice.grandTotal - invoice.roundOff - invoice.taxTotal);

  const qr =
    shop.upiId && due > 0 && !cancelled
      ? await QRCode.toDataURL(upiPaymentLink(shop.upiId, shop.name, due, invoice.invoiceNumber), { margin: 0, width: 220 })
      : null;

  // ---------------- header ----------------
  const shopLines: Content[] = [
    { text: shop.name, fontSize: 15, bold: true, color: INK },
    shop.tagline ? { text: shop.tagline, fontSize: 8.5, color: MUTED, margin: [0, 1, 0, 0] } : null,
    shop.address ? { text: shop.address, fontSize: 8.5, color: MUTED, margin: [0, 5, 0, 0] } : null,
    [shop.phone, shop.email].filter(Boolean).length
      ? { text: [shop.phone, shop.email].filter(Boolean).join("  ·  "), fontSize: 8.5, color: MUTED }
      : null,
    shop.gstin ? { text: [{ text: "GSTIN  ", color: MUTED }, { text: shop.gstin, bold: true }], fontSize: 8.5, margin: [0, 4, 0, 0] } : null,
  ].filter(Boolean) as Content[];

  const meta: TableCell[][] = [
    [{ text: "Invoice no.", color: MUTED }, { text: invoice.invoiceNumber, bold: true, alignment: RIGHT }],
    [{ text: "Invoice date", color: MUTED }, { text: day(invoice.invoiceDate), alignment: RIGHT }],
  ];
  if (invoice.dueDate && due > 0 && !cancelled) {
    meta.push([{ text: "Due date", color: MUTED }, { text: day(invoice.dueDate), alignment: RIGHT, bold: true }]);
  }

  const header: Content = {
    columns: [
      ...(isImage(shop.logo) ? [{ image: shop.logo, fit: [52, 52] as [number, number], width: 60 }] : []),
      { stack: shopLines, width: "*" },
      {
        width: 170,
        stack: [
          { text: cancelled ? "CANCELLED INVOICE" : "TAX INVOICE", fontSize: 14, bold: true, color: cancelled ? DANGER : BRAND, alignment: RIGHT, characterSpacing: 0.8 },
          { text: COPY_LABEL[copy], fontSize: 6.5, color: MUTED, alignment: RIGHT, characterSpacing: 0.6, margin: [0, 2, 0, 8] },
          { table: { widths: ["*", "auto"], body: meta }, layout: "noBorders", fontSize: 8.5 },
        ],
      },
    ],
    columnGap: 12,
  };

  // ---------------- parties ----------------
  const billTo: Content[] = [
    label("Bill to"),
    { text: invoice.customerName, bold: true, fontSize: 10, margin: [0, 3, 0, 2] },
    invoice.customerAddress ? { text: invoice.customerAddress, color: MUTED } : null,
    invoice.customerPhone ? { text: invoice.customerPhone, color: MUTED } : null,
    invoice.customerEmail ? { text: invoice.customerEmail, color: MUTED } : null,
    invoice.customerGstin ? { text: [{ text: "GSTIN  ", color: MUTED }, { text: invoice.customerGstin, bold: true }], margin: [0, 2, 0, 0] } : null,
  ].filter(Boolean) as Content[];

  const statusText = cancelled
    ? { text: "Cancelled", color: DANGER, bold: true }
    : invoice.paymentStatus === TPaymentStatus.PAID
      ? { text: "Paid", color: SUCCESS, bold: true }
      : { text: invoice.paymentStatus === TPaymentStatus.PARTIAL ? "Partly paid" : "Unpaid", color: DANGER, bold: true };

  const details: Content[] = [
    label("Details"),
    {
      margin: [0, 3, 0, 0],
      table: {
        widths: ["auto", "*"],
        body: [
          ...(invoice.vehicleNumber ? [[{ text: "Vehicle", color: MUTED }, { text: invoice.vehicleNumber, bold: true }]] : []),
          ...(stateLabel(invoice.placeOfSupply) ? [[{ text: "Place of supply", color: MUTED }, { text: stateLabel(invoice.placeOfSupply) }]] : []),
          [{ text: "Payment", color: MUTED }, statusText],
          ...(invoice.createdBy ? [[{ text: "Billed by", color: MUTED }, { text: [invoice.createdBy.firstName, invoice.createdBy.lastName].filter(Boolean).join(" ") }]] : []),
        ],
      },
      layout: "noBorders",
    },
  ];

  const parties: Content = {
    margin: [0, 14, 0, 14],
    table: {
      widths: ["*", 170],
      body: [[{ stack: billTo, margin: [8, 7, 8, 7] }, { stack: details, margin: [8, 7, 8, 7] }]],
    },
    layout: {
      fillColor: () => SOFT,
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 1 ? 1 : 0),
      vLineColor: () => "#ffffff",
    },
  };

  // ---------------- items ----------------
  const head = ["#", "Item", "HSN", "Qty", "Rate", "Disc.", "Taxable", "GST", "Amount"].map((h, i) => ({
    text: h.toUpperCase(),
    fontSize: 6.8,
    bold: true,
    color: MUTED,
    characterSpacing: 0.4,
    alignment: i >= 3 ? RIGHT : LEFT,
  })) as TableCell[];

  const rows: TableCell[][] = invoice.items.map((item, i) => [
    { text: String(i + 1), color: MUTED },
    {
      stack: [
        { text: item.productName, bold: true },
        { text: [item.sku, item.partNumber].filter(Boolean).join(" · "), fontSize: 7, color: MUTED },
      ],
    },
    { text: item.hsnCode || "—", color: MUTED },
    { text: `${Number(item.quantity)} ${item.unit}`, alignment: RIGHT },
    { text: formatInr(item.unitPrice), alignment: RIGHT },
    { text: Number(item.discountAmount) ? formatInr(item.discountAmount) : "—", alignment: RIGHT, color: MUTED },
    { text: formatInr(item.taxableAmount), alignment: RIGHT },
    { stack: [{ text: `${Number(item.taxPercent)}%` }, { text: formatInr(item.taxAmount), fontSize: 7, color: MUTED }], alignment: RIGHT },
    { text: formatInr(item.lineTotal), alignment: RIGHT, bold: true },
  ] as TableCell[]);

  const items: Content = {
    table: { headerRows: 1, widths: [14, "*", 34, 36, 52, 42, 56, 46, 60], body: [head, ...rows] },
    layout: { ...thinLines, fillColor: (i: number) => (i === 0 ? SOFT : null) },
    fontSize: 8.5,
  };

  // ---------------- tax summary, words, payment ----------------
  // within the shop's state the tax is CGST + SGST; to another state it is IGST
  const interState = !!invoice.isInterState;
  const taxHeads = interState ? ["Rate", "Taxable", "IGST", "Total tax"] : ["Rate", "Taxable", "CGST", "SGST", "Total tax"];
  const taxRows = taxByRate(invoice).map(([rate, row]) => {
    const split = splitTax(row.tax, interState);
    return [
      `${rate}%`,
      { text: formatInr(row.taxable), alignment: RIGHT },
      ...(interState
        ? [{ text: formatInr(split.igst), alignment: RIGHT }]
        : [
            { text: formatInr(split.cgst), alignment: RIGHT },
            { text: formatInr(split.sgst), alignment: RIGHT },
          ]),
      { text: formatInr(row.tax), alignment: RIGHT },
    ] as TableCell[];
  });

  const left: Content[] = [
    label("Amount in words"),
    { text: amountInWords(invoice.grandTotal), bold: true, margin: [0, 3, 0, 12] },
    label("GST summary"),
    {
      margin: [0, 3, 0, 12],
      fontSize: 7.5,
      table: {
        headerRows: 1,
        widths: [30, ...taxHeads.slice(1).map(() => "*")],
        body: [
          taxHeads.map((h, i) => ({ text: h, bold: true, color: MUTED, alignment: i ? RIGHT : LEFT }) as TableCell),
          ...taxRows,
        ],
      },
      layout: thinLines,
    },
  ];

  const bank = [shop.bankName, shop.bankAccountName, shop.bankAccountNumber, shop.bankIfsc].some(Boolean);
  const payBlock: Content[] = [];
  if (bank) {
    payBlock.push({
      width: "*",
      stack: [
        label("Bank details"),
        {
          margin: [0, 3, 0, 0],
          table: {
            widths: ["auto", "*"],
            body: [
              ["Bank", shop.bankName],
              ["Account name", shop.bankAccountName],
              ["Account no.", shop.bankAccountNumber],
              ["IFSC", shop.bankIfsc],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => [{ text: k, color: MUTED }, { text: v, bold: true }]),
          },
          layout: { ...thinLines, hLineWidth: () => 0, paddingTop: () => 1, paddingBottom: () => 1, paddingLeft: () => 0 },
        },
      ],
    } as Content);
  }
  if (qr) {
    payBlock.push({
      width: 160,
      columns: [
        { image: qr, fit: [64, 64], width: 70 },
        {
          stack: [
            label("Scan to pay"),
            { text: formatInr(due), bold: true, fontSize: 11, margin: [0, 2, 0, 1] },
            { text: shop.upiId, fontSize: 7.5, color: MUTED },
            { text: "Any UPI app", fontSize: 7, color: MUTED },
          ],
        },
      ],
    } as Content);
  }
  if (payBlock.length) left.push({ columns: payBlock, columnGap: 12 });

  // ---------------- totals ----------------
  const totalTax = splitTax(invoice.taxTotal, interState);
  const totalRows: TableCell[][] = [
    [{ text: "Items total", color: MUTED }, { text: formatInr(invoice.subTotal), alignment: RIGHT }],
    ...(Number(invoice.discountTotal)
      ? [[{ text: "Discount", color: MUTED }, { text: `− ${formatInr(invoice.discountTotal)}`, alignment: RIGHT }]]
      : []),
    [{ text: "Taxable value", color: MUTED }, { text: formatInr(taxable), alignment: RIGHT }],
    ...(interState
      ? [[{ text: "IGST", color: MUTED }, { text: formatInr(totalTax.igst), alignment: RIGHT }]]
      : [
          [{ text: "CGST", color: MUTED }, { text: formatInr(totalTax.cgst), alignment: RIGHT }],
          [{ text: "SGST", color: MUTED }, { text: formatInr(totalTax.sgst), alignment: RIGHT }],
        ]),
    ...(Number(invoice.roundOff)
      ? [[{ text: "Round off", color: MUTED }, { text: formatInr(invoice.roundOff), alignment: RIGHT }]]
      : []),
    [
      { text: "Total", bold: true, fontSize: 11, margin: [0, 3, 0, 3] },
      { text: formatInr(invoice.grandTotal), bold: true, fontSize: 11, alignment: RIGHT, margin: [0, 3, 0, 3] },
    ],
    [{ text: "Paid", color: MUTED }, { text: formatInr(invoice.paidAmount), alignment: RIGHT }],
  ];
  if (due > 0 && !cancelled) {
    totalRows.push([
      { text: "Balance due", bold: true, color: DANGER },
      { text: formatInr(due), bold: true, color: DANGER, alignment: RIGHT },
    ]);
  }
  const totalIndex = totalRows.findIndex((r) => (r[0] as any).text === "Total");

  const totals: Content = {
    width: 190,
    stack: [
      {
        table: { widths: ["*", "auto"], body: totalRows },
        layout: {
          hLineWidth: (i: number) => (i === totalIndex || i === totalIndex + 1 ? 0.8 : 0),
          vLineWidth: () => 0,
          hLineColor: () => INK,
          paddingTop: () => 2.5,
          paddingBottom: () => 2.5,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
      },
      ...(invoice.paymentStatus === TPaymentStatus.PAID && !cancelled
        ? [
            {
              margin: [0, 10, 0, 0],
              table: { widths: ["*"], body: [[{ text: "PAID IN FULL", bold: true, color: SUCCESS, alignment: CENTER, characterSpacing: 1.2, fontSize: 9 }]] },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => SUCCESS,
                vLineColor: () => SUCCESS,
                paddingTop: () => 4,
                paddingBottom: () => 4,
              },
            } as Content,
          ]
        : []),
    ],
  };

  // ---------------- notes, terms, signature ----------------
  const closing: Content = {
    margin: [0, 22, 0, 0],
    columns: [
      {
        width: "*",
        stack: [
          ...(invoice.notes ? [label("Notes"), { text: invoice.notes, margin: [0, 3, 0, 10] } as Content] : []),
          ...(shop.invoiceTerms ? [label("Terms & conditions"), { text: shop.invoiceTerms, color: MUTED, fontSize: 7.5, margin: [0, 3, 0, 0] } as Content] : []),
          ...(cancelled && invoice.cancelReason
            ? [{ text: `Cancelled: ${invoice.cancelReason}`, color: DANGER, margin: [0, 10, 0, 0] } as Content]
            : []),
        ],
      },
      {
        width: 170,
        stack: [
          { text: `For ${shop.name}`, bold: true, alignment: CENTER },
          { canvas: [{ type: "line", x1: 10, y1: 46, x2: 160, y2: 46, lineWidth: 0.6, lineColor: MUTED }] },
          { text: "Authorised signatory", color: MUTED, fontSize: 7.5, alignment: CENTER, margin: [0, 4, 0, 0] },
        ],
      },
    ],
    columnGap: 16,
  };

  return {
    pageSize: "A4",
    pageMargins: [36, 34, 36, 46],
    info: { title: `Invoice ${invoice.invoiceNumber}`, author: shop.name, subject: `Tax invoice for ${invoice.customerName}` },
    defaultStyle: { font: "Roboto", fontSize: 8.5, color: INK, lineHeight: 1.2 },
    ...(cancelled && { watermark: { text: "CANCELLED", color: DANGER, opacity: 0.08, bold: true } }),
    footer: (currentPage: number, pageCount: number) => ({
      margin: [36, 14, 36, 0],
      fontSize: 7,
      color: MUTED,
      columns: [
        { text: "This is a computer-generated invoice." },
        { text: `${invoice.invoiceNumber}  ·  Page ${currentPage} of ${pageCount}`, alignment: RIGHT },
      ],
    }),
    content: [
      header,
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1.5, lineColor: BRAND }], margin: [0, 12, 0, 0] },
      parties,
      items,
      { margin: [0, 14, 0, 0], columns: [{ width: "*", stack: left }, totals], columnGap: 24 },
      closing,
    ],
  };
};
