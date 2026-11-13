const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export const inr = (value: number | null | undefined) => inrFormatter.format(Number(value || 0));

export const inrCompact = (value: number | null | undefined) => inrCompactFormatter.format(Number(value || 0));

export const num = (value: number | null | undefined) => numberFormatter.format(Number(value || 0));

export const date = (value: string | Date | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const dateTime = (value: string | Date | null | undefined) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const fullName = (user?: { firstName?: string; lastName?: string | null } | null) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ");

// yyyy-mm-dd in the shop's local time
export const isoDay = (d: Date = new Date()) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

// Acronyms that shouldn't be title-cased
const LABELS: Record<string, string> = {
  UPI: "UPI",
  GST: "GST",
  SALE_EDIT: "Invoice edited",
  PURCHASE_EDIT: "Purchase edited",
};

export const label = (value?: string | null) =>
  value && LABELS[value]
    ? LABELS[value]
    : value
      ? value
          .toLowerCase()
          .split("_")
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ")
      : "";

export const plural = (count: number | undefined, one: string, many = `${one}s`) =>
  `${num(count)} ${count === 1 ? one : many}`;
