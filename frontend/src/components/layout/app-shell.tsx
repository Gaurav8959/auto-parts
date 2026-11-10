"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut, Menu, MonitorSmartphone, PanelLeftClose, PanelLeftOpen, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage, get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { fullName } from "@/lib/format";
import { P } from "@/lib/permissions";
import { useStoredValue } from "@/lib/storage";
import type { ShopSettings } from "@/lib/types";
import { Tooltip } from "../ui/tooltip";
import { LogoMark } from "./logo";
import { useLogos } from "@/lib/logos";
import { NAV, type NavItem } from "./nav";
import { ShopPickerHost } from "./shop-picker-host";
import { ShopSwitcher } from "./shop-switcher";
import { ThemeToggle, ThemeToggleButton } from "./theme-toggle";

type StockSummary = { outOfStock: number; lowStock: number };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
        "bg-[linear-gradient(135deg,#f59e0b,#ef4444)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Tooltip content={badge ? `${item.label} · ${badge} need reorder` : item.label} disabled={!collapsed}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/item relative flex h-9 items-center gap-3 rounded-lg px-[9px] text-[13.5px] font-medium",
          "transition-[background-color,color,box-shadow] duration-150 ease-out",
          active
            ? "bg-surface text-fg shadow-card ring-1 ring-border dark:bg-surface-2"
            : "text-fg-2 hover:bg-fg/[0.045] hover:text-fg dark:hover:bg-white/[0.04]"
        )}
      >
        <span className="relative">
          <Icon
            className={cn(
              "size-[18px] shrink-0 transition-colors duration-150",
              active ? "text-accent" : "text-fg-3 group-hover/item:text-fg-2"
            )}
            strokeWidth={active ? 2.1 : 1.8}
          />
          {!!badge && collapsed && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-warning ring-2 ring-bg" />
          )}
        </span>
        <span className={cn("truncate transition-opacity duration-150", collapsed && "opacity-0")}>{item.label}</span>
        {!!badge && !collapsed && (
          <span className="ml-auto rounded-full bg-warning-soft px-1.5 py-px text-[11px] font-semibold tabular text-warning">
            {badge}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, isAdmin, logout, signOutOtherDevices } = useAuth();
  const router = useRouter();
  const name = fullName(user);

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger
        className={cn(
          "pressable flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-fg/[0.045] data-[state=open]:bg-fg/[0.06] dark:hover:bg-white/[0.04]",
          collapsed && "justify-center"
        )}
        aria-label="Account menu"
      >
        <Avatar name={name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-fg">{name}</span>
              <span className="block truncate text-xs text-fg-3">{isAdmin ? "Admin · full access" : "Manager"}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-fg-3" />
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={8}
          className="popover z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl border border-border bg-surface p-1 shadow-pop"
        >
          <div className="px-2.5 pt-2 pb-2.5">
            <div className="truncate text-[13px] font-medium">{name}</div>
            <div className="truncate text-xs text-fg-3">{user?.email}</div>
          </div>
          <Dropdown.Separator className="mx-1 my-1 h-px bg-border" />
          <Dropdown.Item
            onSelect={() => router.push("/settings")}
            className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none select-none data-[highlighted]:bg-surface-2"
          >
            <UserRound className="size-4 text-fg-3" /> Profile & password
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={() =>
              signOutOtherDevices().then(
                () => toast.success("Signed out on every other device. You stay signed in here."),
                (e) => toast.error(errorMessage(e))
              )
            }
            className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none select-none data-[highlighted]:bg-surface-2"
          >
            <MonitorSmartphone className="size-4 text-fg-3" /> Sign out other devices
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={logout}
            className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-danger outline-none select-none data-[highlighted]:bg-danger-soft"
          >
            <LogOut className="size-4" /> Sign out
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, can } = useAuth();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => get<ShopSettings>("/settings") });
  const logos = useLogos();
  const { data: stock } = useQuery({
    queryKey: ["stock", "summary"],
    queryFn: () => get<StockSummary>("/inventory/summary"),
    enabled: can(P.STOCK_VIEW),
    refetchInterval: 60_000,
  });
  const lowStock = (stock?.outOfStock || 0) + (stock?.lowStock || 0);

  const groups = useMemo(
    () =>
      NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => (item.adminOnly ? isAdmin : !item.permissions || can(...item.permissions))),
      })).filter((group) => group.items.length),
    [isAdmin, can]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 px-3", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <Tooltip content="Expand sidebar">
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="group/logo pressable relative rounded-[10px]"
            >
              <LogoMark src={logos.business} className="transition-opacity duration-150 group-hover/logo:opacity-0" />
              <span className="absolute inset-0 flex items-center justify-center rounded-[10px] text-fg-2 opacity-0 ring-1 ring-border transition-opacity duration-150 group-hover/logo:opacity-100">
                <PanelLeftOpen className="size-4" />
              </span>
            </button>
          </Tooltip>
        ) : (
          <>
            <LogoMark src={logos.business} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] leading-tight font-semibold tracking-tight">
                {settings?.shopName || "Auto Parts"}
              </div>
              <div className="truncate text-[11.5px] text-fg-3">Inventory & billing</div>
            </div>
            {onToggleCollapse && (
              <Tooltip content="Collapse sidebar" side="bottom">
                <button
                  onClick={onToggleCollapse}
                  aria-label="Collapse sidebar"
                  className="pressable rounded-md p-1.5 text-fg-3 hover:bg-fg/[0.06] hover:text-fg"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      {/* Shop: the admin switches between shops; a manager sees their own */}
      <div className={cn("px-3 pb-3", collapsed && "flex justify-center px-0")}>
        <ShopSwitcher collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {/* Primary action */}
      {can(P.INVOICE_CREATE) && (
        <div className={cn("px-3 pb-3", collapsed && "flex justify-center px-0")}>
          <Tooltip content="New invoice" disabled={!collapsed}>
            <button
              onClick={() => {
                router.push("/invoices/new");
                onNavigate?.();
              }}
              aria-label="New invoice"
              className={cn(
                "pressable flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-primary-fg shadow-button hover:bg-primary-hover",
                collapsed ? "w-9" : "w-full"
              )}
            >
              <Plus className="size-4" strokeWidth={2.4} />
              {!collapsed && "New invoice"}
            </button>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-x-hidden overflow-y-auto pb-3", collapsed ? "px-[14px]" : "px-3")}>
        {groups.map((group, i) => (
          <div key={group.label || i} className={i > 0 ? "mt-4" : ""}>
            {group.label && (
              <div className="relative mb-1 h-6">
                <span
                  className={cn(
                    "absolute inset-0 flex items-center px-[9px] text-[11px] font-semibold tracking-[0.06em] text-fg-3 uppercase transition-opacity duration-150",
                    collapsed && "opacity-0"
                  )}
                >
                  {group.label}
                </span>
                <span
                  className={cn(
                    "absolute top-1/2 right-2 left-2 h-px bg-border transition-opacity duration-150",
                    collapsed ? "opacity-100" : "opacity-0"
                  )}
                />
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    collapsed={collapsed}
                    active={
                      isActive(pathname, item.href) && !(item.href === "/invoices" && pathname === "/invoices/new")
                    }
                    badge={item.badge === "lowStock" ? lowStock : undefined}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: theme + account */}
      <div className={cn("space-y-2 border-t border-border p-3", collapsed && "flex flex-col items-center px-0")}>
        {collapsed ? <ThemeToggleButton /> : <ThemeToggle />}
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedValue, setCollapsed] = useStoredValue<"0" | "1">("ap_sidebar_collapsed", "0");
  const collapsed = collapsedValue === "1";

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  // the canvas scrolls, not the window, so reset it on navigation
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside
        className={cn(
          "no-print hidden shrink-0 overflow-hidden lg:block",
          "transition-[width] duration-200 [transition-timing-function:var(--ease-out)]",
          collapsed ? "w-[68px]" : "w-[252px]"
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(collapsed ? "0" : "1")} />
      </aside>

      <RadixDialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="overlay fixed inset-0 z-50 bg-black/40 lg:hidden" />
          <RadixDialog.Content className="sheet-left fixed inset-y-0 left-0 z-50 w-[272px] border-r border-border bg-bg shadow-modal lg:hidden">
            <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
            <RadixDialog.Description className="sr-only">Main menu</RadixDialog.Description>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <header className="no-print flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg px-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="pressable rounded-lg p-2 text-fg-2 hover:bg-fg/[0.06]"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <LogoMark className="size-7" />
          <span className="flex-1 text-[15px] font-semibold tracking-tight">Auto Parts</span>
          <ThemeToggleButton tooltipSide="bottom" />
        </header>
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto bg-canvas lg:rounded-2xl lg:border lg:border-border lg:shadow-canvas"
        >
          <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
        </main>
        <ShopPickerHost />
      </div>
    </div>
  );
}
