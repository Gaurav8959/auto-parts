"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CheckCircle2, IndianRupee, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Guard } from "@/components/layout/guard";
import { StockAdjustDialog } from "@/components/stock-adjust-dialog";
import { StockHistory } from "@/components/stock-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Stat } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableSkeleton, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr, label, num } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Product } from "@/lib/types";
import { useShopAction, useShopScope } from "@/lib/shop";
import { ShopBadge } from "@/components/layout/shop-switcher";

type StockSummary = {
  totalProducts: number;
  totalUnits: number;
  stockValue?: number;
  retailValue: number;
  outOfStock: number;
  lowStock: number;
};

const TXN_TYPES = ["OPENING", "PURCHASE", "SALE", "SALE_CANCELLED", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"];

function Stock() {
  const { can } = useAuth();
  const { isAll, currentShop, setScope } = useShopScope();
  const shopAction = useShopAction();
  const [tab, setTab] = useState<"low" | "movements">("low");
  const [type, setType] = useState("");
  const [adjusting, setAdjusting] = useState<Product | null | undefined>(undefined);

  const { data: summary } = useQuery({
    queryKey: ["stock", "summary"],
    queryFn: () => get<StockSummary>("/inventory/summary"),
  });
  const { data: low = [], isLoading } = useQuery({
    queryKey: ["stock", "low"],
    queryFn: () => get<Product[]>("/inventory/low-stock"),
  });

  return (
    <>
      <PageHeader
        title="Stock"
        description={
          isAll
            ? "Stock across every shop: what's running out and every movement."
            : `What's on the shelf at ${currentShop?.name ?? "your shop"}, what's running out, and every movement.`
        }
        actions={
          <>
            {can(P.PURCHASE_CREATE) && (
              <Link href="/purchases/new">
                <Button variant="secondary">
                  <ShoppingCart /> Record purchase
                </Button>
              </Link>
            )}
            {can(P.STOCK_ADJUST) && (
              <Button onClick={() => shopAction("adjust stock", () => setAdjusting(null))}>
                <Boxes /> Adjust stock
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Products"
          icon={<Package />}
          value={num(summary?.totalProducts)}
          hint={`${num(summary?.totalUnits)} units on hand`}
        />
        {can(P.PRODUCT_VIEW_COST) && (
          <Stat
            label="Stock value (cost)"
            icon={<IndianRupee />}
            value={inr(summary?.stockValue)}
            hint="At average purchase cost"
          />
        )}
        <Stat
          label="Stock value (retail)"
          icon={<IndianRupee />}
          tone="success"
          value={inr(summary?.retailValue)}
          hint="At selling price"
        />
        <Stat
          label="Needs reorder"
          icon={<AlertTriangle />}
          tone={summary?.outOfStock ? "danger" : summary?.lowStock ? "warning" : "success"}
          value={num((summary?.outOfStock || 0) + (summary?.lowStock || 0))}
          hint={`${summary?.outOfStock ?? 0} out of stock`}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border pr-3">
          <Tabs
            className="border-b-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "low", label: "Running low", count: low.length },
              { value: "movements", label: "Movements" },
            ]}
          />
          {tab === "movements" && (
            <Select value={type} onChange={(e) => setType(e.target.value)} className="h-8 w-auto text-[13px]">
              <option value="">All types</option>
              {TXN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </Select>
          )}
        </div>

        {tab === "low" ? (
          <Table>
            <thead>
              <tr>
                {isAll && <Th>Shop</Th>}
                <Th>Product</Th>
                <Th>Rack</Th>
                <Th align="right">In stock</Th>
                <Th align="right">Reorder at</Th>
                <Th align="right">Status</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={6} rows={4} />
              ) : low.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty
                      icon={<CheckCircle2 />}
                      title="Everything is stocked"
                      description="No product is at or below its reorder level."
                    />
                  </td>
                </tr>
              ) : (
                low.map((p) => (
                  <Tr key={`${p.shop?.id}-${p.id}`}>
                    {isAll && (
                      <Td>
                        <ShopBadge shop={p.shop} />
                      </Td>
                    )}
                    <Td>
                      <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-fg-3">
                        <span className="font-mono">{p.sku}</span>
                        {p.brand && ` · ${p.brand.name}`}
                      </div>
                    </Td>
                    <Td className="font-mono text-[13px] text-fg-2">{p.rackLocation || "—"}</Td>
                    <Td align="right" className="font-medium">
                      {p.stockQuantity} {p.unit}
                    </Td>
                    <Td align="right" className="text-fg-2">
                      {p.reorderLevel}
                    </Td>
                    <Td align="right">
                      {p.stockQuantity <= 0 ? (
                        <Badge tone="danger">Out of stock</Badge>
                      ) : (
                        <Badge tone="warning">Low</Badge>
                      )}
                    </Td>
                    <Td align="right">
                      {can(P.STOCK_ADJUST) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // the row already says which shop
                            if (isAll && p.shop) setScope(p.shop.id);
                            setAdjusting(p);
                          }}
                        >
                          Adjust
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        ) : (
          <StockHistory showProduct showShop={isAll} type={type || undefined} />
        )}
      </Card>

      <StockAdjustDialog
        open={adjusting !== undefined}
        onOpenChange={(o) => !o && setAdjusting(undefined)}
        product={adjusting}
      />
    </>
  );
}

export default function StockPage() {
  return (
    <Guard permissions={[P.STOCK_VIEW]}>
      <Stock />
    </Guard>
  );
}
