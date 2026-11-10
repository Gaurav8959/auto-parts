"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingCart, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Guard } from "@/components/layout/guard";
import { PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableSkeleton, Td, Th, Tr } from "@/components/ui/table";
import { clean, getPaged } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, inr } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Purchase } from "@/lib/types";
import { useShopScope } from "@/lib/shop";
import { ShopBadge } from "@/components/layout/shop-switcher";

function Purchases() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = useAuth();
  const { isAll } = useShopScope();
  const supplierId = params.get("supplierId") || "";
  const supplierName = params.get("supplierName");

  const [filters, setFilters] = useState({ keyword: "", paymentStatus: "", from: "", to: "", page: 1 });
  const setFilter = (key: keyof typeof filters, value: string) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", filters, supplierId],
    queryFn: () => getPaged<Purchase>("/purchase", clean({ ...filters, supplierId, limit: 25 })),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock coming in from suppliers. Saving a purchase adds the items to stock."
        actions={
          can(P.PURCHASE_CREATE) && (
            <Button onClick={() => router.push("/purchases/new")}>
              <Plus /> Record purchase
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {supplierId && (
            <button
              onClick={() => router.push("/purchases")}
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-[13px] font-medium text-accent"
            >
              {supplierName || "Supplier"} <X className="size-3.5" />
            </button>
          )}
          <SearchInput
            value={filters.keyword}
            onChange={(v) => setFilter("keyword", v)}
            placeholder="Purchase no., bill no. or supplier"
            className="min-w-56 flex-1"
          />
          <Select
            value={filters.paymentStatus}
            onChange={(e) => setFilter("paymentStatus", e.target.value)}
            className="w-auto"
          >
            <option value="">Any payment</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partly paid</option>
            <option value="UNPAID">Unpaid</option>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilter("from", e.target.value)}
              className="w-auto"
              aria-label="From date"
            />
            <span className="text-fg-3">–</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilter("to", e.target.value)}
              className="w-auto"
              aria-label="To date"
            />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Purchase</Th>
              {isAll && <Th>Shop</Th>}
              <Th>Supplier</Th>
              <Th>Date</Th>
              <Th>Payment</Th>
              <Th align="right">Total</Th>
              <Th align="right">Due</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton cols={isAll ? 7 : 6} />
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={7}>
                  <Empty
                    icon={<ShoppingCart />}
                    title="No purchases found"
                    description="Record a purchase when stock arrives from a supplier."
                  />
                </td>
              </tr>
            ) : (
              data.data.map((p) => (
                <Tr key={p.id} onClick={() => router.push(`/purchases/${p.id}`)}>
                  <Td>
                    <div className="font-mono text-[13px] font-medium">{p.purchaseNumber}</div>
                    {p.supplierBillNo && <div className="text-xs text-fg-3">Bill {p.supplierBillNo}</div>}
                  </Td>
                  {isAll && (
                    <Td>
                      <ShopBadge shop={p.shop} />
                    </Td>
                  )}
                  <Td className="font-medium">{p.supplier?.name}</Td>
                  <Td className="text-fg-2">{date(p.purchaseDate)}</Td>
                  <Td>
                    <PaymentBadge status={p.paymentStatus} />
                  </Td>
                  <Td align="right" className="font-medium">
                    {inr(p.grandTotal)}
                  </Td>
                  <Td align="right" className="text-fg-2">
                    {p.grandTotal - p.paidAmount > 0 ? inr(p.grandTotal - p.paidAmount) : "—"}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <Pagination pagination={data?.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
    </>
  );
}

export default function PurchasesPage() {
  return (
    <Guard permissions={[P.PURCHASE_VIEW]}>
      <Suspense>
        <Purchases />
      </Suspense>
    </Guard>
  );
}
