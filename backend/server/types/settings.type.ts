// Business-wide settings; per-shop details are in TShop
export type TShopSettings = {
  shopName?: string;
  defaultTaxPercent?: number;
  lowStockDefault?: number;
  logo?: string;
};
