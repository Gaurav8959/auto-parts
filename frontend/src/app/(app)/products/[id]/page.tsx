"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Boxes, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Guard } from "@/components/layout/guard";
import { ProductForm } from "@/components/product-form";
import { StockAdjustDialog } from "@/components/stock-adjust-dialog";
import { StockHistory } from "@/components/stock-history";
import { Badge, StockBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Product } from "@/lib/types";
import { useShopAction, useShopScope } from "@/lib/shop";
import { ShopBadge } from "@/components/layout/shop-switcher";
import { Table, Td, Th, Tr } from "@/components/ui/table";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children || "—"}</dd>
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { can, isAdmin } = useAuth();
  const { isAll, currentShop } = useShopScope();
  const shopAction = useShopAction();
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", Number(id)],
    queryFn: () => get<Product>(`/catalog/products/${id}`),
  });

  if (isLoading || !p) return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />;

  const margin = p.purchasePrice !== undefined ? p.sellingPrice / (1 + p.taxPercent / 100) - p.purchasePrice : null;

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-3.5" /> Products
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight">{p.name}</h1>
            {!p.isActive && <Badge>Inactive</Badge>}
          </div>
          <p className="mt-1 text-sm text-fg-3">
            <span className="font-mono">{p.sku}</span>
            {p.partNumber && (
              <>
                {" "}
                · Part no. <span className="font-mono">{p.partNumber}</span>
              </>
            )}
            {p.brand && <> · {p.brand.name}</>}
          </p>
        </div>
        <div className="flex gap-2">
          {can(P.STOCK_ADJUST) && (
            <Button variant="secondary" onClick={() => shopAction("adjust stock", () => setAdjustOpen(true))}>
              <Boxes /> Adjust stock
            </Button>
          )}
          {can(P.PRODUCT_UPDATE) && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-[13px] text-fg-3">
            {isAll ? "In stock across all shops" : `In stock at ${currentShop?.name ?? "your shop"}`}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight">{p.stockQuantity}</span>
            <span className="text-sm text-fg-3">{p.unit}</span>
          </div>
          <div className="mt-3">
            <StockBadge quantity={p.stockQuantity} reorderLevel={p.reorderLevel} unit={p.unit} />
          </div>
          {!isAll && (
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
              <Detail label="Reorder at">
                {p.reorderLevel} {p.unit}
              </Detail>
              <Detail label="Rack / bin">{p.rackLocation}</Detail>
            </dl>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Detail label="Selling price (incl. GST)">
              <span className="font-medium tabular">{inr(p.sellingPrice)}</span>
            </Detail>
            <Detail label="MRP">{p.mrp ? inr(p.mrp) : null}</Detail>
            {p.avgCost !== undefined && <Detail label="Avg. cost (this view)">{inr(p.avgCost)}</Detail>}
            {p.purchasePrice !== undefined && <Detail label="Last purchase price">{inr(p.purchasePrice)}</Detail>}
            {margin !== null && (
              <Detail label="Margin per unit">
                <span className={margin < 0 ? "text-danger" : ""}>{inr(margin)}</span>
              </Detail>
            )}
            <Detail label="GST">{p.taxPercent}%</Detail>
            <Detail label="HSN">{p.hsnCode && <span className="font-mono">{p.hsnCode}</span>}</Detail>
            <Detail label="Category">{p.category?.name}</Detail>
            <Detail label="Brand">{p.brand?.name}</Detail>
            <Detail label="Unit">{p.unit}</Detail>
          </dl>
          {(p.vehicleCompatibility || p.description) && (
            <dl className="mt-5 grid gap-4 border-t border-border pt-4">
              {p.vehicleCompatibility && <Detail label="Fits vehicles">{p.vehicleCompatibility}</Detail>}
              {p.description && <Detail label="Notes">{p.description}</Detail>}
            </dl>
          )}
        </Card>
      </div>

      {isAdmin && (
        <Card className="mt-4">
          <CardHeader title="Stock by shop" description="Each shop keeps its own quantity, rack and average cost." />
          {p.stockByShop?.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Shop</Th>
                  <Th>Rack</Th>
                  <Th align="right">Reorder at</Th>
                  {p.purchasePrice !== undefined && <Th align="right">Avg cost</Th>}
                  <Th align="right">In stock</Th>
                </tr>
              </thead>
              <tbody>
                {p.stockByShop.map((row) => (
                  <Tr key={row.shop.id}>
                    <Td>
                      <ShopBadge shop={row.shop} />
                    </Td>
                    <Td className="font-mono text-[13px] text-fg-2">{row.rackLocation || "—"}</Td>
                    <Td align="right" className="text-fg-2">
                      {row.reorderLevel}
                    </Td>
                    {p.purchasePrice !== undefined && (
                      <Td align="right" className="text-fg-2">
                        {inr(row.avgCost)}
                      </Td>
                    )}
                    <Td align="right">
                      <StockBadge quantity={row.quantity} reorderLevel={row.reorderLevel} unit={p.unit} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="border-t border-border px-5 py-4 text-[13px] text-fg-3">
              No shop has stocked this product yet.
            </p>
          )}
        </Card>
      )}

      {can(P.STOCK_VIEW) && (
        <Card className="mt-4">
          <CardHeader
            title="Stock history"
            description={isAll ? "Every unit in and out, in every shop." : "Every unit in and out of this product."}
          />
          <StockHistory productId={p.id} showShop={isAll} />
        </Card>
      )}

      <ProductForm open={editOpen} onOpenChange={setEditOpen} product={p} />
      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} product={p} />
    </>
  );
}

export default function ProductDetailPage() {
  return (
    <Guard permissions={[P.PRODUCT_VIEW]}>
      <ProductDetail />
    </Guard>
  );
}
