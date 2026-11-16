import type { DiscountType } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

// A discount entered as a percent of `base` or as a flat ₹ amount, in ₹ (never more than the base)
export function discountOff(base: number, type: DiscountType | null | undefined, value: number | null | undefined) {
  const entered = Number(value) || 0;
  if (!(base > 0) || !(entered > 0)) return 0;
  return Math.min(base, round2(type === "PERCENT" ? (base * entered) / 100 : type === "AMOUNT" ? entered : 0));
}

// What's wrong with a discount on `base`, if anything: a percent stays within 100, an amount within the base
export function discountProblem(base: number, type: DiscountType, value: string, baseName: string) {
  if (value === "") return undefined;
  const entered = Number(value);
  if (!(entered >= 0)) return "Enter 0 or more";
  if (type === "PERCENT" && entered > 100) return "Can't be more than 100%";
  if (type === "AMOUNT" && entered > base) return `Can't be more than the ${baseName}`;
  return undefined;
}

// Switching the entry between % and ₹ keeps the same discount: 10% of ₹600 becomes ₹60, and back
export function convertDiscount(base: number, value: number, to: DiscountType) {
  if (!(base > 0) || !(value > 0)) return value;
  return round2(to === "AMOUNT" ? (base * value) / 100 : (value / base) * 100);
}

// A product's discount off MRP, worked out both ways (₹ and %) whichever way it was entered.
// It's a reference for whoever bills: it never changes the invoice price and is never printed.
export function mrpDiscount(
  mrp: number | null | undefined,
  type: DiscountType | null | undefined,
  value: number | null | undefined
) {
  const price = Number(mrp) || 0;
  if (price <= 0) return null;
  const off = discountOff(price, type, value);
  return {
    mrp: price,
    off,
    percent: round2((off / price) * 100),
    net: round2(price - off),
  };
}
