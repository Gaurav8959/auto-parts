export enum TStockTransactionType {
  OPENING = "OPENING",
  PURCHASE = "PURCHASE",
  SALE = "SALE",
  SALE_CANCELLED = "SALE_CANCELLED",
  ADJUSTMENT_IN = "ADJUSTMENT_IN",
  ADJUSTMENT_OUT = "ADJUSTMENT_OUT",
  // the net change when an issued invoice or a recorded purchase is edited
  SALE_EDIT = "SALE_EDIT",
  PURCHASE_EDIT = "PURCHASE_EDIT",
}

export enum TAdjustmentReason {
  DAMAGED = "DAMAGED",
  LOST = "LOST",
  FOUND = "FOUND",
  RETURNED_BY_CUSTOMER = "RETURNED_BY_CUSTOMER",
  RETURNED_TO_SUPPLIER = "RETURNED_TO_SUPPLIER",
  STOCK_COUNT = "STOCK_COUNT",
  OTHER = "OTHER",
}

export type TStockAdjustment = {
  productId: number;
  type: TStockTransactionType.ADJUSTMENT_IN | TStockTransactionType.ADJUSTMENT_OUT;
  quantity: number;
  reason: TAdjustmentReason;
  note?: string;
};

export type TStockMovement = {
  shopId: number;
  productId: number;
  type: TStockTransactionType;
  // signed: +ve stock in, -ve stock out
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  referenceNo?: string;
  note?: string;
  userId: number;
};

export type TStockTransactionListParams = {
  shopId: number | null;
  limit: number;
  page: number;
  productId?: number;
  type?: TStockTransactionType;
  from?: string;
  to?: string;
};
