"use client";

import { Store } from "lucide-react";
import { useShopScope } from "@/lib/shop";
import { Card } from "../ui/card";
import { ShopChip } from "./shop-switcher";

// Editing a document happens in the shop it belongs to (its stock, its customers). The admin, if looking at
// another shop or at all shops, switches to it first; a manager is always in their own shop.
export function RequireThisShop({
  shop,
  action,
  children,
}: {
  shop: { id: number; name: string; code: string };
  action: string;
  children: React.ReactNode;
}) {
  const { currentShop, setScope } = useShopScope();
  if (currentShop?.id === shop.id) return <>{children}</>;

  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-soft text-accent">
        <Store className="size-5" />
      </div>
      <h2 className="text-base font-semibold tracking-tight">Switch to {shop.name}?</h2>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-fg-3">
        This belongs to {shop.name}. To {action}, work in that shop, so its stock and customers are used.
      </p>
      <button
        onClick={() => setScope(shop.id)}
        className="pressable mx-auto mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-card hover:border-border-strong hover:bg-surface-2 dark:bg-surface-2"
      >
        <ShopChip shop={shop} className="size-9 text-[11px]" />
        <span className="text-sm font-medium">Work in {shop.name}</span>
      </button>
    </Card>
  );
}

// Billing, purchases and stock changes always happen in one shop. In the admin's
// all-shops view this asks which shop first; for everyone else it renders straight through.
export function RequireShop({ action, children }: { action: string; children: React.ReactNode }) {
  const { isAll, shops, setScope } = useShopScope();
  if (!isAll) return <>{children}</>;

  const active = shops.filter((s) => s.isActive);
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-soft text-accent">
        <Store className="size-5" />
      </div>
      <h2 className="text-base font-semibold tracking-tight">Which shop?</h2>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-fg-3">
        You&apos;re viewing all shops. Pick the shop to {action} in. You can switch any time from the sidebar.
      </p>
      <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
        {active.map((shop) => (
          <button
            key={shop.id}
            onClick={() => setScope(shop.id)}
            className="pressable flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-card hover:border-border-strong hover:bg-surface-2 dark:bg-surface-2"
          >
            <ShopChip shop={shop} className="size-9 text-[11px]" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{shop.name}</span>
              <span className="block truncate text-xs text-fg-3">
                {shop.manager ? `Manager: ${shop.manager.firstName}` : "No manager"}
              </span>
            </span>
          </button>
        ))}
        {active.length === 0 && (
          <p className="col-span-full text-[13px] text-fg-3">No active shops. Add a manager to open one.</p>
        )}
      </div>
    </Card>
  );
}
