export type TCategory = {
  name: string;
  description?: string;
};

export type TBrand = {
  name: string;
  description?: string;
};

export type TProduct = {
  sku: string;
  partNumber?: string;
  name: string;
  description?: string;
  categoryId?: number;
  brandId?: number;
  unit?: string;
  hsnCode?: string;
  taxPercent?: number;
  purchasePrice?: number;
  sellingPrice: number;
  mrp?: number;
  reorderLevel?: number;
  rackLocation?: string;
  vehicleCompatibility?: string;
  openingStock?: number;
  isActive?: boolean;
};

export type TProductListParams = {
  shopId: number | null;
  limit: number;
  page: number;
  keyword?: string;
  categoryId?: number;
  brandId?: number;
  stockStatus?: TStockStatusFilter;
  isActive?: string;
};

export enum TStockStatusFilter {
  IN_STOCK = "IN_STOCK",
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}
