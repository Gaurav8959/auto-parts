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
  mrpDiscountType?: TDiscountType | null;
  mrpDiscountValue?: number | null;
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

// A discount is entered either as a percent or as a flat ₹ amount: off a product's MRP, or off a purchase line
export enum TDiscountType {
  PERCENT = "PERCENT",
  AMOUNT = "AMOUNT",
}

export enum TStockStatusFilter {
  IN_STOCK = "IN_STOCK",
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}
