"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

const MAX_SIDE = 320;
const MAX_CHARS = 380_000;

// Shrinks the picked image in the browser so the stored logo stays small (well under 300 KB)
const resize = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      // PNG keeps transparency; fall back to JPEG if it's still too big
      let url = canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9);
      if (url.length > MAX_CHARS) url = canvas.toDataURL("image/jpeg", 0.8);
      if (url.length > MAX_CHARS) reject(new Error("That image is too detailed. Try a simpler logo."));
      else resolve(url);
    };
    img.onerror = () => reject(new Error("That file isn't an image we can read."));
    img.src = URL.createObjectURL(file);
  });

export function LogoInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-white">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Shop logo" className="size-full object-contain p-1" />
        ) : (
          <ImagePlus className="size-5 text-neutral-400" />
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {value ? "Change logo" : "Upload logo"}
          </Button>
          {value && !disabled && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-fg-3">PNG or JPEG. Printed at the top of invoices.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onChange(await resize(file));
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
