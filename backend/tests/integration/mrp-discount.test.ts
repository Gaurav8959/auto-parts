import { as, closeDatabase, login, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

// A product's discount off MRP, entered as a percent or a flat amount: a reference for whoever
// bills, so it is kept as entered and never changes what the invoice charges
describe("discount on MRP", () => {
  let ravi: ReturnType<typeof as>;
  let id: number;

  beforeAll(async () => {
    ravi = as((await login(RAVI)).token);
    const res = await ravi.post("/catalog/products", {
      sku: "MRP-DISC-01",
      name: "Horn Relay",
      sellingPrice: 520,
      mrp: 600,
      mrpDiscountType: "PERCENT",
      mrpDiscountValue: 10,
      openingStock: 5,
    });
    expect(res.status).toBe(201);
    id = res.body.data.id;
  });

  const discountOf = async () => {
    const { mrp, mrpDiscountType, mrpDiscountValue } = (await ravi.get(`/catalog/products/${id}`)).body.data;
    return { mrp, mrpDiscountType, mrpDiscountValue };
  };

  it("keeps a percent as entered, and a flat amount after an edit", async () => {
    expect(await discountOf()).toEqual({ mrp: 600, mrpDiscountType: "PERCENT", mrpDiscountValue: 10 });

    expect((await ravi.put(`/catalog/products/${id}`, { mrpDiscountType: "AMOUNT", mrpDiscountValue: 75 })).status).toBe(200);
    expect(await discountOf()).toEqual({ mrp: 600, mrpDiscountType: "AMOUNT", mrpDiscountValue: 75 });
  });

  it("refuses a percent over 100 or an amount over the MRP, and leaves the product as it was", async () => {
    const percent = await ravi.put(`/catalog/products/${id}`, { mrpDiscountType: "PERCENT", mrpDiscountValue: 101 });
    expect(percent.status).toBe(400);
    expect(percent.body.error.message).toMatch(/100%/);

    const amount = await ravi.put(`/catalog/products/${id}`, { mrpDiscountType: "AMOUNT", mrpDiscountValue: 601 });
    expect(amount.status).toBe(400);
    expect(amount.body.error.message).toMatch(/more than the MRP/);

    // lowering the MRP below a flat discount already set is refused too
    expect((await ravi.put(`/catalog/products/${id}`, { mrp: 50 })).status).toBe(400);

    expect(await discountOf()).toEqual({ mrp: 600, mrpDiscountType: "AMOUNT", mrpDiscountValue: 75 });
  });

  it("doesn't change what the invoice charges, and the invoice keeps the MRP it was billed with", async () => {
    const res = await ravi.post("/invoice", { items: [{ productId: id, quantity: 1, unitPrice: 520 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.grandTotal).toBe(520);

    const lineOf = async () => {
      const [item] = (await ravi.get(`/invoice/${res.body.data.id}`)).body.data.items;
      return { mrp: item.mrp, mrpDiscountType: item.mrpDiscountType, mrpDiscountValue: item.mrpDiscountValue };
    };
    const billed = { mrp: 600, mrpDiscountType: "AMOUNT", mrpDiscountValue: 75 };
    expect(await lineOf()).toEqual(billed);

    // a later change to the product leaves the issued invoice as it was
    await ravi.put(`/catalog/products/${id}`, { mrpDiscountType: "PERCENT", mrpDiscountValue: 20 });
    expect(await lineOf()).toEqual(billed);
    await ravi.put(`/catalog/products/${id}`, { mrpDiscountType: "AMOUNT", mrpDiscountValue: 75 });
  });

  it("is cleared along with the MRP", async () => {
    expect((await ravi.put(`/catalog/products/${id}`, { mrp: null })).status).toBe(200);
    expect(await discountOf()).toEqual({ mrp: null, mrpDiscountType: null, mrpDiscountValue: null });
  });
});
