import { Wrench } from "lucide-react";
import { cn } from "@/lib/cn";

// Brand mark: the business logo when one is uploaded, otherwise a gradient tile with a wrench
export function LogoMark({ className, src }: { className?: string; src?: string | null }) {
  if (src) {
    return (
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white ring-1 ring-border",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="size-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-white",
        "bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-2)_100%)] shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]",
        className
      )}
    >
      <Wrench className="size-4" strokeWidth={2.25} />
    </span>
  );
}
