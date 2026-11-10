"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "./button";

export type DropdownItem = {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

// A button that opens a short menu of related actions (Print ▾, Share ▾ …)
export function DropdownButton({
  children,
  items,
  align = "end",
  variant = "secondary",
  ...button
}: { children: React.ReactNode; items: (DropdownItem | "separator")[]; align?: "start" | "end" } & ButtonProps) {
  const visible = items.filter((i) => i === "separator" || !i.hidden);
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>
        <Button variant={variant} {...button}>
          {children}
          <ChevronDown className="-mr-1 !size-3.5 opacity-60" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          sideOffset={6}
          className="popover z-50 min-w-56 rounded-xl border border-border bg-surface p-1 shadow-pop"
        >
          {visible.map((item, i) =>
            item === "separator" ? (
              <Dropdown.Separator key={`sep-${i}`} className="mx-1 my-1 h-px bg-border" />
            ) : (
              <Dropdown.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  "flex cursor-default items-start gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2 [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-3",
                  item.danger && "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger"
                )}
              >
                {item.icon}
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  {item.description && <span className="block text-xs text-fg-3">{item.description}</span>}
                </span>
              </Dropdown.Item>
            )
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
