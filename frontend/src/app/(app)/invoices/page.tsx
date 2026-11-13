"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Guard } from "@/components/layout/guard";
import { Badge, PaymentBadge } from "@/components/ui/badge";
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
import { dateTime, fullName, inr } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Invoice } from "@/lib/types";
import { useShopScope } from "@/lib/shop";
import { ShopBadge } from "@/components/layout/shop-switcher";
import { isOverdue } from "@/components/invoice/invoice-document";
import { GstBadge } from "@/components/gst-mode";

function Invoices() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = useAuth();
  const { isAll } = useShopScope();
  const customerId = params.get("customerId") || "";
  const customerName = params.get("customerName");

  const [filters, setFilters] = useState({ keyword: "", paymentStatus: "", status: "", gst: "", from: "", to: "", page: 1 });
  const setFilter = (key: keyof typeof filters, value: string) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", filters, customerId],
    queryFn: () => {
      const { paymentStatus, ...rest } = filters;
      const overdue = paymentStatus === "OVERDUE";
      return getPaged<Invoice>(
        "/invoice",
        clean({
          ...rest,
          paymentStatus: overdue ? "" : paymentStatus,
          overdue: overdue ? "true" : "",
          customerId,
          limit: 25,
        })
      );
    },
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description={isAll ? "Every bill from every shop." : "Every bill issued from your counter."}
        actions={
          can(P.INVOICE_CREATE) && (
            <Button onClick={() => router.push("/invoices/new")}>
              <Plus /> New invoice
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {customerId && (
            <button
              onClick={() => router.push("/invoices")}
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-[13px] font-medium text-accent"
            >
              {customerName || "Customer"} <X className="size-3.5" />
            </button>
          )}
          <SearchInput
            value={filters.keyword}
            onChange={(v) => setFilter("keyword", v)}
            placeholder="Invoice no., customer, phone or vehicle"
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
            <option value="OVERDUE">Overdue</option>
          </Select>
          <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="w-auto">
            <option value="">Issued & cancelled</option>
            <option value="ISSUED">Issued</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Select value={filters.gst} onChange={(e) => setFilter("gst", e.target.value)} className="w-auto">
            <option value="">GST & non-GST</option>
            <option value="true">GST invoices</option>
            <option value="false">Bills without GST</option>
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
              <Th>Invoice</Th>
              {isAll && <Th>Shop</Th>}
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Status</Th>
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
                    icon={<FileText />}
                    title="No invoices found"
                    description="Try clearing filters, or create a new invoice."
                  />
                </td>
              </tr>
            ) : (
              data.data.map((inv) => {
                const cancelled = inv.status === "CANCELLED";
                return (
                  <Tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className={cancelled ? "opacity-60" : ""}
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-medium">{inv.invoiceNumber}</span>
                        <GstBadge isGst={inv.isGst} />
                      </div>
                    </Td>
                    {isAll && (
                      <Td>
                        <ShopBadge shop={inv.shop} />
                      </Td>
                    )}
                    <Td>
                      <div className="font-medium">{inv.customerName}</div>
                      <div className="text-xs text-fg-3">
                        {[inv.customerPhone, inv.vehicleNumber].filter(Boolean).join(" · ") ||
                          `By ${fullName(inv.createdBy)}`}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-fg-2">{dateTime(inv.invoiceDate)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {cancelled ? <Badge>Cancelled</Badge> : <PaymentBadge status={inv.paymentStatus} />}
                        {isOverdue(inv) && <Badge tone="danger">Overdue</Badge>}
                      </div>
                    </Td>
                    <Td align="right" className={cancelled ? "line-through" : "font-medium"}>
                      {inr(inv.grandTotal)}
                    </Td>
                    <Td align="right" className="text-fg-2">
                      {cancelled || inv.grandTotal - inv.paidAmount <= 0 ? "—" : inr(inv.grandTotal - inv.paidAmount)}
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
        <Pagination pagination={data?.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>
    </>
  );
}

export default function InvoicesPage() {
  return (
    <Guard permissions={[P.INVOICE_VIEW]}>
      <Suspense>
        <Invoices />
      </Suspense>
    </Guard>
  );
}
