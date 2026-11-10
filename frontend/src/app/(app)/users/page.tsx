"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Power, ShieldCheck, Store, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Guard } from "@/components/layout/guard";
import { ShopChip } from "@/components/layout/shop-switcher";
import { fieldsToBody, ShopDetailsSheet, ShopFieldset, shopToFields } from "@/components/shop-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field, Input, Select } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Table, TableSkeleton, Td, Th, Tr } from "@/components/ui/table";
import { del, errorMessage, get, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { dateTime, fullName } from "@/lib/format";
import { useOnOpen } from "@/lib/hooks";
import type { PermissionRow, Shop, User } from "@/lib/types";
import { LogoInput } from "@/components/logo-input";
import { LOGOS_KEY, useLogos } from "@/lib/logos";

const emptyManager = { firstName: "", lastName: "", email: "", mobile: "", password: "" };

// Adding a manager always gives them a shop: a new one, or an existing shop without a manager
function AddManagerDialog({
  open,
  onOpenChange,
  presetShop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetShop?: Shop | null;
}) {
  const qc = useQueryClient();
  const [manager, setManager] = useState(emptyManager);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [shopFields, setShopFields] = useState(shopToFields());
  const [existingShopId, setExistingShopId] = useState("");

  const { data: freeShops = [] } = useQuery({
    queryKey: ["shops", "without-manager"],
    queryFn: () => get<Shop[]>("/shop/without-manager"),
    enabled: open,
  });

  useOnOpen(open, () => {
    setManager(emptyManager);
    setShopFields(shopToFields());
    setMode(presetShop ? "existing" : "new");
    setExistingShopId(presetShop ? String(presetShop.id) : "");
  });

  const create = useMutation({
    mutationFn: () =>
      post<User>("/user", {
        ...manager,
        lastName: manager.lastName || null,
        mobile: manager.mobile || null,
        ...(mode === "existing" ? { existingShopId: Number(existingShopId) } : { shop: fieldsToBody(shopFields) }),
      }),
    onSuccess: (user) => {
      toast.success(`${user.firstName} can now sign in and run ${user.shop?.name}`);
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (key: keyof typeof emptyManager, value: string) => setManager((m) => ({ ...m, [key]: value }));
  const valid =
    manager.firstName.trim() &&
    manager.email.trim() &&
    manager.password.length >= 6 &&
    (mode === "new" ? shopFields.name.trim() : existingShopId);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Add manager & shop"
      description="A manager runs one shop and only sees that shop's stock, sales and customers."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
            {mode === "new" ? "Create manager & shop" : "Add manager"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-accent">
              <UserPlus className="size-3.5" />
            </span>
            Manager
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <Input value={manager.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus />
            </Field>
            <Field label="Last name">
              <Input value={manager.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Email" required hint="Used to sign in">
              <Input type="email" value={manager.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input type="tel" value={manager.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </Field>
          </div>
          <Field label="Password" required hint="At least 6 characters. Share it with them privately.">
            <Input
              type="text"
              value={manager.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-accent">
                <Store className="size-3.5" />
              </span>
              Their shop
            </h3>
            {freeShops.length > 0 && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-0.5">
                {(["new", "existing"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "pressable h-7 rounded-md px-3 text-xs font-medium",
                      mode === m ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-3 hover:text-fg"
                    )}
                  >
                    {m === "new" ? "Open a new shop" : "Take over a shop"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {mode === "new" ? (
            <ShopFieldset value={shopFields} onChange={setShopFields} compact />
          ) : (
            <Field
              label="Shop without a manager"
              hint="Its stock, invoices and customers carry on under the new manager."
            >
              <Select value={existingShopId} onChange={(e) => setExistingShopId(e.target.value)}>
                <option value="">Select a shop…</option>
                {freeShops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function EditManagerDialog({
  user,
  shop,
  onOpenChange,
}: {
  user: User | null;
  shop?: Shop | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const isAdminUser = user?.role === "ADMIN";
  const logos = useLogos();
  // a manager's logo is their shop's; the admin's is the business logo
  const savedLogo = (isAdminUser ? logos.business : logos.shopLogo(shop?.id)) || "";
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [logo, setLogo] = useState<string | null>(null);
  useOnOpen(!!user, () => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
    });
    setLogo(null);
  });

  const save = useMutation({
    mutationFn: async () => {
      const saved = await put<User>(`/user/${user!.id}`, {
        ...form,
        lastName: form.lastName || null,
        mobile: form.mobile || null,
      });
      if (logo !== null && logo !== savedLogo) {
        if (isAdminUser) await put("/settings", { logo });
        else if (shop) await put(`/shop/${shop.id}`, { logo });
      }
      return saved;
    },
    onSuccess: (saved) => {
      toast.success(`${saved.firstName} updated`);
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: LOGOS_KEY });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog
      open={!!user}
      onOpenChange={onOpenChange}
      title={user?.role === "ADMIN" ? "Edit your details" : "Edit manager"}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.firstName.trim() || !form.email.trim()}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
        </div>
        <Field label="Email" required hint="Used to sign in">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Mobile">
          <Input type="tel" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
        </Field>
        <div className="space-y-2 border-t border-border pt-4">
          <div>
            <div className="text-[13px] font-medium text-fg-2">Business logo</div>
            <div className="text-xs text-fg-3">
              {isAdminUser
                ? "Used on invoices of shops without their own logo."
                : `Printed on ${shop?.name ?? "their shop"}'s invoices.`}
            </div>
          </div>
          <LogoInput value={logo ?? savedLogo} onChange={setLogo} />
        </div>
      </div>
    </Dialog>
  );
}

function ResetPassword({ user, onOpenChange }: { user: User | null; onOpenChange: (o: boolean) => void }) {
  const [password, setPassword] = useState("");
  useOnOpen(!!user, () => setPassword(""));

  const save = useMutation({
    mutationFn: () => put(`/user/${user!.id}/reset-password`, { password }),
    onSuccess: () => {
      toast.success(`Password reset for ${user!.firstName}. They've been signed out on every device.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog
      open={!!user}
      onOpenChange={onOpenChange}
      title="Reset password"
      description={user ? `Set a new password for ${fullName(user)}.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={password.length < 6} loading={save.isPending} onClick={() => save.mutate()}>
            Reset password
          </Button>
        </>
      }
    >
      <Field label="New password" hint="At least 6 characters">
        <Input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="new-password"
        />
      </Field>
    </Dialog>
  );
}

function PermissionsSheet({ user, onOpenChange }: { user: User | null; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  // only the switches the admin has flipped; everything else reads from the server
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  useOnOpen(!!user, () => setOverrides({}));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: () => get<PermissionRow[]>(`/user/${user!.id}/permissions`),
    enabled: !!user,
  });

  const draft = useMemo(
    () => ({ ...Object.fromEntries(rows.map((r) => [r.permission, r.permissionVal])), ...overrides }),
    [rows, overrides]
  );

  const groups = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    rows.forEach((r) => map.set(r.category, [...(map.get(r.category) || []), r]));
    return [...map.entries()];
  }, [rows]);

  const changed = rows.filter((r) => draft[r.permission] !== r.permissionVal);
  const enabledCount = Object.values(draft).filter(Boolean).length;

  const save = useMutation({
    mutationFn: () =>
      put<PermissionRow[]>(`/user/${user!.id}/permissions`, {
        permissions: changed.map((r) => ({ permission: r.permission, permissionVal: draft[r.permission] })),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(["user-permissions", user!.id], updated);
      setOverrides({});
      toast.success(`Permissions saved for ${user!.firstName}. They apply on their next action.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setGroup = (items: PermissionRow[], value: boolean) =>
    setOverrides((d) => ({ ...d, ...Object.fromEntries(items.map((i) => [i.permission, value])) }));

  return (
    <Sheet
      open={!!user}
      onOpenChange={onOpenChange}
      title={`Permissions · ${fullName(user)}`}
      description={`${enabledCount} of ${rows.length} allowed. Admin always has full access.`}
      footer={
        <>
          <span className="mr-auto self-center text-[13px] text-fg-3">
            {changed.length ? `${changed.length} unsaved ${changed.length === 1 ? "change" : "changes"}` : "No changes"}
          </span>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={!changed.length} loading={save.isPending} onClick={() => save.mutate()}>
            Save permissions
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([category, items]) => {
            const allOn = items.every((i) => draft[i.permission]);
            return (
              <section key={category}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold">{category}</h3>
                  <button
                    className="text-xs font-medium text-accent hover:underline"
                    onClick={() => setGroup(items, !allOn)}
                  >
                    {allOn ? "Turn all off" : "Turn all on"}
                  </button>
                </div>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {items.map((item) => (
                    <li key={item.permission} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-fg">{item.description}</div>
                        <div className="font-mono text-[11px] text-fg-3">{item.permission}</div>
                      </div>
                      <Switch
                        checked={!!draft[item.permission]}
                        label={item.description}
                        onChange={(v) => setOverrides((d) => ({ ...d, [item.permission]: v }))}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

function ShopsAndManagers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [presetShop, setPresetShop] = useState<Shop | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserShop, setEditingUserShop] = useState<Shop | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [removing, setRemoving] = useState<{ user: User; shop: Shop } | null>(null);
  const [toggling, setToggling] = useState<Shop | null>(null);

  const { data: shops = [], isLoading } = useQuery({ queryKey: ["shops"], queryFn: () => get<Shop[]>("/shop") });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => get<User[]>("/user") });
  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["shops"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const toggleSignIn = useMutation({
    mutationFn: (u: User) => put<User>(`/user/${u.id}`, { isActive: !u.isActive }),
    onSuccess: (u) => {
      toast.success(u.isActive ? `${u.firstName} can sign in again` : `${u.firstName} can no longer sign in`);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggleShop = useMutation({
    mutationFn: (shop: Shop) => put<Shop>(`/shop/${shop.id}`, { isActive: !shop.isActive }),
    onSuccess: (shop) => {
      toast.success(
        shop.isActive ? `${shop.name} is open again` : `${shop.name} is closed. Its manager can't sign in.`
      );
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeManager = useMutation({
    mutationFn: (id: number) => del(`/user/${id}`),
    onSuccess: () => {
      toast.success("Manager removed. The shop and its data are kept.");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Shops & managers"
        description="Each manager runs one shop and only sees that shop. You see and manage every shop."
        actions={
          <Button
            onClick={() => {
              setPresetShop(null);
              setAddOpen(true);
            }}
          >
            <Plus /> Add manager & shop
          </Button>
        }
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Shop</Th>
              <Th>Manager</Th>
              <Th>Status</Th>
              <Th>Last sign-in</Th>
              <Th className="w-44" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton cols={5} rows={3} />
            ) : shops.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <Empty icon={<Store />} title="No shops yet" description="Add a manager to open the first shop." />
                </td>
              </tr>
            ) : (
              shops.map((shop) => {
                const m = shop.manager;
                return (
                  <Tr key={shop.id} className={shop.isActive ? "" : "opacity-60"}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ShopChip shop={shop} className="size-9 text-[11px]" />
                        <div className="min-w-0">
                          <div className="font-medium">{shop.name}</div>
                          <div className="max-w-64 truncate text-xs text-fg-3">
                            <span className="font-mono">{shop.code}</span>
                            {shop.address && ` · ${shop.address}`}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {m ? (
                        <>
                          <div className="font-medium">{fullName(m)}</div>
                          <div className="text-xs text-fg-3">{m.email}</div>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setPresetShop(shop);
                            setAddOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                        >
                          <UserPlus className="size-3.5" /> Assign a manager
                        </button>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {shop.isActive ? (
                          <Badge tone="success" dot>
                            Open
                          </Badge>
                        ) : (
                          <Badge tone="danger" dot>
                            Closed
                          </Badge>
                        )}
                        {m && !m.isActive && <Badge tone="warning">Sign-in off</Badge>}
                      </div>
                    </Td>
                    <Td className="text-fg-2">{m ? (m.lastLoginAt ? dateTime(m.lastLoginAt) : "Never") : "—"}</Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        {m && (
                          <Button size="sm" variant="secondary" onClick={() => setPermUser(m)}>
                            <ShieldCheck /> Permissions
                          </Button>
                        )}
                        <RowMenu
                          items={[
                            { label: "Edit shop details", icon: <Pencil />, onSelect: () => setEditingShop(shop) },
                            {
                              label: "Edit manager",
                              icon: <Pencil />,
                              hidden: !m,
                              onSelect: () => {
                                setEditingShop(null);
                                setEditingUserShop(shop);
                                setEditingUser(m!);
                              },
                            },
                            {
                              label: "Reset password",
                              icon: <KeyRound />,
                              hidden: !m,
                              onSelect: () => setResetUser(m!),
                            },
                            {
                              label: m?.isActive ? "Turn off sign-in" : "Turn on sign-in",
                              icon: m?.isActive ? <UserX /> : <UserCheck />,
                              hidden: !m,
                              onSelect: () => toggleSignIn.mutate(m!),
                            },
                            {
                              label: shop.isActive ? "Close shop" : "Reopen shop",
                              icon: <Power />,
                              danger: shop.isActive,
                              onSelect: () => (shop.isActive ? setToggling(shop) : toggleShop.mutate(shop)),
                            },
                            {
                              label: "Remove manager",
                              icon: <Trash2 />,
                              danger: true,
                              hidden: !m,
                              onSelect: () => setRemoving({ user: m!, shop }),
                            },
                          ]}
                        />
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {admins.length > 0 && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-accent">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <div className="text-sm font-medium">
                  {admins.map((a) => fullName(a)).join(", ")}
                  <span className="ml-2 align-middle">
                    <Badge tone="accent">Admin</Badge>
                  </span>
                </div>
                <div className="text-xs text-fg-3">Full access to every shop, the catalog, suppliers and settings.</div>
              </div>
            </div>
            {me && admins.some((a) => a.id === me.id) && (
              <Button size="sm" variant="ghost" onClick={() => setEditingUser(admins.find((a) => a.id === me.id)!)}>
                <Pencil /> Edit your details
              </Button>
            )}
          </div>
        </Card>
      )}

      <AddManagerDialog open={addOpen} onOpenChange={setAddOpen} presetShop={presetShop} />
      <EditManagerDialog
        user={editingUser}
        shop={editingUserShop}
        onOpenChange={(o) => {
          if (!o) {
            setEditingUser(null);
            setEditingUserShop(null);
          }
        }}
      />
      <ShopDetailsSheet shop={editingShop} onOpenChange={(o) => !o && setEditingShop(null)} canEditCode />
      <PermissionsSheet user={permUser} onOpenChange={(o) => !o && setPermUser(null)} />
      <ResetPassword user={resetUser} onOpenChange={(o) => !o && setResetUser(null)} />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={`Close ${toggling?.name}?`}
        description="Its manager won't be able to sign in. All of the shop's data is kept and you can reopen it any time."
        confirmLabel="Close shop"
        onConfirm={() => toggleShop.mutateAsync(toggling!)}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.user.firstName}?`}
        description={`They lose access. ${removing?.shop.name} keeps all its stock, invoices and customers, and you can hand it to a new manager.`}
        confirmLabel="Remove manager"
        onConfirm={() => removeManager.mutateAsync(removing!.user.id)}
      />
    </>
  );
}

export default function UsersPage() {
  return (
    <Guard adminOnly>
      <ShopsAndManagers />
    </Guard>
  );
}
