"use client";

import { History } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { dateTime, fullName } from "@/lib/format";
import type { Revision } from "@/lib/types";

// Every edit of an invoice or purchase: who, when, and what changed. Shown only once something was edited.
export function EditHistory({ revisions }: { revisions?: Revision[] }) {
  if (!revisions?.length) return null;
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <History className="size-4 text-fg-3" /> Edit history
          </span>
        }
        description={`Edited ${revisions.length === 1 ? "once" : `${revisions.length} times`}`}
      />
      <ol className="divide-y divide-border border-t border-border">
        {revisions.map((revision) => (
          <li key={revision.id} className="px-5 py-3">
            <div className="text-xs text-fg-3">
              {dateTime(revision.createdAt)} · {fullName(revision.createdBy) || "Someone"}
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[13px] text-fg-2">
              {revision.changes.map((change, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-fg-3" />
                  <span className="min-w-0">{change}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Card>
  );
}
