"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Guard } from "@/components/layout/guard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field, Input } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { del, errorMessage, get, post, put } from "@/lib/api";
import { P } from "@/lib/permissions";
import type { Category } from "@/lib/types";
import { useOnOpen } from "@/lib/hooks";

function TaxonomyCard({ kind }: { kind: "categories" | "brands" }) {
  const qc = useQueryClient();
  const noun = kind === "categories" ? "category" : "brand";
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: [kind], queryFn: () => get<Category[]>(`/catalog/${kind}`) });

  useOnOpen(editing !== undefined, () => {
    setName(editing?.name || "");
    setDescription(editing?.description || "");
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? put(`/catalog/${kind}/${editing.id}`, { name, description })
        : post(`/catalog/${kind}`, { name, description }),
    onSuccess: () => {
      toast.success(editing ? `${name} updated` : `${name} added`);
      qc.invalidateQueries({ queryKey: [kind] });
      setEditing(undefined);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => del(`/catalog/${kind}/${id}`),
    onSuccess: () => {
      toast.success(`${deleting?.name} deleted`);
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader
        title={kind === "categories" ? "Categories" : "Brands"}
        description={`${data.length} ${data.length === 1 ? noun : kind}`}
        action={
          <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
            <Plus /> Add {noun}
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-2 px-5 pb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Empty icon={<Tags />} title={`No ${kind} yet`} />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.name}</div>
                {c.description && <div className="truncate text-xs text-fg-3">{c.description}</div>}
              </div>
              <span className="text-[13px] tabular text-fg-3">
                {c.productCount} {c.productCount === 1 ? "product" : "products"}
              </span>
              <RowMenu
                items={[
                  { label: "Rename", icon: <Pencil />, onSelect: () => setEditing(c) },
                  { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => setDeleting(c) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        title={editing ? `Edit ${noun}` : `Add ${noun}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button type="submit" form={`${kind}-form`} loading={save.isPending} disabled={!name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <form
          id={`${kind}-form`}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${noun}?`}
        description={`"${deleting?.name}" will be deleted. This only works when no product uses it.`}
        confirmLabel="Delete"
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </Card>
  );
}

export default function CategoriesPage() {
  return (
    <Guard permissions={[P.CATEGORY_BRAND_MANAGE]}>
      <PageHeader title="Categories & brands" description="Group your parts so they're easy to filter and find." />
      <div className="grid gap-4 lg:grid-cols-2">
        <TaxonomyCard kind="categories" />
        <TaxonomyCard kind="brands" />
      </div>
    </Guard>
  );
}
