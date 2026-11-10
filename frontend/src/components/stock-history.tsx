"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clean, getPaged } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateTime, fullName, label } from "@/lib/format";
import type { StockTxn } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Empty } from "./ui/empty";
import { Pagination } from "./ui/pagination";
import { Table, TableSkeleton, Td, Th, Tr } from "./ui/table";
import { ShopBadge } from "./layout/shop-switcher";

const typeTone: Record<string, "success" | "danger" | "neutral" | "accent" | "warning"> = {
  OPENING: "neutral",
  PURCHASE: "success",
  SALE: "accent",
  SALE_CANCELLED: "warning",
  ADJUSTMENT_IN: "success",
  ADJUSTMENT_OUT: "danger",
};

const referenceHref = (t: StockTxn) => {
  if (t.referenceType === "INVOICE" && t.referenceId) return `/invoices/${t.referenceId}`;
  if (t.referenceType === "PURCHASE" && t.referenceId) return `/purchases/${t.referenceId}`;
  return null;
};

export function StockHistory({
  productId,
  type,
  showProduct,
  showShop,
}: {
  productId?: number;
  type?: string;
  showProduct?: boolean;
  showShop?: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["stock", "transactions", productId, type, page],
    queryFn: () => getPaged<StockTxn>("/inventory/transactions", clean({ productId, type, page, limit: 20 })),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            {showShop && <Th>Shop</Th>}
            {showProduct && <Th>Product</Th>}
            <Th>Type</Th>
            <Th>Reference</Th>
            <Th align="right">Change</Th>
            <Th align="right">Balance</Th>
            <Th>By</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton cols={6 + (showProduct ? 1 : 0) + (showShop ? 1 : 0)} rows={5} />
          ) : !data?.data.length ? (
            <tr>
              <td colSpan={8}>
                <Empty icon={<History />} title="No stock movements yet" />
              </td>
            </tr>
          ) : (
            data.data.map((t) => {
              const href = referenceHref(t);
              return (
                <Tr key={t.id}>
                  <Td className="whitespace-nowrap text-fg-2">{dateTime(t.createdAt)}</Td>
                  {showShop && (
                    <Td>
                      <ShopBadge shop={t.shop} />
                    </Td>
                  )}
                  {showProduct && (
                    <Td>
                      <Link href={`/products/${t.product.id}`} className="font-medium hover:underline">
                        {t.product.name}
                      </Link>
                      <div className="font-mono text-xs text-fg-3">{t.product.sku}</div>
                    </Td>
                  )}
                  <Td>
                    <Badge tone={typeTone[t.type]}>{label(t.type)}</Badge>
                  </Td>
                  <Td className="text-[13px] text-fg-2">
                    {href ? (
                      <Link href={href} className="font-mono text-accent hover:underline">
                        {t.referenceNo}
                      </Link>
                    ) : (
                      <span>{t.referenceNo ? label(t.referenceNo) : "—"}</span>
                    )}
                    {t.note && <div className="max-w-56 truncate text-xs text-fg-3">{t.note}</div>}
                  </Td>
                  <Td align="right" className={cn("font-medium", t.quantity > 0 ? "text-success" : "text-danger")}>
                    {t.quantity > 0 ? "+" : ""}
                    {t.quantity}
                  </Td>
                  <Td align="right">{t.balanceAfter}</Td>
                  <Td className="text-[13px] text-fg-2">{fullName(t.createdBy)}</Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
      <Pagination pagination={data?.pagination} onPage={setPage} />
    </>
  );
}
