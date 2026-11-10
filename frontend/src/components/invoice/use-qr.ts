"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

// QR image (data URL) for a piece of text, e.g. a UPI payment link
export function useQr(text: string | null) {
  const [result, setResult] = useState<{ text: string; url: string } | null>(null);

  useEffect(() => {
    if (!text) return;
    let active = true;
    QRCode.toDataURL(text, { margin: 0, width: 240 }).then((url) => active && setResult({ text, url }));
    return () => {
      active = false;
    };
  }, [text]);

  return text && result?.text === text ? result.url : null;
}
