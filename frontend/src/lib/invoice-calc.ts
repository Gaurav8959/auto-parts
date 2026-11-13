// Mirror of backend services/invoice/invoice-calculator.ts so the screen shows exactly what will be billed.
// Prices are GST-inclusive; tax is carved out of each line, and an extra discount is spread across lines by value.
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export type CalcLine = { quantity: number; unitPrice: number; discountPercent: number; taxPercent: number };

export const calculateInvoice = (lines: CalcLine[], extraDiscount = 0) => {
  const gross = lines.map((l) => r2(l.quantity * l.unitPrice));
  const lineDiscounts = lines.map((l, i) => r2((gross[i] * (l.discountPercent || 0)) / 100));
  const afterLine = gross.map((g, i) => r2(g - lineDiscounts[i]));
  const netBeforeExtra = afterLine.reduce((a, b) => a + b, 0);
  const extra = Math.min(extraDiscount || 0, netBeforeExtra);

  let allocated = 0;
  const share = afterLine.map((value, i) => {
    if (!extra || !netBeforeExtra) return 0;
    if (i === lines.length - 1) return r2(extra - allocated);
    const s = r2((extra * value) / netBeforeExtra);
    allocated += s;
    return s;
  });

  const items = lines.map((line, i) => {
    const lineTotal = r2(afterLine[i] - share[i]);
    const taxable = r2(lineTotal / (1 + line.taxPercent / 100));
    return { lineTotal, taxAmount: r2(lineTotal - taxable), discountAmount: r2(lineDiscounts[i] + share[i]) };
  });

  const subTotal = r2(gross.reduce((a, b) => a + b, 0));
  const discountTotal = r2(items.reduce((a, b) => a + b.discountAmount, 0));
  const taxTotal = r2(items.reduce((a, b) => a + b.taxAmount, 0));
  const net = r2(items.reduce((a, b) => a + b.lineTotal, 0));
  const grandTotal = Math.round(net);

  return {
    items,
    subTotal,
    discountTotal,
    taxTotal,
    roundOff: r2(grandTotal - net),
    grandTotal,
    exceeds: (extraDiscount || 0) > netBeforeExtra,
  };
};

// The bill-level extra discount isn't stored on its own: the total discount less each line's % discount
export const extraDiscountOf = (
  lines: { quantity: number; unitPrice: number; discountPercent: number }[],
  discountTotal: number
) => {
  const lineDiscounts = lines.reduce(
    (sum, l) => sum + r2((r2(l.quantity * l.unitPrice) * (l.discountPercent || 0)) / 100),
    0
  );
  return Math.max(0, r2(discountTotal - lineDiscounts));
};

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim());
const threeDigits = (n: number) =>
  [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "", twoDigits(n % 100)].filter(Boolean).join(" ");

// UPI deep link; as a QR code it opens any UPI app with the amount filled in
export const upiPaymentLink = (upiId: string, payee: string, amount: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

// Indian numbering: crore, lakh, thousand
export const amountInWords = (amount: number) => {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return `${parts.join(" ")} Rupees Only`;
};
