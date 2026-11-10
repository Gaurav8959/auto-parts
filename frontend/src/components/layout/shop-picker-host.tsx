"use client";

import { useSyncExternalStore } from "react";
import { shopPrompt, useShopScope } from "@/lib/shop";
import { Dialog } from "../ui/dialog";
import { ShopChip } from "./shop-switcher";

// Answers useShopAction(): which shop should this happen in?
export function ShopPickerHost() {
  const pending = useSyncExternalStore(shopPrompt.subscribe, shopPrompt.get, () => null);
  const { shops, setScope } = useShopScope();
  const active = shops.filter((s) => s.isActive);

  return (
    <Dialog
      open={!!pending}
      onOpenChange={(open) => !open && shopPrompt.close()}
      title="Which shop?"
      description={`You're viewing all shops. Pick the shop to ${pending?.action ?? "continue"} in.`}
      size="sm"
    >
      <div className="grid gap-2">
        {active.map((shop) => (
          <button
            key={shop.id}
            onClick={() => {
              const run = pending?.run;
              shopPrompt.close();
              setScope(shop.id);
              run?.();
            }}
            className="pressable flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left hover:border-border-strong hover:bg-surface-2 dark:bg-surface-2"
          >
            <ShopChip shop={shop} className="size-8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{shop.name}</span>
              <span className="block truncate text-xs text-fg-3">
                {shop.manager ? `Manager: ${shop.manager.firstName}` : "No manager"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
