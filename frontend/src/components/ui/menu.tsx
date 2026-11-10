"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
};

export function RowMenu({ items }: { items: MenuItem[] }) {
  const visible = items.filter((i) => !i.hidden);
  if (!visible.length) return null;

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger
        className="pressable inline-flex size-8 items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2"
        aria-label="Actions"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={4}
          className="popover z-50 min-w-40 rounded-lg border border-border bg-surface p-1 shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((item) => (
            <Dropdown.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg outline-none select-none data-[highlighted]:bg-surface-2 [&_svg]:size-3.5 [&_svg]:text-fg-3",
                item.danger && "text-danger [&_svg]:text-danger data-[highlighted]:bg-danger-soft"
              )}
            >
              {item.icon}
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
