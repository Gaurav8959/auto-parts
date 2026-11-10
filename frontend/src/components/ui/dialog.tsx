"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cn(
            "modal fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-2xl border border-border bg-surface shadow-modal focus:outline-none",
            widths[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-1">
            <div>
              <RadixDialog.Title className="text-base font-semibold tracking-tight">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-[13px] text-fg-3">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="pressable -mt-1 -mr-1 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </RadixDialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function Sheet({ open, onOpenChange, title, description, children, footer }: Omit<DialogProps, "size">) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay fixed inset-0 z-50 bg-black/30" />
        <RadixDialog.Content className="sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-modal focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <RadixDialog.Title className="text-base font-semibold tracking-tight">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-[13px] text-fg-3">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="pressable -mr-1.5 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-3.5">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
