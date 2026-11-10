"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Guard } from "@/components/layout/guard";
import { PaymentDialog } from "@/components/payment-dialog";
import { PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { errorMessage, get, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, dateTime, fullName, inr, label } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Purchase } from "@/lib/types";
import { ShopBadge } from "@/components/layout/shop-switcher";

function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [payOpen, setPayOpen] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["purchase", Number(id)],
    queryFn: () => get<Purchase>(`/purchase/${id}`),
  });

  if (isLoading || !p) return <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />;

  const due = Math.round((p.grandTotal - p.paidAmount) * 100) / 100;

  return (
    <>
      <Link href="/purchases" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-3.5" /> Purchases
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{p.purchaseNumber}</h1>
            <PaymentBadge status={p.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-fg-3">
            <ShopBadge shop={p.shop} /> · {p.supplier.name} · {date(p.purchaseDate)}
            {p.supplierBillNo && <> · Bill {p.supplierBillNo}</>} · entered by {fullName(p.createdBy)}
          </p>
        </div>
        {due > 0 && can(P.PURCHASE_PAYMENT) && (
          <Button onClick={() => setPayOpen(true)}>
            <IndianRupee /> Pay supplier
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Unit cost</Th>
                <Th align="right">GST</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {p.items?.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Link href={`/products/${item.product?.id}`} className="font-medium hover:underline">
                      {item.productName}
                    </Link>
                    <div className="font-mono text-xs text-fg-3">{item.sku}</div>
                  </Td>
                  <Td align="right">{item.quantity}</Td>
                  <Td align="right">{inr(item.unitCost)}</Td>
                  <Td align="right" className="text-fg-2">
                    {inr(item.taxAmount)} <span className="text-fg-3">({item.taxPercent}%)</span>
                  </Td>
                  <Td align="right" className="font-medium">
                    {inr(item.lineTotal)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
            <div className="flex justify-between text-fg-2">
              <dt>Subtotal</dt>
              <dd className="tabular">{inr(p.subTotal)}</dd>
            </div>
            <div className="flex justify-between text-fg-2">
              <dt>GST</dt>
              <dd className="tabular">{inr(p.taxTotal)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{inr(p.grandTotal)}</dd>
            </div>
          </dl>
          {p.notes && <p className="border-t border-border px-5 py-3 text-[13px] text-fg-2">{p.notes}</p>}
        </Card>

        <Card>
          <CardHeader title="Payments" description={due > 0 ? `${inr(due)} still owed` : "Fully paid"} />
          {p.payments?.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {p.payments.map((pay) => (
                <li key={pay.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div>
                    <div className="text-[13.5px] font-medium">{label(pay.paymentMode)}</div>
                    <div className="text-xs text-fg-3">
                      {dateTime(pay.paidAt)}
                      {pay.note && ` · ${pay.note}`}
                    </div>
                  </div>
                  <span className="tabular text-[13.5px] font-medium">{inr(pay.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-border px-5 py-4 text-[13px] text-fg-3">No payments yet.</p>
          )}
        </Card>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        due={due}
        title="Pay supplier"
        onSubmit={async (body) => {
          try {
            const updated = await post<Purchase>(`/purchase/${p.id}/payments`, body);
            qc.setQueryData(["purchase", p.id], updated);
            qc.invalidateQueries({ queryKey: ["purchases"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast.success("Payment recorded");
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </>
  );
}

export default function PurchaseDetailPage() {
  return (
    <Guard permissions={[P.PURCHASE_VIEW]}>
      <PurchaseDetail />
    </Guard>
  );
}
