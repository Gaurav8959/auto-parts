"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, put } from "@/lib/api";
import { useOnOpen } from "@/lib/hooks";
import type { Shop } from "@/lib/types";
import { Button } from "./ui/button";
import { Sheet } from "./ui/dialog";
import { Field, Input, Textarea } from "./ui/input";

export type ShopFields = {
  name: string;
  code: string;
  tagline: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  invoiceTerms: string;
  invoicePrefix: string;
  purchasePrefix: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
};

export const shopToFields = (shop?: Shop | null): ShopFields => ({
  name: shop?.name || "",
  code: shop?.code || "",
  tagline: shop?.tagline || "",
  phone: shop?.phone || "",
  email: shop?.email || "",
  gstin: shop?.gstin || "",
  address: shop?.address || "",
  invoiceTerms: shop?.invoiceTerms || "",
  invoicePrefix: shop?.invoicePrefix || "",
  purchasePrefix: shop?.purchasePrefix || "",
  bankName: shop?.bankName || "",
  bankAccountName: shop?.bankAccountName || "",
  bankAccountNumber: shop?.bankAccountNumber || "",
  bankIfsc: shop?.bankIfsc || "",
  upiId: shop?.upiId || "",
});

const upperCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");

// The fields printed on a shop's invoices. `compact` is the short version used inside "Add manager".
export function ShopFieldset({
  value,
  onChange,
  compact,
  canEditCode = true,
}: {
  value: ShopFields;
  onChange: (next: ShopFields) => void;
  compact?: boolean;
  canEditCode?: boolean;
}) {
  const set = (key: keyof ShopFields, v: string) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Shop name" required>
          <Input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Karol Bagh Auto Parts" />
        </Field>
        <Field label="Code" hint={compact ? "Auto if blank" : undefined}>
          <Input
            value={value.code}
            onChange={(e) => set("code", upperCode(e.target.value))}
            disabled={!canEditCode}
            className="font-mono"
            maxLength={10}
            placeholder="KB"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input type="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="GSTIN">
          <Input
            value={value.gstin}
            onChange={(e) => set("gstin", e.target.value.toUpperCase())}
            className="font-mono"
            maxLength={15}
          />
        </Field>
      </div>
      <Field label="Address">
        <Textarea value={value.address} onChange={(e) => set("address", e.target.value)} rows={2} />
      </Field>
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input
                value={value.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="Genuine spares for all cars"
              />
            </Field>
          </div>
          <Field label="Invoice terms" hint="Printed at the bottom of this shop's invoices">
            <Textarea value={value.invoiceTerms} onChange={(e) => set("invoiceTerms", e.target.value)} rows={2} />
          </Field>
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h4 className="text-[13px] font-semibold">Getting paid</h4>
              <p className="text-xs text-fg-3">
                Printed on invoices. With a UPI id, unpaid invoices show a QR code for the amount due.
              </p>
            </div>
            <Field label="UPI id" hint="e.g. karolbaghauto@okicici">
              <Input value={value.upiId} onChange={(e) => set("upiId", e.target.value.trim())} className="font-mono" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank name">
                <Input value={value.bankName} onChange={(e) => set("bankName", e.target.value)} />
              </Field>
              <Field label="Account name">
                <Input value={value.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} />
              </Field>
              <Field label="Account number">
                <Input
                  value={value.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="IFSC">
                <Input
                  value={value.bankIfsc}
                  onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())}
                  className="font-mono"
                  maxLength={11}
                />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Field
              label="Invoice prefix"
              hint={value.invoicePrefix ? `Bills look like ${value.invoicePrefix}-00001` : undefined}
            >
              <Input
                value={value.invoicePrefix}
                onChange={(e) => set("invoicePrefix", upperCode(e.target.value))}
                className="font-mono"
                maxLength={10}
              />
            </Field>
            <Field label="Purchase prefix">
              <Input
                value={value.purchasePrefix}
                onChange={(e) => set("purchasePrefix", upperCode(e.target.value))}
                className="font-mono"
                maxLength={10}
              />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

// blank strings become null so optional fields can be cleared
export const fieldsToBody = (fields: ShopFields, { includeCode = true } = {}) => {
  const { code, ...rest } = fields;
  const body: Record<string, string | null> = {};
  Object.entries(rest).forEach(([k, v]) => (body[k] = v.trim() === "" ? null : v.trim()));
  if (!body.invoicePrefix) delete body.invoicePrefix;
  if (!body.purchasePrefix) delete body.purchasePrefix;
  if (includeCode && code) body.code = code;
  return body;
};

export function ShopDetailsSheet({
  shop,
  onOpenChange,
  canEditCode,
}: {
  shop: Shop | null;
  onOpenChange: (open: boolean) => void;
  canEditCode: boolean;
}) {
  const qc = useQueryClient();
  const [fields, setFields] = useState(shopToFields(shop));
  useOnOpen(!!shop, () => setFields(shopToFields(shop)));

  const save = useMutation({
    mutationFn: () => put<Shop>(`/shop/${shop!.id}`, fieldsToBody(fields, { includeCode: canEditCode })),
    onSuccess: (saved) => {
      toast.success(`${saved.name} updated`);
      qc.invalidateQueries({ queryKey: ["shops"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Sheet
      open={!!shop}
      onOpenChange={onOpenChange}
      title="Shop details"
      description="Printed on this shop's invoices."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!fields.name.trim()} onClick={() => save.mutate()}>
            Save shop
          </Button>
        </>
      }
    >
      <ShopFieldset value={fields} onChange={setFields} canEditCode={canEditCode} />
    </Sheet>
  );
}
