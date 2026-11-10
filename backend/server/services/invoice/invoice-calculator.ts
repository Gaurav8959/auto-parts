import { twoDecimalFloat } from "../../utilities/common.utility";

export type TCalcLine = {
  quantity: number;
  unitPrice: number; // tax inclusive
  discountPercent: number;
  taxPercent: number;
};

export type TCalcLineResult = TCalcLine & {
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
};

// Selling prices are GST-inclusive (what the customer sees on the shelf / MRP).
// Tax is carved out of the net amount rather than added on top.
// An invoice-level extra discount is spread across lines by value so every line's tax stays correct.
export const calculateInvoice = (lines: TCalcLine[], extraDiscount = 0) => {
  const gross = lines.map((l) => twoDecimalFloat(l.quantity * l.unitPrice));
  const lineDiscounts = lines.map((l, i) =>
    twoDecimalFloat((gross[i] * (l.discountPercent || 0)) / 100)
  );
  const afterLineDiscount = gross.map((g, i) => twoDecimalFloat(g - lineDiscounts[i]));
  const netBeforeExtra = afterLineDiscount.reduce((a, b) => a + b, 0);

  if (extraDiscount > netBeforeExtra) {
    throw new Error("Discount cannot be more than the bill amount.");
  }

  // allocate the extra discount; the last line absorbs rounding
  let allocated = 0;
  const extraShare = afterLineDiscount.map((value, i) => {
    if (!extraDiscount || !netBeforeExtra) return 0;
    if (i === lines.length - 1) return twoDecimalFloat(extraDiscount - allocated);
    const share = twoDecimalFloat((extraDiscount * value) / netBeforeExtra);
    allocated += share;
    return share;
  });

  const items: TCalcLineResult[] = lines.map((line, i) => {
    const lineTotal = twoDecimalFloat(afterLineDiscount[i] - extraShare[i]);
    const taxableAmount = twoDecimalFloat(lineTotal / (1 + line.taxPercent / 100));
    return {
      ...line,
      discountAmount: twoDecimalFloat(lineDiscounts[i] + extraShare[i]),
      taxableAmount,
      taxAmount: twoDecimalFloat(lineTotal - taxableAmount),
      lineTotal,
    };
  });

  const subTotal = twoDecimalFloat(gross.reduce((a, b) => a + b, 0));
  const discountTotal = twoDecimalFloat(items.reduce((a, b) => a + b.discountAmount, 0));
  const taxTotal = twoDecimalFloat(items.reduce((a, b) => a + b.taxAmount, 0));
  const netTotal = twoDecimalFloat(items.reduce((a, b) => a + b.lineTotal, 0));
  const grandTotal = Math.round(netTotal);
  const roundOff = twoDecimalFloat(grandTotal - netTotal);

  return { items, subTotal, discountTotal, taxTotal, roundOff, grandTotal };
};
