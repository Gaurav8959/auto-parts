"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, IndianRupee, Plus, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Guard } from "@/components/layout/guard";
import { SalesChart } from "@/components/sales-chart";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, inr, num, plural } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Invoice, Product } from "@/lib/types";
import { useShopScope } from "@/lib/shop";
import { ShopBadge, ShopChip, shopColor } from "@/components/layout/shop-switcher";
import { Table, Td, Th, Tr } from "@/components/ui/table";

type Summary = {
  today: { count: number; total: number; profit?: number };
  month: { count: number; total: number; profit?: number };
  stock: { totalProducts: number; stockValue?: number; retailValue: number; outOfStock: number; lowStock: number };
  receivable: number;
  payable: number;
  salesTrend: { day: string; total: number; count: number }[];
  recentInvoices: Invoice[];
  lowStock: Product[];
  // only in the admin's all-shops view
  shops: ShopRow[] | null;
};

type ShopRow = {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  todaySales: number;
  todayInvoices: number;
  monthSales: number;
  monthProfit?: number;
  receivable: number;
  stockAlerts: number;
};

// One row per shop: compare at a glance, click to work inside that shop
function ShopsCard({ shops, onOpen }: { shops: ShopRow[]; onOpen: (id: number) => void }) {
  const best = Math.max(...shops.map((s) => s.monthSales), 1);
  const showProfit = shops.some((s) => s.monthProfit !== undefined);
  return (
    <Card>
      <CardHeader title="Shops" description="This month, side by side. Open a shop to work inside it." />
      <Table>
        <thead>
          <tr>
            <Th>Shop</Th>
            <Th align="right">Today</Th>
            <Th>This month</Th>
            {showProfit && <Th align="right">Profit</Th>}
            <Th align="right">To collect</Th>
            <Th align="right">Stock alerts</Th>
          </tr>
        </thead>
        <tbody>
          {shops.map((shop) => (
            <Tr key={shop.id} onClick={() => onOpen(shop.id)} className={shop.isActive ? "" : "opacity-60"}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <ShopChip shop={shop} />
                  <span className="font-medium">{shop.name}</span>
                  {!shop.isActive && <Badge tone="danger">Closed</Badge>}
                </div>
              </Td>
              <Td align="right">
                <div className="font-medium">{inr(shop.todaySales)}</div>
                <div className="text-xs text-fg-3">{plural(shop.todayInvoices, "bill")}</div>
              </Td>
              <Td className="min-w-48">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(shop.monthSales / best) * 100}%`, background: shopColor(shop.id) }}
                    />
                  </div>
                  <span className="w-28 text-right text-[13px] font-medium tabular">{inr(shop.monthSales)}</span>
                </div>
              </Td>
              {showProfit && <Td align="right">{inr(shop.monthProfit)}</Td>}
              <Td align="right" className={shop.receivable ? "text-warning" : "text-fg-3"}>
                {inr(shop.receivable)}
              </Td>
              <Td align="right">
                {shop.stockAlerts ? (
                  <Badge tone="warning">{shop.stockAlerts}</Badge>
                ) : (
                  <span className="text-fg-3">—</span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function Dashboard() {
  const { user, can } = useAuth();
  const router = useRouter();
  const { isAll, currentShop, shops, setScope } = useShopScope();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get<Summary>("/dashboard"),
  });

  const trendTotal = data?.salesTrend.reduce((a, b) => a + b.total, 0) || 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user?.firstName}
          </h1>
          <p className="mt-1 text-sm text-fg-3">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {isAll
              ? `here's the business across ${plural(shops.length, "shop")}.`
              : `here's how ${currentShop?.name ?? "the shop"} is doing.`}
          </p>
        </div>
        {can(P.INVOICE_CREATE) && (
          // the sidebar carries this action on desktop
          <Button onClick={() => router.push("/invoices/new")} className="lg:hidden">
            <Plus /> New invoice
          </Button>
        )}
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label={isAll ? "Today, all shops" : "Today's sales"}
              icon={<IndianRupee />}
              value={inr(data.today.total)}
              hint={
                <>
                  {plural(data.today.count, "invoice")}
                  {data.today.profit !== undefined && <> · {inr(data.today.profit)} profit</>}
                </>
              }
            />
            <Stat
              label="This month"
              icon={<Receipt />}
              value={inr(data.month.total)}
              hint={
                <>
                  {plural(data.month.count, "invoice")}
                  {data.month.profit !== undefined && <> · {inr(data.month.profit)} profit</>}
                </>
              }
            />
            <Stat
              label="To collect"
              icon={<Wallet />}
              tone="success"
              value={inr(data.receivable)}
              hint={`You owe suppliers ${inr(data.payable)}`}
            />
            <Stat
              label="Stock alerts"
              icon={<AlertTriangle />}
              tone={data.stock.outOfStock ? "danger" : data.stock.lowStock ? "warning" : "success"}
              value={num(data.stock.outOfStock + data.stock.lowStock)}
              hint={`${data.stock.outOfStock} out · ${data.stock.lowStock} running low`}
            />
          </div>

          {data.shops && data.shops.length > 0 && <ShopsCard shops={data.shops} onOpen={setScope} />}

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Sales, last 14 days" description={`${inr(trendTotal)} in total`} />
              <div className="px-5 pb-5">
                <SalesChart data={data.salesTrend} />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Running low"
                description={`${data.stock.totalProducts} active products · ${inr(data.stock.retailValue)} at selling price`}
                action={
                  can(P.STOCK_VIEW) && (
                    <Link
                      href="/stock"
                      className="inline-flex items-center gap-0.5 text-[13px] font-medium text-accent hover:underline"
                    >
                      View all <ArrowUpRight className="size-3.5" />
                    </Link>
                  )
                }
              />
              {data.lowStock.length === 0 ? (
                <Empty title="All stocked up" description="Nothing is below its reorder level." />
              ) : (
                <ul className="px-2 pb-2">
                  {data.lowStock.map((p) => (
                    <li key={`${p.shop?.id}-${p.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{p.name}</div>
                        <div className="truncate font-mono text-xs text-fg-3">
                          {p.sku}
                          {isAll && p.shop ? (
                            <span className="font-sans"> · {p.shop.name}</span>
                          ) : (
                            p.brand && <span className="font-sans"> · {p.brand.name}</span>
                          )}
                        </div>
                      </div>
                      {p.stockQuantity <= 0 ? (
                        <Badge tone="danger">Out</Badge>
                      ) : (
                        <Badge tone="warning">
                          {p.stockQuantity} / {p.reorderLevel}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {can(P.INVOICE_VIEW) && (
            <Card>
              <CardHeader
                title="Recent invoices"
                action={
                  <Link
                    href="/invoices"
                    className="inline-flex items-center gap-0.5 text-[13px] font-medium text-accent hover:underline"
                  >
                    All invoices <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
              {data.recentInvoices.length === 0 ? (
                <Empty icon={<Receipt />} title="No invoices yet" description="Your latest bills will show up here." />
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {data.recentInvoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="flex items-center gap-4 px-5 py-3 transition-colors duration-100 hover:bg-surface-2/70"
                      >
                        <span className="w-24 shrink-0 font-mono text-[13px] text-fg-2">{inv.invoiceNumber}</span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{inv.customerName}</span>
                        {isAll && (
                          <span className="hidden md:block">
                            <ShopBadge shop={inv.shop} />
                          </span>
                        )}
                        <span className="hidden text-[13px] text-fg-3 sm:block">{dateTime(inv.invoiceDate)}</span>
                        {inv.status === "CANCELLED" ? (
                          <Badge>Cancelled</Badge>
                        ) : (
                          <PaymentBadge status={inv.paymentStatus} />
                        )}
                        <span className="w-24 text-right tabular text-[13.5px] font-medium">{inr(inv.grandTotal)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Guard permissions={[P.DASHBOARD_VIEW]}>
      <Dashboard />
    </Guard>
  );
}
