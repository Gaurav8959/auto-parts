import { calculateInvoice } from "../../server/services/invoice/invoice-calculator";

describe("calculateInvoice (GST-inclusive prices)", () => {
  it("carves tax out of the price instead of adding it", () => {
    const result = calculateInvoice([{ quantity: 1, unitPrice: 118, discountPercent: 0, taxPercent: 18 }]);
    expect(result.items[0].taxableAmount).toBe(100);
    expect(result.items[0].taxAmount).toBe(18);
    expect(result.grandTotal).toBe(118);
  });

  it("spreads an extra discount by line value and keeps the totals consistent", () => {
    const result = calculateInvoice(
      [
        { quantity: 2, unitPrice: 590, discountPercent: 10, taxPercent: 18 },
        { quantity: 1, unitPrice: 1280, discountPercent: 0, taxPercent: 28 },
      ],
      100
    );
    const lines = result.items.reduce((sum, item) => sum + item.lineTotal, 0);
    expect(result.discountTotal).toBeCloseTo(118 + 100, 2);
    expect(Math.round((lines + result.roundOff) * 100) / 100).toBe(result.grandTotal);
    result.items.forEach((item) => expect(item.taxableAmount + item.taxAmount).toBeCloseTo(item.lineTotal, 2));
  });

  it("rounds the bill to the rupee", () => {
    const result = calculateInvoice([{ quantity: 3, unitPrice: 33.33, discountPercent: 0, taxPercent: 18 }]);
    expect(Number.isInteger(result.grandTotal)).toBe(true);
    expect(result.roundOff).toBeCloseTo(result.grandTotal - 99.99, 2);
  });

  it("refuses a discount larger than the bill", () => {
    expect(() => calculateInvoice([{ quantity: 1, unitPrice: 100, discountPercent: 0, taxPercent: 18 }], 101)).toThrow();
  });
});
