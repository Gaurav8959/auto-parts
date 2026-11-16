"use client";

import { useEffect, useRef } from "react";

// A4: every printed page gets 10 mm top and bottom, so rows that run onto page 2 don't start at the paper's edge
export const A4_PAGE = "@page { size: A4; margin: 10mm 0; }";

// waits until fonts and images (logo, UPI QR) are ready so the printout is complete
const whenPainted = async () => {
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => new Promise((resolve) => img.addEventListener("load", resolve, { once: true })))
  );
};

// Prints a print view (/print/…) through a hidden frame: no new tab, the browser's print dialog opens over the
// current page. `printId` is what that view reports back with, so the right frame is cleaned up.
export const printInFrame = (src: string, printId: string, onStart?: () => void) =>
  new Promise<void>((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    frame.src = src;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(fallback);
      setTimeout(() => frame.remove(), 500);
      resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.id !== printId) return;
      if (event.data.type === "ap:print-start") onStart?.();
      if (event.data.type === "ap:print-done") cleanup();
    };
    // some browsers never fire afterprint inside a frame
    const fallback = setTimeout(cleanup, 120_000);
    window.addEventListener("message", onMessage);
    document.body.appendChild(frame);
  });

// The print view's side: opened inside a hidden frame (?autoprint=1), it prints itself once its document is
// ready and reports back to the page that opened it; if the document can't load, it reports back straight away
export function useAutoPrint({
  ready,
  failed,
  autoprint,
  printId,
  beforePrint,
}: {
  ready: boolean;
  failed: boolean;
  autoprint: boolean;
  printId: string;
  beforePrint?: () => void;
}) {
  const before = useRef(beforePrint);
  useEffect(() => {
    before.current = beforePrint;
  });

  useEffect(() => {
    if (!ready || !autoprint) return;
    let cancelled = false;
    const done = () => window.parent.postMessage({ type: "ap:print-done", id: printId }, window.location.origin);
    window.addEventListener("afterprint", done, { once: true });
    const timer = setTimeout(async () => {
      await whenPainted();
      if (cancelled) return;
      window.parent.postMessage({ type: "ap:print-start", id: printId }, window.location.origin);
      before.current?.();
      window.print();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [ready, autoprint, printId]);

  useEffect(() => {
    if (failed) window.parent.postMessage({ type: "ap:print-done", id: printId }, window.location.origin);
  }, [failed, printId]);
}
