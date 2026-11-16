"use client";

import { useRouter } from "next/navigation";
import { Guard } from "@/components/layout/guard";
import { RequireShop } from "@/components/layout/require-shop";
import { PurchaseForm } from "@/components/purchase-form";
import { P } from "@/lib/permissions";

export default function NewPurchasePage() {
  // a fresh form on every visit to this page; the browser's back/forward still brings back what was there
  const { bfcacheId } = useRouter();
  return (
    <Guard permissions={[P.PURCHASE_CREATE]}>
      <RequireShop action="receive stock">
        <PurchaseForm key={bfcacheId} />
      </RequireShop>
    </Guard>
  );
}
