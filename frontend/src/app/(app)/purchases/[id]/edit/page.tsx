"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Guard } from "@/components/layout/guard";
import { RequireThisShop } from "@/components/layout/require-shop";
import { PurchaseForm, type PurchaseLine, type PurchasePrefill } from "@/components/purchase-form";
import { get } from "@/lib/api";
import { isoDay } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Product, Purchase } from "@/lib/types";

const skeleton = <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />;

// The recorded purchase, as the purchase form's starting point
function EditForm({ purchase }: { purchase: Purchase }) {
  const { data: prefill, isError } = useQuery({
    queryKey: ["purchase-edit", purchase.id],
    staleTime: 0,
    queryFn: async (): Promise<PurchasePrefill> => {
      const items = purchase.items || [];
      const ids = [...new Set(items.map((i) => i.product?.id).filter((id): id is number => !!id))];
      const products = await Promise.all(ids.map((id) => get<Product>(`/catalog/products/${id}`).catch(() => null)));
      const productById = new Map(ids.map((id, i) => [id, products[i]]));

      // one line per product; a product entered twice is combined at its average cost
      const lines: PurchaseLine[] = [];
      const valueOf = new Map<number, number>();
      items.forEach((item) => {
        const id = item.product?.id;
        if (!id) return;
        const quantity = Number(item.quantity);
        const value = quantity * Number(item.unitCost);
        const existing = lines.find((l) => l.product.id === id);
        valueOf.set(id, (valueOf.get(id) || 0) + value);
        if (existing) {
          const totalQty = Number(existing.quantity) + quantity;
          existing.quantity = String(totalQty);
          existing.unitCost = String(Math.round((valueOf.get(id)! / totalQty) * 100) / 100);
          return;
        }
        const product: Product = productById.get(id) || {
          id,
          sku: item.sku,
          name: item.productName,
          unit: "pc",
          taxPercent: item.taxPercent,
          sellingPrice: 0,
          stockQuantity: 0,
          reorderLevel: 0,
          isActive: false,
        };
        lines.push({
          product,
          quantity: String(quantity),
          unitCost: String(Number(item.unitCost)),
          taxPercent: String(Number(item.taxPercent) || product.taxPercent),
        });
      });

      return {
        supplierId: String(purchase.supplier.id),
        supplierBillNo: purchase.supplierBillNo || "",
        purchaseDate: isoDay(new Date(purchase.purchaseDate)),
        isGst: purchase.isGst !== false,
        notes: purchase.notes || "",
        lines,
      };
    },
  });

  if (isError) return <p className="text-sm text-danger">Couldn&apos;t load this purchase&apos;s products. Try again.</p>;
  if (!prefill) return skeleton;
  return (
    <PurchaseForm
      prefill={prefill}
      editing={{ id: purchase.id, purchaseNumber: purchase.purchaseNumber, paidAmount: Number(purchase.paidAmount) }}
    />
  );
}

function EditPurchase() {
  const { id } = useParams<{ id: string }>();
  const { data: purchase, isError } = useQuery({
    queryKey: ["purchase", Number(id)],
    queryFn: () => get<Purchase>(`/purchase/${id}`),
  });

  const back = (
    <Link href={`/purchases/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
      <ArrowLeft className="size-3.5" /> {purchase?.purchaseNumber || "Purchase"}
    </Link>
  );

  if (isError) {
    return (
      <>
        {back}
        <p className="text-sm text-fg-3">This purchase couldn&apos;t be found in the shop you&apos;re working in.</p>
      </>
    );
  }
  if (!purchase) return skeleton;

  return (
    <>
      {back}
      <RequireThisShop shop={purchase.shop} action="edit this purchase">
        <EditForm purchase={purchase} />
      </RequireThisShop>
    </>
  );
}

export default function EditPurchasePage() {
  return (
    <Guard permissions={[P.PURCHASE_EDIT]}>
      <EditPurchase />
    </Guard>
  );
}
