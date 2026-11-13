export enum TPaymentStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
}

export enum TPaymentMode {
  CASH = "CASH",
  UPI = "UPI",
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  CHEQUE = "CHEQUE",
}

export type TPurchaseItem = {
  productId: number;
  quantity: number;
  unitCost: number;
  taxPercent?: number;
};

export type TPurchase = {
  supplierId: number;
  supplierBillNo?: string;
  purchaseDate?: string;
  // false = a supplier bill without GST (every line at 0%); defaults to a GST purchase
  isGst?: boolean;
  notes?: string;
  items: TPurchaseItem[];
  paidAmount?: number;
  paymentMode?: TPaymentMode;
  updateProductCost?: boolean;
};

// Editing a recorded purchase: everything except its number and payments
export type TPurchaseUpdate = Omit<TPurchase, "paidAmount" | "paymentMode">;

export type TPurchasePayment = {
  amount: number;
  paymentMode: TPaymentMode;
  note?: string;
};

export type TPurchaseListParams = {
  shopId: number | null;
  limit: number;
  page: number;
  keyword?: string;
  supplierId?: number;
  paymentStatus?: TPaymentStatus;
  // "true" = GST purchases only, "false" = purchases without GST only
  gst?: string;
  from?: string;
  to?: string;
};
