"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, PackageSearch, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Guard } from "@/components/layout/guard";
import { ProductForm } from "@/components/product-form";
import { StockAdjustDialog } from "@/components/stock-adjust-dialog";
import { Badge, StockBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Empty } from "@/components/ui/empty";
import { Select } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableSkeleton, Td, Th, Tr } from "@/components/ui/table";
import { clean, del, errorMessage, get, getPaged } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { P } from "@/lib/permissions";
import type { Brand, Category, Product } from "@/lib/types";
import { useShopAction, useShopScope } from "@/lib/shop";

function Products() {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canCost = can(P.PRODUCT_VIEW_COST);
  const { isAll, currentShop } = useShopScope();
  const shopAction = useShopAction();

  const [filters, setFilters] = useState({ keyword: "", categoryId: "", brandId: "", stockStatus: "", page: 1 });
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const { data, isLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => getPaged<Product>("/catalog/products", clean({ ...filters, limit: 25 })),
    placeholderData: (prev) => prev,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => get<Category[]>("/catalog/categories"),
  });
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: () => get<Brand[]>("/catalog/brands") });

  const remove = useMutation({
    mutationFn: (id: number) => del(`/catalog/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const filtered = filters.keyword || filters.categoryId || filters.brandId || filters.stockStatus;

  return (
    <>
      <PageHeader
        title="Products"
        description={
          isAll
            ? "The shared catalog. Stock shown is the total across all shops."
            : `The shared catalog, with stock at ${currentShop?.name ?? "your shop"}.`
        }
        actions={
          can(P.PRODUCT_CREATE) && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Add product
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          <SearchInput
            value={filters.keyword}
            onChange={(v) => setFilter("keyword", v)}
            placeholder="Name, SKU, part no. or vehicle"
            className="min-w-56 flex-1"
          />
          <Select
            value={filters.categoryId}
            onChange={(e) => setFilter("categoryId", e.target.value)}
            className="w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={filters.brandId} onChange={(e) => setFilter("brandId", e.target.value)} className="w-auto">
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.stockStatus}
            onChange={(e) => setFilter("stockStatus", e.target.value)}
            className="w-auto"
          >
            <option value="">Any stock</option>
            <option value="IN_STOCK">In stock</option>
            <option value="LOW_STOCK">Running low</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </Select>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              {!isAll && <Th>Rack</Th>}
              {canCost && <Th align="right">Avg cost</Th>}
              <Th align="right">Price</Th>
              <Th align="right">{isAll ? "Total stock" : "Stock"}</Th>
              <Th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton cols={6 + (canCost ? 1 : 0) - (isAll ? 1 : 0)} />
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={7}>
                  <Empty
                    icon={<PackageSearch />}
                    title={filtered ? "No products match" : "No products yet"}
                    description={
                      filtered
                        ? "Try a different search or clear the filters."
                        : "Add your first part to start billing and tracking stock."
                    }
                  />
                </td>
              </tr>
            ) : (
              data.data.map((p) => (
                <Tr key={p.id} onClick={() => router.push(`/products/${p.id}`)}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {!p.isActive && <Badge>Inactive</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-fg-3">
                      <span className="font-mono">{p.sku}</span>
                      {p.brand && ` · ${p.brand.name}`}
                      {p.vehicleCompatibility && <span className="hidden md:inline"> · {p.vehicleCompatibility}</span>}
                    </div>
                  </Td>
                  <Td className="text-fg-2">{p.category?.name || "—"}</Td>
                  {!isAll && <Td className="font-mono text-[13px] text-fg-2">{p.rackLocation || "—"}</Td>}
                  {canCost && (
                    <Td align="right" className="text-fg-2">
                      {inr(p.avgCost ?? p.purchasePrice)}
                    </Td>
                  )}
                  <Td align="right" className="font-medium">
                    {inr(p.sellingPrice)}
                  </Td>
                  <Td align="right">
                    <StockBadge quantity={p.stockQuantity} reorderLevel={p.reorderLevel} unit={p.unit} />
                  </Td>
                  <Td>
                    <RowMenu
                      items={[
                        {
                          label: "Edit",
                          icon: <Pencil />,
                          hidden: !can(P.PRODUCT_UPDATE),
                          onSelect: () => {
                            setEditing(p);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: "Adjust stock",
                          icon: <Boxes />,
                          hidden: !can(P.STOCK_ADJUST),
                          onSelect: () => shopAction("adjust stock", () => setAdjusting(p)),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 />,
                          danger: true,
                          hidden: !can(P.PRODUCT_DELETE),
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
        <Pagination pagination={data?.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
      </Card>

      <ProductForm open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <StockAdjustDialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)} product={adjusting} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete product?"
        description={`"${deleting?.name}" will be removed from the catalog. Past invoices and purchases keep their records.`}
        confirmLabel="Delete"
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Guard permissions={[P.PRODUCT_VIEW]}>
      <Products />
    </Guard>
  );
}
