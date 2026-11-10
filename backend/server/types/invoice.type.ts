import { TPaymentMode, TPaymentStatus } from "./purchase.type";

export enum TInvoiceStatus {
  ISSUED = "ISSUED",
  CANCELLED = "CANCELLED",
}

// money received against an invoice, or paid back when it is cancelled (stored as a negative amount)
export enum TInvoicePaymentType {
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
}

export type TInvoiceItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
};

export type TInvoice = {
  customerId?: number;
  // walk-in customer details when no customer record is selected
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleNumber?: string;
  // days the customer has to pay; 0 = due on receipt
  paymentTermsDays?: number;
  invoiceDate?: string;
  // GST state code of the place of supply; defaults to the buyer's GSTIN state, else the shop's
  placeOfSupply?: string;
  notes?: string;
  items: TInvoiceItem[];
  extraDiscount?: number;
  paidAmount?: number;
  paymentMode?: TPaymentMode;
};

export type TInvoicePayment = {
  amount: number;
  paymentMode: TPaymentMode;
  note?: string;
};

export type TInvoiceCancel = {
  reason: string;
  // how the amount already paid was given back; required when anything was paid
  refundMode?: TPaymentMode;
};

export type TInvoiceListParams = {
  shopId: number | null;
  limit: number;
  page: number;
  keyword?: string;
  customerId?: number;
  paymentStatus?: TPaymentStatus;
  status?: TInvoiceStatus;
  overdue?: string;
  from?: string;
  to?: string;
};

export type TInvoiceEmailRequest = {
  to: string;
  cc?: string;
  subject?: string;
  message?: string;
  copy?: TInvoiceCopy;
  saveToCustomer?: boolean;
};

// the label printed at the top of a GST invoice copy
export enum TInvoiceCopy {
  ORIGINAL = "ORIGINAL",
  DUPLICATE = "DUPLICATE",
  TRIPLICATE = "TRIPLICATE",
}
