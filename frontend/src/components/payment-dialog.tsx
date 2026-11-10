"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { inr, label } from "@/lib/format";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input } from "./ui/input";
import { useOnOpen } from "@/lib/hooks";

export function PaymentDialog({
  open,
  onOpenChange,
  due,
  title,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  due: number;
  title: string;
  onSubmit: (body: { amount: number; paymentMode: PaymentMode; note?: string }) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState(String(due));
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useOnOpen(open, () => {
    setAmount(String(due));
    setMode("CASH");
    setNote("");
  });

  const value = Number(amount);
  const invalid = !(value > 0) || value > due;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${inr(due)} is due.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({ amount: value, paymentMode: mode, note: note || undefined });
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            Record {inr(value || 0)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount" error={value > due ? "More than the amount due" : undefined}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className="tabular"
          />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "pressable h-7 rounded-md border px-2.5 text-xs font-medium",
                mode === m
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-border text-fg-2 hover:border-border-strong"
              )}
            >
              {label(m)}
            </button>
          ))}
        </div>
        <Field label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI ref, cheque no…" />
        </Field>
      </div>
    </Dialog>
  );
}
