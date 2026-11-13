export type TShop = {
  name?: string;
  code?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  invoiceTerms?: string;
  invoicePrefix?: string;
  purchasePrefix?: string;
  nonGstPrefix?: string;
  logo?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  isActive?: boolean;
};

// null = every shop (admin's consolidated view); a number = that one shop
export type TShopScope = number | null;
