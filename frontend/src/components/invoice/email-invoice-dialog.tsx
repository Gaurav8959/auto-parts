"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailWarning, Paperclip } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, get, post } from "@/lib/api";
import { useOnOpen } from "@/lib/hooks";
import type { Invoice, InvoiceCopy } from "@/lib/types";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field, Input, Select, Textarea } from "../ui/input";
import { defaultEmailMessage, defaultEmailSubject } from "./invoice-actions";

type MailStatus = { configured: boolean; mode: "smtp" | "log" | null; from: string | null };

export function EmailInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: mail } = useQuery({
    queryKey: ["mail-status"],
    queryFn: () => get<MailStatus>("/settings/mail"),
    enabled: open,
  });

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copy, setCopy] = useState<InvoiceCopy>("ORIGINAL");
  const [saveToCustomer, setSaveToCustomer] = useState(true);

  useOnOpen(open, () => {
    setTo(invoice.customerEmail || invoice.customer?.email || "");
    setCc("");
    setSubject(defaultEmailSubject(invoice));
    setMessage(defaultEmailMessage(invoice));
    setCopy("ORIGINAL");
    setSaveToCustomer(true);
  });

  const send = useMutation({
    mutationFn: () =>
      post<Invoice>(`/invoice/${invoice.id}/email`, {
        to,
        cc: cc || null,
        subject,
        message,
        copy,
        saveToCustomer: !!invoice.customer && !invoice.customer.email && saveToCustomer,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(["invoice", invoice.id], updated);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        mail?.mode === "log" ? `Email to ${to} saved to the server's logs/mail folder` : `Invoice sent to ${to}`
      );
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ["invoice", invoice.id] });
    },
  });

  const notConfigured = mail && !mail.configured;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Email ${invoice.invoiceNumber}`}
      description={mail?.from ? `Sent from ${mail.from} as ${invoice.shop.name}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!to.trim() || !!notConfigured} loading={send.isPending} onClick={() => send.mutate()}>
            Send invoice
          </Button>
        </>
      }
    >
      {notConfigured && (
        <div className="mb-4 flex gap-3 rounded-xl border border-warning/25 bg-warning-soft p-3.5 text-[13px] text-fg">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium">Email isn&apos;t set up yet</div>
            <p className="mt-0.5 text-fg-2">
              Add your mail account to <span className="font-mono text-xs">backend/.env</span> and restart the server.
              With Gmail: turn on 2-step verification, create an <b>app password</b>, then set{" "}
              <span className="font-mono text-xs">SMTP_HOST=smtp.gmail.com</span>,{" "}
              <span className="font-mono text-xs">SMTP_PORT=465</span>,{" "}
              <span className="font-mono text-xs">SMTP_USER</span> and{" "}
              <span className="font-mono text-xs">SMTP_PASS</span>. Until then, download the PDF and attach it yourself.
            </p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="To" required hint="Separate several addresses with commas">
            <Input
              type="text"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              autoFocus
            />
          </Field>
          <Field label="Cc">
            <Input
              type="text"
              inputMode="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-[13px] text-fg-2">
            <Paperclip className="size-4 text-fg-3" />
            <span className="font-medium text-fg">{invoice.invoiceNumber}.pdf</span> attached
          </span>
          <Select
            value={copy}
            onChange={(e) => setCopy(e.target.value as InvoiceCopy)}
            className="h-8 w-auto text-[13px]"
          >
            <option value="ORIGINAL">Original copy</option>
            <option value="DUPLICATE">Duplicate copy</option>
          </Select>
        </div>
        {invoice.customer && !invoice.customer.email && (
          <label className="flex items-center gap-2 text-[13px] text-fg-2">
            <input
              type="checkbox"
              checked={saveToCustomer}
              onChange={(e) => setSaveToCustomer(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Save this address to {invoice.customer.name}&apos;s details
          </label>
        )}
      </div>
    </Dialog>
  );
}
