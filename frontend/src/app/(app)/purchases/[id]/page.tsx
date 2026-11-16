"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, IndianRupee, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { GstBadge } from "@/components/gst-mode";
import { EditHistory } from "@/components/edit-history";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Guard } from "@/components/layout/guard";
import { PaymentDialog } from "@/components/payment-dialog";
import { PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PaperPreview } from "@/components/invoice/paper-preview";
import { PurchaseDocument } from "@/components/purchase/purchase-document";
import { printInFrame } from "@/lib/print";
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
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["purchase", Number(id)],
    queryFn: () => get<Purchase>(`/purchase/${id}`),
  });

  if (isLoading || !p) return <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />;

  const due = Math.round((p.grandTotal - p.paidAmount) * 100) / 100;

  const print = async () => {
    setPrinting(true);
    await printInFrame(`/print/purchase/${p.id}?autoprint=1`, `purchase-${p.id}`, () => setPrinting(false));
    setPrinting(false);
  };

  return (
    <>
      <Link href="/purchases" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-3.5" /> Purchases
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{p.purchaseNumber}</h1>
            <GstBadge isGst={p.isGst} />
            <PaymentBadge status={p.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-fg-3">
            <ShopBadge shop={p.shop} /> · {p.supplier.name} · {date(p.purchaseDate)}
            {p.supplierBillNo && <> · Bill {p.supplierBillNo}</>} · entered by {fullName(p.createdBy)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={print} loading={printing}>
            <Printer /> Print
          </Button>
          {can(P.PURCHASE_EDIT) && (
            <Button variant="secondary" onClick={() => router.push(`/purchases/${p.id}/edit`)}>
              <Pencil /> Edit
            </Button>
          )}
          {due > 0 && can(P.PURCHASE_PAYMENT) && (
            <Button onClick={() => setPayOpen(true)}>
              <IndianRupee /> Pay supplier
            </Button>
          )}
        </div>
      </div>

      {/* grid-cols-1 + min-w-0 let the A4 preview shrink on phones instead of forcing the column wide */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* the purchase bill as it prints */}
        <div className="min-w-0 rounded-2xl border border-border bg-surface-2/70 p-3 sm:p-6 dark:bg-surface-2/40">
          <PaperPreview>
            <PurchaseDocument purchase={p} />
          </PaperPreview>
        </div>

        <Card className="xl:sticky xl:top-2">
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

      {!!p.revisions?.length && (
        <div className="mt-6 xl:max-w-[calc(100%-364px)]">
          <EditHistory revisions={p.revisions} />
        </div>
      )}

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
