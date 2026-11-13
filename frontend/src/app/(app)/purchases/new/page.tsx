"use client";

import { Guard } from "@/components/layout/guard";
import { RequireShop } from "@/components/layout/require-shop";
import { PurchaseForm } from "@/components/purchase-form";
import { P } from "@/lib/permissions";

export default function NewPurchasePage() {
  return (
    <Guard permissions={[P.PURCHASE_CREATE]}>
      <RequireShop action="receive stock">
        <PurchaseForm />
      </RequireShop>
    </Guard>
  );
}
