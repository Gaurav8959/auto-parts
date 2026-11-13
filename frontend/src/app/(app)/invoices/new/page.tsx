"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { InvoiceForm, type InvoiceLine, type InvoicePrefill } from "@/components/invoice/invoice-form";
import { Guard } from "@/components/layout/guard";
import { RequireShop } from "@/components/layout/require-shop";
import { get } from "@/lib/api";
import { P } from "@/lib/permissions";
import type { Invoice, Product } from "@/lib/types";

// ?from=<invoice id> starts a new bill with the same customer and items, at today's prices and stock
function BillAgain({ fromId }: { fromId: string }) {
  const { data: prefill, isError } = useQuery({
    queryKey: ["bill-again", fromId],
    queryFn: async (): Promise<InvoicePrefill> => {
      const source = await get<Invoice>(`/invoice/${fromId}`);
      const products = await Promise.all(
        (source.items || []).map((item) => get<Product>(`/catalog/products/${item.product?.id}`).catch(() => null))
      );
      const lines: InvoiceLine[] = [];
      (source.items || []).forEach((item, i) => {
        const product = products[i];
        if (product && product.isActive && product.stockQuantity > 0) {
          lines.push({
            product,
            quantity: Math.min(item.quantity, product.stockQuantity),
            unitPrice: product.sellingPrice,
            discountPercent: 0,
          });
        }
      });
      return {
        sourceNumber: source.invoiceNumber,
        lines,
        customerId: source.customer?.id ? String(source.customer.id) : "",
        customerName: source.customer ? "" : source.customerName === "Walk-in Customer" ? "" : source.customerName,
        customerPhone: source.customer ? "" : source.customerPhone || "",
        customerEmail: source.customer ? "" : source.customerEmail || "",
        vehicleNumber: source.vehicleNumber || "",
        isGst: source.isGst !== false,
      };
    },
    staleTime: 0,
  });

  if (isError) return <InvoiceForm />;
  if (!prefill) return <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />;
  return (
    <>
      <div className="mb-4 rounded-xl border border-accent/20 bg-accent-soft px-4 py-2.5 text-[13px] text-accent">
        Copied from {prefill.sourceNumber} at today&apos;s prices. Items out of stock were left out.
      </div>
      <InvoiceForm prefill={prefill} />
    </>
  );
}

function NewInvoiceRoute() {
  const from = useSearchParams().get("from");
  return from ? <BillAgain fromId={from} /> : <InvoiceForm />;
}

export default function NewInvoicePage() {
  return (
    <Guard permissions={[P.INVOICE_CREATE]}>
      <RequireShop action="bill">
        <Suspense>
          <NewInvoiceRoute />
        </Suspense>
      </RequireShop>
    </Guard>
  );
}
