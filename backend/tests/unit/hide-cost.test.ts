import { withoutCost } from "../../server/middlewares/hide-cost.middleware";

describe("withoutCost (SEC-005)", () => {
  it("removes cost fields at any depth and keeps everything else", () => {
    const at = new Date("2026-10-28T10:00:00Z");
    const result = withoutCost({
      id: 1,
      purchasePrice: 620,
      sellingPrice: 1150,
      invoiceDate: at,
      stock: { stockValue: 900, retailValue: 1500 },
      items: [{ unitCost: 100, unitPrice: 200, product: { purchasePrice: 99, name: "Pad" } }],
      summary: { sales: 10, cost: 4, profit: 6 },
      shops: [{ monthProfit: 5, monthSales: 9 }],
    });

    expect(result).toEqual({
      id: 1,
      sellingPrice: 1150,
      invoiceDate: at,
      stock: { retailValue: 1500 },
      items: [{ unitPrice: 200, product: { name: "Pad" } }],
      summary: { sales: 10 },
      shops: [{ monthSales: 9 }],
    });
    expect(result.invoiceDate).toBeInstanceOf(Date);
  });

  it("passes plain values through", () => {
    expect(withoutCost(null)).toBeNull();
    expect(withoutCost("x")).toBe("x");
    expect(withoutCost([1, 2])).toEqual([1, 2]);
  });
});
