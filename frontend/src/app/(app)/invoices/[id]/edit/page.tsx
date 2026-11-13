"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  InvoiceForm,
  type InvoiceEditing,
  type InvoiceLine,
  type InvoicePrefill,
} from "@/components/invoice/invoice-form";
import { Guard } from "@/components/layout/guard";
import { RequireThisShop } from "@/components/layout/require-shop";
import { Card } from "@/components/ui/card";
import { get } from "@/lib/api";
import { extraDiscountOf } from "@/lib/invoice-calc";
import { P } from "@/lib/permissions";
import type { Invoice, Product } from "@/lib/types";

const WALK_IN = "Walk-in Customer";
const skeleton = <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />;

// The issued invoice, as the billing screen's starting point
function EditForm({ invoice }: { invoice: Invoice }) {
  const { data: prefill, isError } = useQuery({
    queryKey: ["invoice-edit", invoice.id],
    staleTime: 0,
    queryFn: async (): Promise<InvoicePrefill> => {
      const items = invoice.items || [];
      // what the bill already holds of each product stays available to it while editing
      const held: Record<number, number> = {};
      items.forEach((item) => {
        const id = item.product?.id;
        if (id) held[id] = (held[id] || 0) + Number(item.quantity);
      });

      const ids = Object.keys(held).map(Number);
      const products = await Promise.all(ids.map((id) => get<Product>(`/catalog/products/${id}`).catch(() => null)));
      const productById = new Map(ids.map((id, i) => [id, products[i]]));

      // one line per product (a product billed twice shows once, with its quantities added)
      const lines: InvoiceLine[] = [];
      items.forEach((item) => {
        const id = item.product?.id;
        if (!id) return;
        const existing = lines.find((l) => l.product.id === id);
        if (existing) {
          existing.quantity += Number(item.quantity);
          return;
        }
        const product: Product = productById.get(id) || {
          id,
          sku: item.sku,
          name: item.productName,
          unit: item.unit,
          taxPercent: item.taxPercent,
          sellingPrice: item.unitPrice,
          stockQuantity: 0,
          reorderLevel: 0,
          isActive: false,
        };
        lines.push({
          product: { ...product, stockQuantity: product.stockQuantity + held[id] },
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent) || 0,
        });
      });

      return {
        lines,
        customerId: invoice.customer?.id ? String(invoice.customer.id) : "",
        customerName: invoice.customer || invoice.customerName === WALK_IN ? "" : invoice.customerName,
        customerPhone: invoice.customer ? "" : invoice.customerPhone || "",
        customerEmail: invoice.customer ? "" : invoice.customerEmail || "",
        vehicleNumber: invoice.vehicleNumber || "",
        isGst: invoice.isGst !== false,
        extraDiscount: extraDiscountOf(
          items.map((i) => ({
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            discountPercent: Number(i.discountPercent) || 0,
          })),
          Number(invoice.discountTotal)
        ),
        notes: invoice.notes || "",
        placeOfSupply: invoice.placeOfSupply || "",
        held,
      };
    },
  });

  if (isError) return <p className="text-sm text-danger">Couldn&apos;t load this invoice&apos;s products. Try again.</p>;
  if (!prefill) return skeleton;

  const editing: InvoiceEditing = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    isGst: invoice.isGst !== false,
    paidAmount: Number(invoice.paidAmount),
    dueDate: invoice.dueDate,
  };
  return <InvoiceForm prefill={prefill} editing={editing} />;
}

function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isError } = useQuery({
    queryKey: ["invoice", Number(id)],
    queryFn: () => get<Invoice>(`/invoice/${id}`),
  });

  const back = (
    <Link href={`/invoices/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
      <ArrowLeft className="size-3.5" /> {invoice?.invoiceNumber || "Invoice"}
    </Link>
  );

  if (isError) {
    return (
      <>
        {back}
        <p className="text-sm text-fg-3">This invoice couldn&apos;t be found in the shop you&apos;re working in.</p>
      </>
    );
  }
  if (!invoice) return skeleton;

  if (invoice.status === "CANCELLED") {
    return (
      <>
        {back}
        <Card className="mx-auto max-w-xl p-8 text-center">
          <Ban className="mx-auto mb-3 size-6 text-fg-3" />
          <h2 className="text-base font-semibold tracking-tight">Cancelled invoices can&apos;t be edited</h2>
          <p className="mt-1 text-[13px] text-fg-3">
            Use <span className="font-medium text-fg-2">Bill again</span> on the invoice to issue a new one.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      {back}
      <RequireThisShop shop={invoice.shop} action="edit this invoice">
        <EditForm invoice={invoice} />
      </RequireThisShop>
    </>
  );
}

export default function EditInvoicePage() {
  return (
    <Guard permissions={[P.INVOICE_EDIT]}>
      <EditInvoice />
    </Guard>
  );
}
