export const INVOICE_NUMBER_SEQ = "INVOICE_NUMBER";
// bills without GST: a separate series from GST invoices
export const NON_GST_INVOICE_NUMBER_SEQ = "NON_GST_INVOICE_NUMBER";
export const PURCHASE_NUMBER_SEQ = "PURCHASE_NUMBER";
export const ADJUSTMENT_NUMBER_SEQ = "ADJUSTMENT_NUMBER";

export const SEQUENCE_DEFAULTS: { [key: string]: string } = {
  [INVOICE_NUMBER_SEQ]: "INV",
  [NON_GST_INVOICE_NUMBER_SEQ]: "BILL",
  [PURCHASE_NUMBER_SEQ]: "PUR",
  [ADJUSTMENT_NUMBER_SEQ]: "ADJ",
};
