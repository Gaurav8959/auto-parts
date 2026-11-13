"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { InvoiceDocument, InvoiceReceipt } from "@/components/invoice/invoice-document";
import { Button } from "@/components/ui/button";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Invoice, InvoiceCopy } from "@/lib/types";

// waits until fonts and images (logo, UPI QR) are ready so the printout is complete
const whenPainted = async () => {
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => new Promise((resolve) => img.addEventListener("load", resolve, { once: true })))
  );
};

// A4: every printed page gets 10 mm top and bottom, so rows that run onto page 2 don't start at the paper's edge.
// Receipt: roll paper, one page exactly as long as the receipt (measured just before printing), so a long bill
// isn't split into pieces and cut in two by the printer.
const A4_PAGE = "@page { size: A4; margin: 10mm 0; }";
const receiptPage = (heightMm: number) => `@page { size: 80mm ${heightMm}mm; margin: 0; }`;

const fitPageToReceipt = (style: HTMLStyleElement | null) => {
  const receipt = document.querySelector(".invoice-receipt");
  if (!style || !receipt) return;
  const heightMm = Math.ceil((receipt.getBoundingClientRect().height * 25.4) / 96) + 2;
  style.textContent = receiptPage(heightMm);
};

// Print view. Opened directly it shows a preview with a Print button.
// Opened inside a hidden frame by the invoice page (?autoprint=1) it prints itself and reports back.
export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useAuth();

  const format = params.get("format") === "thermal" ? "thermal" : "a4";
  const copy = (params.get("copy") as InvoiceCopy) || "ORIGINAL";
  const autoprint = params.get("autoprint") === "1";
  const pageStyle = useRef<HTMLStyleElement>(null);
  const printNow = () => {
    if (format === "thermal") fitPageToReceipt(pageStyle.current);
    window.print();
  };

  const { data: inv, isError } = useQuery({
    queryKey: ["invoice", Number(id)],
    queryFn: () => get<Invoice>(`/invoice/${id}`),
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=/print/invoice/${id}`);
  }, [status, id, router]);

  useEffect(() => {
    if (!inv) return;
    document.title = inv.invoiceNumber;
    if (!autoprint) return;

    let cancelled = false;
    const done = () => window.parent.postMessage({ type: "ap:print-done", id }, window.location.origin);
    window.addEventListener("afterprint", done, { once: true });
    const timer = setTimeout(async () => {
      await whenPainted();
      if (cancelled) return;
      window.parent.postMessage({ type: "ap:print-start", id }, window.location.origin);
      if (format === "thermal") fitPageToReceipt(pageStyle.current);
      window.print();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [inv, autoprint, id, format]);

  useEffect(() => {
    if (isError) window.parent.postMessage({ type: "ap:print-done", id }, window.location.origin);
  }, [isError, id]);

  if (!inv) return <div className="p-10 text-sm text-neutral-500">Preparing invoice…</div>;

  return (
    <div className="min-h-dvh bg-neutral-200 py-8 print:bg-white print:py-0">
      <style ref={pageStyle}>{format === "thermal" ? receiptPage(297) : A4_PAGE}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-2 px-4">
        <span className="text-sm text-neutral-600">
          {format === "thermal" ? "80 mm receipt" : "A4 invoice"} · {inv.invoiceNumber}
        </span>
        <Button onClick={printNow} className="bg-neutral-900 text-white shadow-none hover:bg-neutral-800">
          <Printer /> Print
        </Button>
      </div>
      <div className="mx-auto w-fit shadow-lg print:shadow-none">
        {format === "thermal" ? <InvoiceReceipt invoice={inv} /> : <InvoiceDocument invoice={inv} copy={copy} />}
      </div>
    </div>
  );
}
