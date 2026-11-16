"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PurchaseDocument } from "@/components/purchase/purchase-document";
import { Button } from "@/components/ui/button";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { A4_PAGE, useAutoPrint } from "@/lib/print";
import type { Purchase } from "@/lib/types";

// Print view of a purchase bill. Opened directly it shows a preview with a Print button (and the browser's
// "Save as PDF"). Opened inside a hidden frame by the purchase page (?autoprint=1) it prints itself and reports back.
export default function PrintPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useAuth();
  const autoprint = params.get("autoprint") === "1";

  const { data: purchase, isError } = useQuery({
    queryKey: ["purchase", Number(id)],
    queryFn: () => get<Purchase>(`/purchase/${id}`),
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=/print/purchase/${id}`);
  }, [status, id, router]);

  useEffect(() => {
    if (purchase) document.title = purchase.purchaseNumber;
  }, [purchase]);

  useAutoPrint({ ready: !!purchase, failed: isError, autoprint, printId: `purchase-${id}` });

  if (!purchase) return <div className="p-10 text-sm text-neutral-500">Preparing purchase bill…</div>;

  return (
    <div className="min-h-dvh bg-neutral-200 py-8 print:bg-white print:py-0">
      <style>{A4_PAGE}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-2 px-4">
        <span className="text-sm text-neutral-600">A4 purchase bill · {purchase.purchaseNumber}</span>
        <Button onClick={() => window.print()} className="bg-neutral-900 text-white shadow-none hover:bg-neutral-800">
          <Printer /> Print
        </Button>
      </div>
      <div className="mx-auto w-fit shadow-lg print:shadow-none">
        <PurchaseDocument purchase={purchase} />
      </div>
    </div>
  );
}
