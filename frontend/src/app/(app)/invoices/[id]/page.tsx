"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CircleCheck,
  Copy,
  Download,
  FileText,
  IndianRupee,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Printer,
  Receipt,
  Repeat2,
  Send,
  Share2,
  Undo2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EmailInvoiceDialog } from "@/components/invoice/email-invoice-dialog";
import {
  downloadFile,
  fetchInvoicePdf,
  invoiceSummaryText,
  printInvoice,
  whatsappLink,
} from "@/components/invoice/invoice-actions";
import { balanceOf, InvoiceDocument, isOverdue, PaperPreview } from "@/components/invoice/invoice-document";
import { Guard } from "@/components/layout/guard";
import { ShopBadge } from "@/components/layout/shop-switcher";
import { PaymentDialog } from "@/components/payment-dialog";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DropdownButton } from "@/components/ui/dropdown-button";
import { Field, Input, Select } from "@/components/ui/input";
import { errorMessage, get, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { date, dateTime, fullName, inr, label } from "@/lib/format";
import { P } from "@/lib/permissions";
import { PAYMENT_MODES, type Invoice, type PaymentMode } from "@/lib/types";

type Activity = { at: string; icon: React.ReactNode; tone: string; title: React.ReactNode; detail?: React.ReactNode };

// Everything that happened to the invoice, newest first
const activityOf = (inv: Invoice): Activity[] => {
  const events: Activity[] = [
    {
      at: inv.invoiceDate,
      icon: <FileText />,
      tone: "bg-brand-soft text-accent",
      title: "Invoice created",
      detail: `by ${fullName(inv.createdBy)} · ${inr(inv.grandTotal)}`,
    },
    ...(inv.payments || []).map((p) => {
      const refund = p.amount < 0;
      return {
        at: p.paidAt,
        icon: refund ? <Undo2 /> : <IndianRupee />,
        tone: refund ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
        title: refund ? `${inr(-p.amount)} refunded` : `${inr(p.amount)} received`,
        detail: [label(p.paymentMode), p.note, p.createdBy && `by ${fullName(p.createdBy)}`].filter(Boolean).join(" · "),
      };
    }),
    ...(inv.emails || []).map((e) => ({
      at: e.createdAt,
      icon: e.status === "SENT" ? <Send /> : <XCircle />,
      tone: e.status === "SENT" ? "bg-surface-2 text-fg-2" : "bg-danger-soft text-danger",
      title: e.status === "SENT" ? `Emailed to ${e.toAddress}` : `Email to ${e.toAddress} failed`,
      detail: e.status === "SENT" ? (e.createdBy ? `by ${fullName(e.createdBy)}` : undefined) : e.error,
    })),
  ];
  if (inv.status === "CANCELLED" && inv.cancelledAt) {
    events.push({
      at: inv.cancelledAt,
      icon: <Ban />,
      tone: "bg-danger-soft text-danger",
      title: "Cancelled",
      detail: `${inv.cancelReason}${inv.cancelledBy ? ` · by ${fullName(inv.cancelledBy)}` : ""}`,
    });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};

function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMode, setRefundMode] = useState<PaymentMode | "">("");
  const [busy, setBusy] = useState<"print" | "pdf" | "share" | null>(null);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", Number(id)],
    queryFn: () => get<Invoice>(`/invoice/${id}`),
  });

  const refresh = (updated: Invoice) => {
    qc.setQueryData(["invoice", Number(id)], updated);
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const cancel = useMutation({
    mutationFn: () => post<Invoice>(`/invoice/${id}/cancel`, { reason, ...(refundMode && { refundMode }) }),
    onSuccess: (updated) => {
      toast.success(
        refundMode
          ? "Invoice cancelled. Items are back in stock and the refund is recorded."
          : "Invoice cancelled. Items are back in stock."
      );
      refresh(updated);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      setCancelOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !inv) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="aspect-[210/297] animate-pulse rounded-xl border border-border bg-surface" />
        <div className="h-80 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  const cancelled = inv.status === "CANCELLED";
  const due = balanceOf(inv);
  const overdue = isOverdue(inv);
  const profit = inv.costTotal !== undefined ? inv.grandTotal - inv.taxTotal - inv.costTotal : null;
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator;

  const print = async (format: "a4" | "thermal", copy: "ORIGINAL" | "DUPLICATE" = "ORIGINAL") => {
    setBusy("print");
    await printInvoice(inv.id, { format, copy }, () => setBusy(null));
    setBusy(null);
  };

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      downloadFile(await fetchInvoicePdf(inv));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // On phones this opens the share sheet with the PDF attached (WhatsApp, Gmail, …)
  const sharePdf = async () => {
    setBusy("share");
    try {
      const file = await fetchInvoicePdf(inv);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${inv.invoiceNumber}`, text: invoiceSummaryText(inv) });
      } else {
        downloadFile(file);
        toast.message("PDF downloaded", {
          description: "This browser can't share files directly. Attach the PDF yourself.",
        });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-3.5" /> Invoices
      </Link>

      {/* title + actions */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{inv.invoiceNumber}</h1>
            {cancelled ? <Badge tone="danger">Cancelled</Badge> : <PaymentBadge status={inv.paymentStatus} />}
            {overdue && <Badge tone="danger">Overdue</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-3">
            <span className="font-medium text-fg-2">{inv.customerName}</span>
            <span>·</span>
            <ShopBadge shop={inv.shop} />
            <span>· {dateTime(inv.invoiceDate)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownButton
            variant="primary"
            loading={busy === "print"}
            items={[
              {
                label: "Print invoice",
                description: "A4 tax invoice",
                icon: <FileText />,
                onSelect: () => print("a4"),
              },
              {
                label: "Print duplicate copy",
                description: "Marked “Duplicate for transporter”",
                icon: <Copy />,
                onSelect: () => print("a4", "DUPLICATE"),
              },
              {
                label: "Print receipt",
                description: "80 mm thermal printer",
                icon: <Receipt />,
                onSelect: () => print("thermal"),
              },
            ]}
          >
            <Printer /> Print
          </DropdownButton>
          <Button variant="secondary" onClick={downloadPdf} loading={busy === "pdf"}>
            <Download /> PDF
          </Button>
          {can(P.INVOICE_SEND) && !cancelled && (
            <Button variant="secondary" onClick={() => setEmailOpen(true)}>
              <Mail /> Email
            </Button>
          )}
          {can(P.INVOICE_SEND) && !cancelled && (
            <DropdownButton
              loading={busy === "share"}
              items={[
                {
                  label: "Share PDF",
                  description: canShareFiles ? "WhatsApp, Gmail and other apps" : "Downloads the PDF to attach",
                  icon: <Share2 />,
                  onSelect: sharePdf,
                },
                {
                  label: "WhatsApp message",
                  description: inv.customerPhone ? `Summary to ${inv.customerPhone}` : "Pick the chat in WhatsApp",
                  icon: <MessageCircle />,
                  onSelect: () => window.open(whatsappLink(inv), "_blank", "noopener"),
                },
                {
                  label: "Copy summary",
                  description: "Invoice no., total and balance",
                  icon: <Copy />,
                  onSelect: async () => {
                    await navigator.clipboard.writeText(invoiceSummaryText(inv));
                    toast.success("Copied");
                  },
                },
              ]}
            >
              <Share2 /> Share
            </DropdownButton>
          )}
          <DropdownButton
            size="icon"
            aria-label="More actions"
            className="w-auto px-2.5"
            items={[
              {
                label: "Record payment",
                icon: <IndianRupee />,
                hidden: cancelled || due <= 0 || !can(P.INVOICE_PAYMENT),
                onSelect: () => setPayOpen(true),
              },
              {
                label: "Bill again",
                description: "New invoice with the same items",
                icon: <Repeat2 />,
                hidden: !can(P.INVOICE_CREATE),
                onSelect: () => router.push(`/invoices/new?from=${inv.id}`),
              },
              "separator",
              {
                label: "Cancel invoice",
                description: "Puts every item back in stock",
                icon: <Ban />,
                danger: true,
                hidden: cancelled || !can(P.INVOICE_CANCEL),
                onSelect: () => {
                  // default the refund to how the customer last paid
                  const lastPayment = [...(inv.payments || [])].reverse().find((p) => p.amount > 0);
                  setRefundMode(inv.paidAmount > 0 ? lastPayment?.paymentMode || "CASH" : "");
                  setCancelOpen(true);
                },
              },
            ]}
          >
            <MoreHorizontal />
          </DropdownButton>
        </div>
      </div>

      {/* grid-cols-1 + min-w-0 let the A4 preview shrink on phones instead of forcing the column wide */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* the invoice exactly as the customer receives it */}
        <div className="min-w-0 rounded-2xl border border-border bg-surface-2/70 p-3 sm:p-6 dark:bg-surface-2/40">
          <PaperPreview>
            <InvoiceDocument invoice={inv} />
          </PaperPreview>
        </div>

        <div className="space-y-4 xl:sticky xl:top-2">
          <Card className="p-5">
            <div className="text-[13px] text-fg-3">
              {cancelled ? "Invoice total" : due > 0 ? "Balance due" : "Total"}
            </div>
            <div className={cn("mt-1 text-3xl font-semibold tracking-tight", !cancelled && due > 0 && "text-danger")}>
              {inr(cancelled || due <= 0 ? inv.grandTotal : due)}
            </div>
            {!cancelled && (
              <div className="mt-2 text-[13px] text-fg-3">
                {due > 0 ? (
                  <>
                    of {inr(inv.grandTotal)} · {inr(inv.paidAmount)} paid
                    {inv.dueDate && (
                      <div className={cn("mt-1 flex items-center gap-1.5", overdue && "font-medium text-danger")}>
                        {overdue && <AlertCircle className="size-3.5" />}
                        {overdue ? "Was due" : "Due"} {date(inv.dueDate)}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-success">
                    <CircleCheck className="size-4" /> Paid in full
                  </span>
                )}
              </div>
            )}
            {!cancelled && due > 0 && can(P.INVOICE_PAYMENT) && (
              <Button className="mt-4 w-full" onClick={() => setPayOpen(true)}>
                <IndianRupee /> Record payment
              </Button>
            )}
            {profit !== null && !cancelled && (
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-[13px]">
                <span className="text-fg-3">Profit (before GST)</span>
                <span className={cn("font-medium tabular", profit < 0 && "text-danger")}>{inr(profit)}</span>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.06em] text-fg-3 uppercase">Customer</div>
            <div className="mt-2 font-medium">{inv.customerName}</div>
            <div className="mt-1 space-y-0.5 text-[13px] text-fg-2">
              {inv.customerPhone && <div className="tabular">{inv.customerPhone}</div>}
              {(inv.customerEmail || inv.customer?.email) && <div>{inv.customerEmail || inv.customer?.email}</div>}
              {inv.vehicleNumber && <div className="font-mono">{inv.vehicleNumber}</div>}
              {!inv.customerPhone && !inv.customerEmail && !inv.customer?.email && (
                <div className="text-fg-3">No contact details</div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ol className="px-5 pb-5">
              {activityOf(inv).map((event, i, all) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < all.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-border" />}
                  <span
                    className={cn(
                      "relative flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5",
                      event.tone
                    )}
                  >
                    {event.icon}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-[13px] font-medium">{event.title}</div>
                    {event.detail && <div className="truncate text-xs text-fg-3">{event.detail}</div>}
                    <div className="text-xs text-fg-3">{dateTime(event.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <EmailInvoiceDialog invoice={inv} open={emailOpen} onOpenChange={setEmailOpen} />

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        due={due}
        title="Record payment"
        onSubmit={async (body) => {
          try {
            const updated = await post<Invoice>(`/invoice/${inv.id}/payments`, body);
            toast.success("Payment recorded");
            refresh(updated);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this invoice?"
        description={
          inv.paidAmount > 0
            ? `All items go back into stock and the ${inr(inv.paidAmount)} paid is recorded as refunded. The invoice stays in your records, marked cancelled.`
            : "All items go back into stock. The invoice stays in your records, marked cancelled."
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep invoice
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => cancel.mutate()}
            >
              Cancel invoice
            </Button>
          </>
        }
      >
        <Field label="Reason" required>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Wrong part billed, customer returned…"
            autoFocus
          />
        </Field>
        {inv.paidAmount > 0 && (
          <Field label={`Refund ${inr(inv.paidAmount)} by`} hint="Shows in collections on the day of the refund" className="mt-3">
            <Select value={refundMode} onChange={(e) => setRefundMode(e.target.value as PaymentMode)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Dialog>
    </>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Guard permissions={[P.INVOICE_VIEW, P.INVOICE_CREATE]}>
      <InvoiceDetail />
    </Guard>
  );
}
