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
  notes?: string;
  items: TPurchaseItem[];
  paidAmount?: number;
  paymentMode?: TPaymentMode;
  updateProductCost?: boolean;
};

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
  from?: string;
  to?: string;
};
