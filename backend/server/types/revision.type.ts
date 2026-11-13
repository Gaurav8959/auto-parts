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
  taxPercent?: number;
};
