"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, ShoppingCart, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { clean, del, errorMessage, getPaged, post, put } from "@/lib/api";
import { inr } from "@/lib/format";
import { P, type Permission } from "@/lib/permissions";
import type { Party } from "@/lib/types";
import { Guard } from "./layout/guard";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ConfirmDialog } from "./ui/confirm";
import { Dialog } from "./ui/dialog";
import { Empty } from "./ui/empty";
import { Field, Input, Textarea } from "./ui/input";
import { RowMenu } from "./ui/menu";
import { PageHeader } from "./ui/page-header";
import { Pagination } from "./ui/pagination";
import { SearchInput } from "./ui/search-input";
import { Table, TableSkeleton, Td, Th, Tr } from "./ui/table";
import { useOnOpen } from "@/lib/hooks";
import { useShopAction, useShopScope } from "@/lib/shop";
import { ShopBadge } from "./layout/shop-switcher";

type Kind = "supplier" | "customer";

const config: Record<
  Kind,
  { title: string; description: string; view: Permission; manage: Permission; dueLabel: string; dueHint: string }
> = {
  supplier: {
    title: "Suppliers",
    description: "Shared by every shop. Amounts owed are for the shop you're viewing.",
    view: P.SUPPLIER_VIEW,
    manage: P.SUPPLIER_MANAGE,
    dueLabel: "You owe",
    dueHint: "Unpaid on purchases",
  },
  customer: {
    title: "Customers",
    description: "Garages and regulars each shop bills, and what they still owe.",
    view: P.CUSTOMER_VIEW,
    manage: P.CUSTOMER_MANAGE,
    dueLabel: "They owe",
    dueHint: "Unpaid on invoices",
  },
};

const empty = { name: "", contactPerson: "", phone: "", email: "", address: "", gstin: "", notes: "" };

function PartyForm({
  kind,
  party,
  open,
  onOpenChange,
}: {
  kind: Kind;
  party: Party | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  useOnOpen(open, () =>
    setForm(
      party
        ? {
            name: party.name,
            contactPerson: party.contactPerson || "",
            phone: party.phone || "",
            email: party.email || "",
            address: party.address || "",
            gstin: party.gstin || "",
            notes: party.notes || "",
          }
        : empty
    )
  );

  const save = useMutation({
    mutationFn: () => (party ? put<Party>(`/${kind}/${party.id}`, form) : post<Party>(`/${kind}`, form)),
    onSuccess: (saved) => {
      toast.success(party ? `${saved.name} updated` : `${saved.name} added`);
      qc.invalidateQueries({ queryKey: [kind] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={party ? `Edit ${kind}` : `Add ${kind}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="party-form" loading={save.isPending} disabled={!form.name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="party-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label={kind === "supplier" ? "Business name" : "Name"} required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Contact person">
            <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="GSTIN">
            <Input
              value={form.gstin}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              className="font-mono"
              maxLength={15}
            />
          </Field>
        </div>
        <Field label="Address">
          <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} />
        </Field>
        <Field label="Notes">
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}

function PartyList({ kind }: { kind: Kind }) {
  const { can } = useAuth();
  const { isAll } = useShopScope();
  const shopAction = useShopAction();
  // customers belong to a shop; suppliers are shared
  const showShop = kind === "customer" && isAll;
  const router = useRouter();
  const qc = useQueryClient();
  const c = config[kind];
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Party | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Party | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [kind, keyword, page],
    queryFn: () => getPaged<Party>(`/${kind}`, clean({ keyword, page, limit: 25 })),
    placeholderData: (prev) => prev,
  });

  const remove = useMutation({
    mutationFn: (id: number) => del(`/${kind}/${id}`),
    onSuccess: () => {
      toast.success(`${deleting?.name} deleted`);
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canManage = can(c.manage);
  const historyHref = (p: Party) =>
    kind === "customer"
      ? `/invoices?customerId=${p.id}&customerName=${encodeURIComponent(p.name)}`
      : `/purchases?supplierId=${p.id}&supplierName=${encodeURIComponent(p.name)}`;

  return (
    <>
      <PageHeader
        title={c.title}
        description={c.description}
        actions={
          canManage && (
            <Button
              onClick={() => {
                const open = () => {
                  setEditing(null);
                  setFormOpen(true);
                };
                if (kind === "customer") shopAction("add a customer", open);
                else open();
              }}
            >
              <Plus /> Add {kind}
            </Button>
          )
        }
      />
      <Card>
        <div className="border-b border-border p-3">
          <SearchInput
            value={keyword}
            onChange={(v) => {
              setKeyword(v);
              setPage(1);
            }}
            placeholder="Search by name, phone or GSTIN"
            className="max-w-sm"
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              {showShop && <Th>Shop</Th>}
              <Th>Phone</Th>
              <Th>GSTIN</Th>
              <Th align="right">{c.dueLabel}</Th>
              <Th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton cols={showShop ? 6 : 5} />
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={6}>
                  <Empty icon={<Users />} title={keyword ? "No matches" : `No ${kind}s yet`} />
                </td>
              </tr>
            ) : (
              data.data.map((p) => (
                <Tr key={p.id} onClick={() => router.push(historyHref(p))}>
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    {(p.contactPerson || p.address) && (
                      <div className="max-w-72 truncate text-xs text-fg-3">
                        {[p.contactPerson, p.address].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </Td>
                  {showShop && (
                    <Td>
                      <ShopBadge shop={p.shop} />
                    </Td>
                  )}
                  <Td className="tabular text-fg-2">{p.phone || "—"}</Td>
                  <Td className="font-mono text-[13px] text-fg-2">{p.gstin || "—"}</Td>
                  <Td align="right" className={p.balanceDue ? "font-medium text-warning" : "text-fg-3"}>
                    {inr(p.balanceDue)}
                  </Td>
                  <Td>
                    <RowMenu
                      items={[
                        {
                          label: kind === "customer" ? "View invoices" : "View purchases",
                          icon: kind === "customer" ? <FileText /> : <ShoppingCart />,
                          onSelect: () => router.push(historyHref(p)),
                        },
                        {
                          label: "Edit",
                          icon: <Pencil />,
                          hidden: !canManage,
                          onSelect: () => {
                            setEditing(p);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 />,
                          danger: true,
                          hidden: !canManage,
                          onSelect: () => setDeleting(p),
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>

      <PartyForm kind={kind} party={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${kind}?`}
        description={`"${deleting?.name}" will be removed from your list. Their past ${kind === "customer" ? "invoices" : "purchases"} stay.`}
        confirmLabel="Delete"
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </>
  );
}

export function PartyPage({ kind }: { kind: Kind }) {
  return (
    <Guard permissions={[config[kind].view]}>
      <PartyList kind={kind} />
    </Guard>
  );
}
