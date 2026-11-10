"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, get, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LOGOS_KEY, useLogos } from "@/lib/logos";
import { useShopScope } from "@/lib/shop";
import type { ShopSettings } from "@/lib/types";
import { LogoInput } from "./logo-input";
import { Card, CardHeader } from "./ui/card";

// The business logo on someone's profile. A manager's is their shop's logo; the admin's is the
// business logo, used by any shop that hasn't set its own. Either way it lands on the invoices.
export function ProfileLogoCard() {
  const qc = useQueryClient();
  const { isAdmin, user } = useAuth();
  const { shops } = useShopScope();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => get<ShopSettings>("/settings") });
  const logos = useLogos();

  const myShop = isAdmin ? null : shops.find((s) => s.id === user?.shop?.id) || shops[0];
  const saved = (isAdmin ? logos.business : logos.shopLogo(myShop?.id)) || "";
  const [pending, setPending] = useState<string | null>(null);
  const logo = pending ?? saved;

  const save = useMutation({
    mutationFn: (next: string) => put("/me/logo", { logo: next }),
    onSuccess: async (_, next) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: LOGOS_KEY }),
        qc.invalidateQueries({ queryKey: ["invoice"] }),
      ]);
      setPending(null);
      toast.success(next ? "Logo saved. It's on your invoices now." : "Logo removed");
    },
    onError: (e) => {
      setPending(null);
      toast.error(errorMessage(e));
    },
  });

  const title = isAdmin ? settings?.shopName || "Your business" : myShop?.name || "Your shop";

  return (
    <Card>
      <CardHeader
        title="Business logo"
        description={
          isAdmin
            ? "Printed on invoices of every shop that hasn't uploaded its own logo."
            : `Printed on ${myShop?.name ?? "your shop"}'s invoices, receipts and emails.`
        }
      />
      <div className="space-y-4 px-5 pb-5">
        <LogoInput
          value={logo}
          onChange={(next) => {
            setPending(next);
            save.mutate(next);
          }}
        />
        {/* how it sits on an invoice */}
        <div className="overflow-hidden rounded-lg border border-border bg-white px-4 py-3 text-[#17171c]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-9 shrink-0 object-contain" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded border border-dashed border-neutral-300 text-[9px] text-neutral-400">
                  LOGO
                </span>
              )}
              <span className="truncate text-[13px] font-semibold">{title}</span>
            </div>
            <span className="shrink-0 text-[10px] font-bold tracking-[0.08em] text-[#5a4ff3]">TAX INVOICE</span>
          </div>
          <div className="mt-2.5 h-[2px] bg-[#5a4ff3]" />
        </div>
        <p className="text-xs text-fg-3">{save.isPending ? "Saving…" : "Preview of your invoice header"}</p>
      </div>
    </Card>
  );
}
