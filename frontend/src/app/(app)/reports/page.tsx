"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgePercent, BarChart3, IndianRupee, Landmark, PackagePlus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Guard } from "@/components/layout/guard";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableSkeleton, Td, Th, Tr } from "@/components/ui/table";
import { get } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, inr, isoDay, label, num, plural } from "@/lib/format";
import { P } from "@/lib/permissions";
import { ShopBadge } from "@/components/layout/shop-switcher";
import { useShopScope } from "@/lib/shop";

type SalesReport = {
  summary: {
    invoiceCount: number;
    sales: number;
    // GST invoices and bills without GST
    gstCount: number;
    gstSales: number;
    nonGstCount: number;
    nonGstSales: number;
    tax: number;
    discount: number;
    cost?: number;
    profit?: number;
    due: number;
    purchaseCount: number;
    purchaseTotal: number;
    gstPurchaseTotal: number;
    nonGstPurchaseTotal: number;
  };
  daily: { day: string; invoiceCount: number; sales: number; tax: number; profit?: number }[];
  topProducts: { productId: number; name: string; sku: string; quantity: number; sales: number; profit?: number }[];
  // net of refunds given in the period
  payments: { paymentMode: string; amount: number; refunded?: number }[];
  byShop?:
    | {
        shopId: number;
        name: string;
        code: string;
        invoiceCount: number;
        sales: number;
        tax: number;
        profit?: number;
        due: number;
      }[]
    | null;
};

type GstRow = { taxPercent: number; taxable: number; cgst: number; sgst: number; igst: number; tax: number };
// GST paid on purchases with GST
type GstInputRow = { taxPercent: number; taxable: number; tax: number };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

const PRESETS = [
  { label: "Today", from: () => isoDay(), to: () => isoDay() },
  { label: "7 days", from: () => daysAgo(6), to: () => isoDay() },
  { label: "30 days", from: () => daysAgo(29), to: () => isoDay() },
  {
    label: "This month",
    from: () => {
      const d = new Date();
      return isoDay(new Date(d.getFullYear(), d.getMonth(), 1));
    },
    to: () => isoDay(),
  },
];

