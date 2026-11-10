import {
  ChartColumnBig,
  LayoutGrid,
  Package,
  PackagePlus,
  ReceiptText,
  Settings2,
  Store,
  Tags,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { P, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permissions?: Permission[];
  adminOnly?: boolean;
  badge?: "lowStock";
};

export type NavGroup = { label?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid, permissions: [P.DASHBOARD_VIEW] }],
  },
  {
    label: "Sales",
    items: [
      { href: "/invoices", label: "Invoices", icon: ReceiptText, permissions: [P.INVOICE_VIEW] },
      { href: "/customers", label: "Customers", icon: Users, permissions: [P.CUSTOMER_VIEW] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/products", label: "Products", icon: Package, permissions: [P.PRODUCT_VIEW] },
      { href: "/stock", label: "Stock", icon: Warehouse, permissions: [P.STOCK_VIEW], badge: "lowStock" },
      { href: "/categories", label: "Categories & brands", icon: Tags, permissions: [P.CATEGORY_BRAND_MANAGE] },
    ],
  },
  {
    label: "Purchases",
    items: [
      { href: "/purchases", label: "Purchases", icon: PackagePlus, permissions: [P.PURCHASE_VIEW] },
      { href: "/suppliers", label: "Suppliers", icon: Truck, permissions: [P.SUPPLIER_VIEW] },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/reports", label: "Reports", icon: ChartColumnBig, permissions: [P.REPORT_VIEW] },
      { href: "/users", label: "Shops & managers", icon: Store, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];
