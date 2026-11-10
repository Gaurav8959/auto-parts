"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export function Tooltip({
  content,
  side = "right",
  disabled,
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <>{children}</>;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="tooltip z-50 rounded-md bg-fg px-2 py-1 text-xs font-medium text-canvas shadow-pop"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
