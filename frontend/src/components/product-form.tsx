"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, get, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { P } from "@/lib/permissions";
import type { Brand, Category, Product, ShopSettings } from "@/lib/types";
import { Button } from "./ui/button";
import { Sheet } from "./ui/dialog";
import { Field, Input, Select, Textarea } from "./ui/input";
import { useOnOpen } from "@/lib/hooks";
import { useShopScope } from "@/lib/shop";

type FormState = {
  sku: string;
  partNumber: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  unit: string;
  hsnCode: string;
  taxPercent: string;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  reorderLevel: string;
  rackLocation: string;
  vehicleCompatibility: string;
  openingStock: string;
  isActive: boolean;
};

const UNITS = ["PCS", "SET", "PAIR", "KIT", "LTR", "ML", "KG", "MTR", "BOX"];
const TAX_RATES = ["0", "5", "12", "18", "28"];

const fromProduct = (p?: Product | null, defaultTax = 18, defaultReorder = 5): FormState => ({
  sku: p?.sku || "",
  partNumber: p?.partNumber || "",
  name: p?.name || "",
  description: p?.description || "",
  categoryId: p?.category?.id ? String(p.category.id) : "",
  brandId: p?.brand?.id ? String(p.brand.id) : "",
  unit: p?.unit || "PCS",
  hsnCode: p?.hsnCode || "",
  taxPercent: String(p?.taxPercent ?? defaultTax),
  purchasePrice: p?.purchasePrice !== undefined ? String(p.purchasePrice) : "",
  sellingPrice: p ? String(p.sellingPrice) : "",
  mrp: p?.mrp ? String(p.mrp) : "",
  reorderLevel: String(p?.reorderLevel ?? defaultReorder),
  rackLocation: p?.rackLocation || "",
  vehicleCompatibility: p?.vehicleCompatibility || "",
  openingStock: "",
  isActive: p?.isActive ?? true,
});

export function ProductForm({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canCost = can(P.PRODUCT_VIEW_COST);
  const isEdit = !!product;
  // the catalog is shared; stock, rack and reorder level belong to the current shop
  const { isAll, currentShop } = useShopScope();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => get<Category[]>("/catalog/categories"),
    enabled: open,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => get<Brand[]>("/catalog/brands"),
    enabled: open,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => get<ShopSettings>("/settings"),
    enabled: open,
  });

  const [form, setForm] = useState<FormState>(() => fromProduct(product));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useOnOpen(open, () => {
    setForm(fromProduct(product, settings?.defaultTaxPercent, settings?.lowStockDefault));
    setErrors({});
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: object) =>
      isEdit ? put<Product>(`/catalog/products/${product!.id}`, body) : post<Product>("/catalog/products", body),
    onSuccess: (saved) => {
      toast.success(isEdit ? "Product updated" : `${saved.name} added`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", saved.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.sku.trim()) next.sku = "SKU is required";
    if (!form.name.trim()) next.name = "Name is required";
    if (form.sellingPrice === "" || Number(form.sellingPrice) < 0) next.sellingPrice = "Enter a selling price";
    setErrors(next);
    if (Object.keys(next).length) return;

    const n = (v: string) => (v === "" ? undefined : Number(v));
    mutation.mutate({
      sku: form.sku.trim(),
      partNumber: form.partNumber.trim() || null,
      name: form.name.trim(),
      description: form.description || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brandId: form.brandId ? Number(form.brandId) : null,
      unit: form.unit,
      hsnCode: form.hsnCode.trim() || null,
      taxPercent: Number(form.taxPercent),
      ...(canCost && { purchasePrice: n(form.purchasePrice) ?? 0 }),
      sellingPrice: Number(form.sellingPrice),
      mrp: n(form.mrp) ?? null,
      reorderLevel: n(form.reorderLevel) ?? 0,
      ...(!isAll && { rackLocation: form.rackLocation.trim() || null }),
      vehicleCompatibility: form.vehicleCompatibility || null,
      ...(!isEdit && !isAll && n(form.openingStock) && { openingStock: n(form.openingStock) }),
      ...(isEdit && { isActive: form.isActive }),
    });
  };

  const margin =
    canCost && Number(form.sellingPrice) > 0 && Number(form.purchasePrice) > 0
      ? Number(form.sellingPrice) / (1 + Number(form.taxPercent) / 100) - Number(form.purchasePrice)
      : null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit product" : "Add product"}
      description={
        isEdit
          ? `${product?.name} · catalog changes apply to every shop`
          : "Added to the shared catalog, so every shop can stock and sell it."
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={mutation.isPending}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-6">
        <section className="space-y-4">
          <Field label="Product name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Front Brake Pad Set"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" required error={errors.sku} hint="Your shop's code for this part">
              <Input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="BP-SWF-F"
              />
            </Field>
            <Field label="Part number" hint="Manufacturer / OEM number">
              <Input
                value={form.partNumber}
                onChange={(e) => set("partNumber", e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brand">
              <Select value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Fits vehicles" hint="Searchable: e.g. Maruti Swift 2018+, Dzire">
            <Input value={form.vehicleCompatibility} onChange={(e) => set("vehicleCompatibility", e.target.value)} />
          </Field>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="text-[13px] font-semibold text-fg">Pricing & tax</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Selling price" required error={errors.sellingPrice} hint="Including GST">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => set("sellingPrice", e.target.value)}
                className="tabular"
              />
            </Field>
            <Field label="MRP">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.mrp}
                onChange={(e) => set("mrp", e.target.value)}
                className="tabular"
              />
            </Field>
            {canCost && (
              <Field label="Purchase cost" hint="Excluding GST">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => set("purchasePrice", e.target.value)}
                  className="tabular"
                />
              </Field>
            )}
            <Field label="GST rate">
              <Select value={form.taxPercent} onChange={(e) => set("taxPercent", e.target.value)}>
                {Array.from(new Set([...TAX_RATES, form.taxPercent])).map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="HSN code">
              <Input
                value={form.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
                className="font-mono"
                placeholder="8708"
              />
            </Field>
            <Field label="Unit">
              <Select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </Field>
          </div>
          {margin !== null && (
            <p className="text-[13px] text-fg-3">
              Margin per unit:{" "}
              <span className={margin < 0 ? "font-medium text-danger" : "font-medium text-fg"}>
                ₹{margin.toFixed(2)}
              </span>{" "}
              before GST
            </p>
          )}
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="text-[13px] font-semibold text-fg">
            {isAll ? "Stock defaults" : `Stock at ${currentShop?.name ?? "this shop"}`}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {!isEdit && !isAll && (
              <Field label="Opening stock" hint="Units on the shelf today">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.openingStock}
                  onChange={(e) => set("openingStock", e.target.value)}
                  className="tabular"
                />
              </Field>
            )}
            <Field
              label={isAll ? "Default reorder level" : "Reorder at"}
              hint={isAll ? "Used when a shop starts stocking it" : "Alert when stock falls to this"}
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
                className="tabular"
              />
            </Field>
            {!isAll && (
              <Field label="Rack / bin">
                <Input
                  value={form.rackLocation}
                  onChange={(e) => set("rackLocation", e.target.value.toUpperCase())}
                  placeholder="A1"
                />
              </Field>
            )}
          </div>
          <Field label="Notes">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </Field>
          {isEdit && (
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Active <span className="text-fg-3">— inactive products can&apos;t be billed</span>
            </label>
          )}
        </section>
      </form>
    </Sheet>
  );
}
