"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, LayoutGrid, Settings2, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useLogos } from "@/lib/logos";
import { useShopScope } from "@/lib/shop";
import type { ShopRef } from "@/lib/types";
import { Tooltip } from "../ui/tooltip";

// A stable colour per shop, so a shop is recognisable at a glance across screens
const SHOP_COLORS = ["#5a4ff3", "#0e9f6e", "#e8590c", "#0284c7", "#c026d3", "#ca8a04", "#0d9488", "#dc2626"];
export const shopColor = (id: number) => SHOP_COLORS[(id - 1) % SHOP_COLORS.length];

export function ShopChip({ shop, className }: { shop: ShopRef; className?: string }) {
  const logo = useLogos().shopLogo(shop.id);
  if (logo) {
    return (
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="size-full object-contain p-px" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        className
      )}
      style={{ background: shopColor(shop.id) }}
    >
      {shop.code.slice(0, 3)}
    </span>
  );
}

export function ShopBadge({ shop }: { shop?: ShopRef | null }) {
  if (!shop) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-fg-2">
      <span className="size-2 rounded-full" style={{ background: shopColor(shop.id) }} />
      {shop.name}
    </span>
  );
}

const itemClass =
  "flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] outline-none select-none data-[highlighted]:bg-surface-2";

export function ShopSwitcher({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const { shops, currentShop, isAll, isAdmin, setScope } = useShopScope();

  const face = currentShop ? (
    <ShopChip shop={currentShop} />
  ) : (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-accent">
      <LayoutGrid className="size-3.5" />
    </span>
  );
  const title = isAll ? "All shops" : currentShop?.name || "Your shop";
  const subtitle = isAll
    ? `${shops.length} ${shops.length === 1 ? "shop" : "shops"} · business overview`
    : isAdmin
      ? `Shop ${currentShop?.code}`
      : "Your shop";

  // Managers work in one shop: show it, nothing to switch
  if (!isAdmin) {
    return (
      <Tooltip content={title} disabled={!collapsed}>
        <div className={cn("flex items-center gap-2.5 rounded-lg px-1.5 py-1.5", collapsed && "justify-center px-0")}>
          {face}
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{title}</span>
              <span className="block truncate text-[11.5px] text-fg-3">{subtitle}</span>
            </span>
          )}
        </div>
      </Tooltip>
    );
  }

  return (
    <Dropdown.Root modal={false}>
      <Tooltip content={`${title} · switch shop`} disabled={!collapsed}>
        <Dropdown.Trigger
          aria-label="Switch shop"
          className={cn(
            "pressable flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface p-1.5 text-left shadow-card outline-none hover:border-border-strong data-[state=open]:border-border-strong dark:bg-surface-2",
            collapsed && "size-10 justify-center border-transparent bg-transparent p-0 shadow-none dark:bg-transparent"
          )}
        >
          {face}
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{title}</span>
                <span className="block truncate text-[11.5px] text-fg-3">{subtitle}</span>
              </span>
              <ChevronsUpDown className="mr-0.5 size-4 shrink-0 text-fg-3" />
            </>
          )}
        </Dropdown.Trigger>
      </Tooltip>
      <Dropdown.Portal>
        <Dropdown.Content
          side={collapsed ? "right" : "bottom"}
          align="start"
          sideOffset={6}
          className="popover z-50 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-pop"
        >
          <Dropdown.Item className={itemClass} onSelect={() => setScope("all")}>
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-soft text-accent">
              <LayoutGrid className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">All shops</span>
              <span className="block text-xs text-fg-3">Business overview</span>
            </span>
            {isAll && <Check className="size-4 text-accent" />}
          </Dropdown.Item>
          <Dropdown.Separator className="mx-1 my-1 h-px bg-border" />
          <Dropdown.Label className="px-2 pt-1 pb-1 text-[11px] font-semibold tracking-[0.06em] text-fg-3 uppercase">
            Shops
          </Dropdown.Label>
          {shops.map((shop) => (
            <Dropdown.Item key={shop.id} className={itemClass} onSelect={() => setScope(shop.id)}>
              <ShopChip shop={shop} className={shop.isActive ? "" : "opacity-40"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{shop.name}</span>
                <span className="block truncate text-xs text-fg-3">
                  {shop.isActive ? (shop.manager ? shop.manager.firstName : "No manager") : "Inactive"}
                </span>
              </span>
              {currentShop?.id === shop.id && <Check className="size-4 text-accent" />}
            </Dropdown.Item>
          ))}
          {shops.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-2 text-[13px] text-fg-3">
              <Store className="size-4" /> No shops yet. Add a manager to open one.
            </div>
          )}
          <Dropdown.Separator className="mx-1 my-1 h-px bg-border" />
          <Dropdown.Item
            className={itemClass}
            onSelect={() => {
              router.push("/users");
              onNavigate?.();
            }}
          >
            <Settings2 className="size-4 text-fg-3" /> Manage shops & managers
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
