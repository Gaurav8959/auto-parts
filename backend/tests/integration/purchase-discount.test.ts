import { as, closeDatabase, login, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

// A discount on a purchase line, as a percent of the line or a flat amount off it: it comes off the
// line before GST, so the bill, the input tax and the cost that goes into stock are all after it
describe("discount on a purchase line", () => {
  let ravi: ReturnType<typeof as>;
  let supplierId: number;
  let wiper: number;
  let horn: number;

  const newProduct = async (sku: string) =>
    (await ravi.post("/catalog/products", { sku, name: sku, sellingPrice: 500, taxPercent: 18 })).body.data.id as number;
  const costOf = async (id: number) => {
    const p = (await ravi.get(`/catalog/products/${id}`)).body.data;
    return { avgCost: p.avgCost, purchasePrice: p.purchasePrice, stock: p.stockQuantity };
  };

  beforeAll(async () => {
    ravi = as((await login(RAVI)).token);
    supplierId = (await ravi.get("/supplier/all")).body.data[0].id;
    wiper = await newProduct("PD-WIPER");
    horn = await newProduct("PD-HORN");
  });

  let purchaseId: number;

  it("takes a percent or an amount off each line before GST", async () => {
    const res = await ravi.post("/purchase", {
      supplierId,
      isGst: true,
      items: [
        // 2 × ₹200 = ₹400, less 5% = ₹380, GST 18% = ₹68.40
        { productId: wiper, quantity: 2, unitCost: 200, taxPercent: 18, discountType: "PERCENT", discountValue: 5 },
        // 1 × ₹100, less ₹30 = ₹70, GST 18% = ₹12.60
        { productId: horn, quantity: 1, unitCost: 100, taxPercent: 18, discountType: "AMOUNT", discountValue: 30 },
      ],
    });
    expect(res.status).toBe(201);
    const purchase = res.body.data;
    purchaseId = purchase.id;

    expect(purchase.items.map((i: any) => [i.discountType, i.discountValue, i.discountAmount, i.taxAmount, i.lineTotal])).toEqual([
      ["PERCENT", 5, 20, 68.4, 448.4],
      ["AMOUNT", 30, 30, 12.6, 82.6],
    ]);
    expect([purchase.subTotal, purchase.discountTotal, purchase.taxTotal, purchase.grandTotal]).toEqual([450, 50, 81, 531]);

    // what each unit cost after the discount is what goes into stock
    expect(await costOf(wiper)).toEqual({ avgCost: 190, purchasePrice: 190, stock: 2 });
    expect(await costOf(horn)).toEqual({ avgCost: 70, purchasePrice: 70, stock: 1 });
  });

  it("refuses a percent over 100 or an amount over the line", async () => {
    const over = (discountType: string, discountValue: number) =>
      ravi.post("/purchase", {
        supplierId,
        items: [{ productId: horn, quantity: 1, unitCost: 100, discountType, discountValue }],
      });
    const percent = await over("PERCENT", 101);
    expect(percent.status).toBe(400);
    expect(percent.body.error.message).toMatch(/100%/);

    const amount = await over("AMOUNT", 101);
    expect(amount.status).toBe(400);
    expect(amount.body.error.message).toMatch(/more than the line/);

    expect((await costOf(horn)).stock).toBe(1);
  });

  it("redoes totals and cost when an edit changes a discount, and keeps the change in the history", async () => {
    const res = await ravi.put(`/purchase/${purchaseId}`, {
      supplierId,
      isGst: true,
      items: [
        // 10% now: ₹400 less ₹40 = ₹360
        { productId: wiper, quantity: 2, unitCost: 200, taxPercent: 18, discountType: "PERCENT", discountValue: 10 },
        { productId: horn, quantity: 1, unitCost: 100, taxPercent: 18, discountType: "AMOUNT", discountValue: 30 },
      ],
    });
    expect(res.status).toBe(200);
    const purchase = res.body.data;
    expect([purchase.subTotal, purchase.discountTotal]).toEqual([430, 70]);
    expect(await costOf(wiper)).toEqual({ avgCost: 180, purchasePrice: 180, stock: 2 });
    expect(purchase.revisions[0].changes).toEqual(expect.arrayContaining(["PD-WIPER: discount 5% → 10%"]));
  });
});
