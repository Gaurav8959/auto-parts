"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { errorMessage, get, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { P } from "@/lib/permissions";
import { useShopScope } from "@/lib/shop";
import Link from "next/link";
import { ShopChip } from "@/components/layout/shop-switcher";
import { fieldsToBody, ShopFieldset, shopToFields } from "@/components/shop-form";
import type { Shop, ShopSettings } from "@/lib/types";
import { ProfileLogoCard } from "@/components/profile-logo-card";

function BusinessForm() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => get<ShopSettings>("/settings") });
  if (!data) return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />;
  return <BusinessFormFields initial={data} />;
}

// Business-wide (admin only). Each shop's own invoice details are edited separately.
function BusinessFormFields({ initial }: { initial: ShopSettings }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ShopSettings>(initial);

  const save = useMutation({
    mutationFn: () =>
      put<ShopSettings>("/settings", {
        shopName: form.shopName,
        defaultTaxPercent: Number(form.defaultTaxPercent),
        lowStockDefault: Number(form.lowStockDefault),
      }),
    onSuccess: (saved) => {
      qc.setQueryData(["settings"], saved);
      toast.success("Business settings saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader title="Business" description="Applies to every shop." />
      <form
        className="space-y-4 px-5 pb-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Business name" hint="Shown at the top of the sidebar">
          <Input value={form.shopName} onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default GST %" hint="For new products">
            <Input
              type="number"
              min="0"
              max="100"
              value={form.defaultTaxPercent}
              onChange={(e) => setForm((f) => ({ ...f, defaultTaxPercent: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Default reorder level" hint="For new products">
            <Input
              type="number"
              min="0"
              value={form.lowStockDefault}
              onChange={(e) => setForm((f) => ({ ...f, lowStockDefault: Number(e.target.value) }))}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={!form.shopName.trim()}>
            Save business settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

// The current shop's invoice details: the manager's own shop, or the shop the admin has selected
function ShopDetailsCard() {
  const { currentShop, isAll, isAdmin } = useShopScope();
  const { can } = useAuth();
  const canEdit = can(P.SETTINGS_MANAGE);

  if (isAll) {
    return (
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Shop details</h2>
        <p className="mt-1 text-[13px] text-fg-3">
          Each shop prints its own name, address, GSTIN and terms. Pick a shop in the sidebar, or edit any shop from{" "}
          <Link href="/users" className="font-medium text-accent hover:underline">
            Shops & managers
          </Link>
          .
        </p>
      </Card>
    );
  }
  if (!currentShop) return null;
  return <ShopDetailsForm key={currentShop.id} shop={currentShop} canEdit={canEdit} canEditCode={isAdmin} />;
}

function ShopDetailsForm({ shop, canEdit, canEditCode }: { shop: Shop; canEdit: boolean; canEditCode: boolean }) {
  const qc = useQueryClient();
  const [fields, setFields] = useState(shopToFields(shop));

  const save = useMutation({
    mutationFn: () => put<Shop>(`/shop/${shop.id}`, fieldsToBody(fields, { includeCode: canEditCode })),
    onSuccess: (saved) => {
      toast.success(`${saved.name} updated`);
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2.5">
            <ShopChip shop={shop} /> {shop.name}
          </span>
        }
        description="Printed on this shop's invoices."
      />
      <form
        className="px-5 pb-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <fieldset disabled={!canEdit} className="disabled:opacity-70">
          <ShopFieldset value={fields} onChange={setFields} canEditCode={canEditCode} />
        </fieldset>
        {canEdit ? (
          <div className="mt-4 flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!fields.name.trim()}>
              Save shop details
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-fg-3">Ask the admin to change these details.</p>
        )}
      </form>
    </Card>
  );
}

function ProfileForm() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    mobile: user?.mobile || "",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const saveProfile = useMutation({
    mutationFn: () => put("/me", profile),
    onSuccess: async () => {
      await refresh();
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const changePassword = useMutation({
    mutationFn: () => put("/me/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    onSuccess: () => {
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed. Other devices have been signed out.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.newPassword;

  return (
    <div className="space-y-4">
      <ProfileLogoCard />
      <Card>
        <CardHeader title="Your profile" description={user?.email} />
        <form
          className="space-y-3 px-5 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Mobile">
            <Input value={profile.mobile} onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))} />
          </Field>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              loading={saveProfile.isPending}
              disabled={!profile.firstName.trim()}
            >
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <form
          className="space-y-3 px-5 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </Field>
          <Field label="New password" hint="At least 6 characters">
            <Input
              type="password"
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </Field>
          <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
            <Input
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              loading={changePassword.isPending}
              disabled={!pw.currentPassword || pw.newPassword.length < 6 || pw.newPassword !== pw.confirm}
            >
              Change password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          isAdmin ? "Business settings, shop details and your account." : "Your shop's details and your account."
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {isAdmin && <BusinessForm />}
          <ShopDetailsCard />
        </div>
        <ProfileForm />
      </div>
    </>
  );
}
