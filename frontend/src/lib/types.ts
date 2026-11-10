export type Role = "ADMIN" | "MANAGER";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE";
export type InvoiceStatus = "ISSUED" | "CANCELLED";
export type StockTxnType = "OPENING" | "PURCHASE" | "SALE" | "SALE_CANCELLED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

export const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"];

export type Pagination = {
  currentPage: number;
  totalPages: number;
  previousPage: number | null;
  nextPage: number | null;
  totalItems: number;
};

export type Paged<T> = { data: T[]; pagination: Pagination };

export type ShopRef = { id: number; name: string; code: string };

export type Shop = ShopRef & {
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  invoiceTerms?: string | null;
  invoicePrefix: string;
  purchasePrefix: string;
  // only on an invoice's shop; elsewhere logos come from useLogos()
  logo?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  isActive: boolean;
  manager?: User | null;
};

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName?: string | null;
  mobile?: string | null;
  role: Role;
  shop?: (ShopRef & { isActive?: boolean }) | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type PermissionRow = {
  permission: string;
  category: string;
  description: string;
  permissionOrder: number;
  permissionVal: boolean;
};

export type Category = { id: number; name: string; description?: string | null; productCount?: number };
export type Brand = Category;

export type Product = {
  id: number;
  sku: string;
  partNumber?: string | null;
  name: string;
  description?: string | null;
  category?: Category | null;
  brand?: Brand | null;
  unit: string;
  hsnCode?: string | null;
  taxPercent: number;
  purchasePrice?: number;
  sellingPrice: number;
  mrp?: number | null;
  // stock figures are for the current shop (or totals across shops in the admin's all-shops view)
  stockQuantity: number;
  reorderLevel: number;
  rackLocation?: string | null;
  avgCost?: number;
  stockByShop?: {
    shop: ShopRef;
    quantity: number;
    reorderLevel: number;
    rackLocation?: string | null;
    avgCost?: number;
  }[];
  shop?: ShopRef;
  vehicleCompatibility?: string | null;
  isActive: boolean;
};

export type Party = {
  id: number;
  shop?: ShopRef;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  notes?: string | null;
  balanceDue?: number;
  totalPurchased?: number;
  purchaseCount?: number;
  totalBilled?: number;
  invoiceCount?: number;
};

export type Payment = {
  id: number;
  // a refund (given when an invoice is cancelled) has a negative amount
  type?: "PAYMENT" | "REFUND";
  amount: number;
  paymentMode: PaymentMode;
  paidAt: string;
  note?: string | null;
  createdBy?: User;
};

export type PurchaseItem = {
  id: number;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  product?: Product;
};

export type Purchase = {
  id: number;
  shop: Shop;
  purchaseNumber: string;
  supplierBillNo?: string | null;
  purchaseDate: string;
  supplier: Party;
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  items?: PurchaseItem[];
  payments?: Payment[];
  createdBy?: User;
};

export type InvoiceItem = {
  id: number;
  productName: string;
  sku: string;
  partNumber?: string | null;
  hsnCode?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  unitCost?: number;
  product?: { id: number; name: string; sku: string };
};

export type Invoice = {
  id: number;
  shop: Shop;
  invoiceNumber: string;
  invoiceDate: string;
  customer?: Party | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerEmail?: string | null;
  dueDate?: string | null;
  vehicleNumber?: string | null;
  // GST state code; a state other than the shop's makes the tax IGST
  placeOfSupply?: string | null;
  isInterState?: boolean;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  costTotal?: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: User | null;
  notes?: string | null;
  items?: InvoiceItem[];
  payments?: Payment[];
  emails?: InvoiceEmail[];
  createdBy?: User;
};

export type InvoiceEmail = {
  id: number;
  toAddress: string;
  ccAddress?: string | null;
  subject: string;
  status: "SENT" | "FAILED";
  error?: string | null;
  createdAt: string;
  createdBy?: User;
};

export type InvoiceCopy = "ORIGINAL" | "DUPLICATE" | "TRIPLICATE";

export type StockTxn = {
  id: number;
  type: StockTxnType;
  quantity: number;
  balanceAfter: number;
  unitCost?: number | null;
  referenceType?: string | null;
  referenceId?: number | null;
  referenceNo?: string | null;
  note?: string | null;
  createdAt: string;
  product: Pick<Product, "id" | "name" | "sku" | "unit">;
  shop?: ShopRef;
  createdBy?: User;
};

// business-wide settings (each shop's own details are on Shop)
export type ShopSettings = {
  shopName: string;
  defaultTaxPercent: number;
  lowStockDefault: number;
};

// every logo the screens show, fetched once (see useLogos)
export type Logos = { business: string | null; shops: { id: number; logo: string }[] };
