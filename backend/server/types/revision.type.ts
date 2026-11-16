export enum TRevisionDocument {
  INVOICE = "INVOICE",
  PURCHASE = "PURCHASE",
}

// One line of a document, as compared between two versions
export type TRevisionLine = {
  productId: number;
  name: string;
  quantity: number;
  // selling price on an invoice, unit cost on a purchase
  price: number;
  discountPercent?: number;
  // a discount entered as a percent or an amount, as shown: "5%" or "₹24.00"
  discount?: string;
  taxPercent?: number;
};