function Reports() {
  const { isAll, currentShop } = useShopScope();
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDay() });
  const [preset, setPreset] = useState("30 days");

  const { data, isLoading } = useQuery({
    queryKey: ["report", "sales", range],
    queryFn: () => get<SalesReport>("/report/sales", range),
  });
  const { data: gst = [] } = useQuery({
    queryKey: ["report", "gst", range],
    queryFn: () => get<GstRow[]>("/report/gst", range),
  });
  const { data: gstInput = [] } = useQuery({
    queryKey: ["report", "gst-input", range],
    queryFn: () => get<GstInputRow[]>("/report/gst-input", range),
  });

  const showProfit = data?.summary.profit !== undefined;
  const margin =
    showProfit && data!.summary.sales - data!.summary.tax > 0
      ? (data!.summary.profit! / (data!.summary.sales - data!.summary.tax)) * 100
      : null;
  const paymentTotal = data?.payments.reduce((a, b) => a + b.amount, 0) || 0;
  const refundTotal = data?.payments.reduce((a, b) => a + (b.refunded || 0), 0) || 0;
  const hasIgst = gst.some((g) => g.igst);

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          isAll
            ? "Sales, profit, GST and collections across all shops."
            : `Sales, profit, GST and collections for ${currentShop?.name ?? "your shop"}.`
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-surface p-0.5 shadow-card">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setPreset(p.label);
                setRange({ from: p.from(), to: p.to() });
              }}
              className={cn(
                "pressable h-8 rounded-md px-3 text-[13px] font-medium",
                preset === p.label ? "bg-surface-2 text-fg" : "text-fg-3 hover:text-fg"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => {
              setPreset("");
              setRange((r) => ({ ...r, from: e.target.value }));
            }}
            className="w-auto"
            aria-label="From date"
          />
          <span className="text-fg-3">–</span>
          <Input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => {
              setPreset("");
              setRange((r) => ({ ...r, to: e.target.value }));
            }}
            className="w-auto"
            aria-label="To date"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sales"
          icon={<IndianRupee />}
          value={inr(data?.summary.sales)}
          hint={plural(data?.summary.invoiceCount, "invoice")}
        />
        {showProfit ? (
          <Stat
            label="Gross profit"
            icon={<TrendingUp />}
            tone="success"
            value={inr(data?.summary.profit)}
            hint={margin !== null ? `${margin.toFixed(1)}% margin before GST` : "—"}
          />
        ) : (
          <Stat label="Discounts given" icon={<BadgePercent />} tone="warning" value={inr(data?.summary.discount)} />
        )}
        <Stat
          label="GST collected"
          icon={<Landmark />}
          tone="neutral"
          value={inr(data?.summary.tax)}
          hint={`On GST invoices · ${gst.some((g) => g.igst) ? "CGST + SGST + IGST" : "CGST + SGST"}`}
        />
        <Stat
          label="Purchases"
          icon={<PackagePlus />}
          tone="neutral"
          value={inr(data?.summary.purchaseTotal)}
          hint={plural(data?.summary.purchaseCount, "bill")}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Day by day" />
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th align="right">Invoices</Th>
                <Th align="right">Sales</Th>
                <Th align="right">GST</Th>
                {showProfit && <Th align="right">Profit</Th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={showProfit ? 5 : 4} rows={5} />
              ) : !data?.daily.length ? (
                <tr>
                  <td colSpan={5}>
                    <Empty icon={<BarChart3 />} title="No sales in this period" />
                  </td>
                </tr>
              ) : (
                data.daily.map((d) => (
                  <Tr key={d.day}>
                    <Td className="text-fg-2">{date(d.day)}</Td>
                    <Td align="right">{d.invoiceCount}</Td>
                    <Td align="right" className="font-medium">
                      {inr(d.sales)}
                    </Td>
                    <Td align="right" className="text-fg-2">
                      {inr(d.tax)}
                    </Td>
                    {showProfit && (
                      <Td align="right" className={d.profit! < 0 ? "text-danger" : ""}>
                        {inr(d.profit)}
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="With and without GST" description="One stock; tax only on the GST side" />
            <Table>
              <thead>
                <tr>
                  <Th />
                  <Th align="right">With GST</Th>
                  <Th align="right">Without GST</Th>
                </tr>
              </thead>
              <tbody>
                <Tr>
                  <Td className="text-fg-2">Sales</Td>
                  <Td align="right">
                    <div className="font-medium">{inr(data?.summary.gstSales)}</div>
                    <div className="text-xs text-fg-3">{plural(data?.summary.gstCount, "invoice")}</div>
                  </Td>
                  <Td align="right">
                    <div className="font-medium">{inr(data?.summary.nonGstSales)}</div>
                    <div className="text-xs text-fg-3">{plural(data?.summary.nonGstCount, "bill")}</div>
                  </Td>
                </Tr>
                <Tr>
                  <Td className="text-fg-2">Purchases</Td>
                  <Td align="right" className="font-medium">
                    {inr(data?.summary.gstPurchaseTotal)}
                  </Td>
                  <Td align="right" className="font-medium">
                    {inr(data?.summary.nonGstPurchaseTotal)}
                  </Td>
                </Tr>
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="Payments received"
              description={refundTotal ? `${inr(paymentTotal)} after ${inr(refundTotal)} refunded` : inr(paymentTotal)}
            />
            {data?.payments.length ? (
              <ul className="space-y-3 px-5 pb-5">
                {data.payments.map((p) => {
                  const share = paymentTotal > 0 ? Math.max(0, (p.amount / paymentTotal) * 100) : 0;
                  return (
                    <li key={p.paymentMode}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="text-fg-2">
                          {label(p.paymentMode)}
                          {!!p.refunded && <span className="text-fg-3"> · {inr(p.refunded)} refunded</span>}
                        </span>
                        <span className="tabular font-medium">
                          {inr(p.amount)} <span className="text-fg-3">· {share.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-[13px] text-fg-3">No payments in this period.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="GST on sales"
              description={
                hasIgst
                  ? "GST invoices only. CGST + SGST within the state, IGST to other states"
                  : "GST invoices only, split equally into CGST and SGST"
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th>Rate</Th>
                  <Th align="right">Taxable</Th>
                  <Th align="right">CGST</Th>
                  <Th align="right">SGST</Th>
                  {hasIgst && <Th align="right">IGST</Th>}
                </tr>
              </thead>
              <tbody>
                {gst.length === 0 ? (
                  <tr>
                    <Td colSpan={hasIgst ? 5 : 4} className="text-[13px] text-fg-3">
                      No taxable sales.
                    </Td>
                  </tr>
                ) : (
                  gst.map((g) => (
                    <Tr key={g.taxPercent}>
                      <Td>{g.taxPercent}%</Td>
                      <Td align="right">{inr(g.taxable)}</Td>
                      <Td align="right">{inr(g.cgst)}</Td>
                      <Td align="right">{inr(g.sgst)}</Td>
                      {hasIgst && <Td align="right">{inr(g.igst)}</Td>}
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="GST on purchases" description="Input tax on supplier bills with GST" />
            <Table>
              <thead>
                <tr>
                  <Th>Rate</Th>
                  <Th align="right">Taxable</Th>
                  <Th align="right">GST paid</Th>
                </tr>
              </thead>
              <tbody>
                {gstInput.length === 0 ? (
                  <tr>
                    <Td colSpan={3} className="text-[13px] text-fg-3">
                      No purchases with GST.
                    </Td>
                  </tr>
                ) : (
                  gstInput.map((g) => (
                    <Tr key={g.taxPercent}>
                      <Td>{g.taxPercent}%</Td>
                      <Td align="right">{inr(g.taxable)}</Td>
                      <Td align="right">{inr(g.tax)}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>

      {data?.byShop && data.byShop.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="By shop" description="Every shop for the same period" />
          <Table>
            <thead>
              <tr>
                <Th>Shop</Th>
                <Th align="right">Invoices</Th>
                <Th align="right">Sales</Th>
                <Th align="right">GST</Th>
                {showProfit && <Th align="right">Profit</Th>}
                <Th align="right">Still due</Th>
              </tr>
            </thead>
            <tbody>
              {data.byShop.map((s) => (
                <Tr key={s.shopId}>
                  <Td>
                    <ShopBadge shop={{ id: s.shopId, name: s.name, code: s.code }} />
                  </Td>
                  <Td align="right">{s.invoiceCount}</Td>
                  <Td align="right" className="font-medium">
                    {inr(s.sales)}
                  </Td>
                  <Td align="right" className="text-fg-2">
                    {inr(s.tax)}
                  </Td>
                  {showProfit && <Td align="right">{inr(s.profit)}</Td>}
                  <Td align="right" className={s.due ? "text-warning" : "text-fg-3"}>
                    {inr(s.due)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="Best sellers" description="By sales value in this period" />
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th align="right">Units sold</Th>
              <Th align="right">Sales</Th>
              {showProfit && <Th align="right">Profit</Th>}
            </tr>
          </thead>
          <tbody>
            {!data?.topProducts.length ? (
              <tr>
                <Td colSpan={4} className="text-[13px] text-fg-3">
                  Nothing sold yet in this period.
                </Td>
              </tr>
            ) : (
              data.topProducts.map((p) => (
                <Tr key={`${p.productId}-${p.sku}`}>
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-fg-3">{p.sku}</div>
                  </Td>
                  <Td align="right">{num(p.quantity)}</Td>
                  <Td align="right" className="font-medium">
                    {inr(p.sales)}
                  </Td>
                  {showProfit && <Td align="right">{inr(p.profit)}</Td>}
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

export default function ReportsPage() {
  return (
    <Guard permissions={[P.REPORT_VIEW]}>
      <Reports />
    </Guard>
  );
}
