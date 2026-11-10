import { COST_FIELDS } from "../../server/middlewares/hide-cost.middleware";
import { ADMIN, as, closeDatabase, keysOf, login, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

// SEC-005: a manager whose "See purchase cost" is switched off must not find cost anywhere
describe("cost is hidden from users without 'See purchase cost'", () => {
  let admin: ReturnType<typeof as>;
  let ravi: ReturnType<typeof as>;
  let raviId: number;
  let productId: number;
  let invoiceId: number;
  let purchaseId: number;

  beforeAll(async () => {
    admin = as((await login(ADMIN)).token);
    const manager = await login(RAVI);
    ravi = as(manager.token);
    raviId = manager.user.id;

    // something in every list: a purchase, an invoice, a stock movement
    productId = (await ravi.get("/catalog/products/search?keyword=OF-MAR-01")).body.data[0].id;
    const supplierId = (await ravi.get("/supplier/all")).body.data[0].id;
    purchaseId = (
      await ravi.post("/purchase", { supplierId, items: [{ productId, quantity: 5, unitCost: 97 }] })
    ).body.data.id;
    invoiceId = (await ravi.post("/invoice", { items: [{ productId, quantity: 1, unitPrice: 190 }] })).body.data.id;

    const revoke = await admin.put(`/user/${raviId}/permissions`, {
      permissions: [{ permission: "PRODUCT_VIEW_COST", permissionVal: false }],
    });
    expect(revoke.status).toBe(200);
  });

  afterAll(async () => {
    await admin.put(`/user/${raviId}/permissions`, {
      permissions: [{ permission: "PRODUCT_VIEW_COST", permissionVal: true }],
    });
  });

  const endpoints = () => [
    "/dashboard",
    "/catalog/products",
    "/catalog/products/search?keyword=filter",
    `/catalog/products/${productId}`,
    "/inventory/transactions",
    "/inventory/low-stock",
    "/inventory/summary",
    `/report/sales?from=${today()}&to=${today()}`,
    `/report/gst?from=${today()}&to=${today()}`,
    "/report/stock",
    "/invoice",
    `/invoice/${invoiceId}`,
    "/customer",
    "/supplier",
  ];

  it("no screen's data carries a cost, average cost, stock value or profit", async () => {
    for (const url of endpoints()) {
      const res = await ravi.get(url);
      expect([url, res.status]).toEqual([url, 200]);
      const leaked = [...keysOf(res.body)].filter((key) => COST_FIELDS.has(key));
      expect([url, leaked]).toEqual([url, []]);
    }
  });

  it("the same screens do show cost to the admin", async () => {
    const lowStock = await admin.get("/inventory/low-stock");
    const summary = await admin.get("/inventory/summary");
    const transactions = await admin.get("/inventory/transactions");
    expect(keysOf(lowStock.body).has("purchasePrice")).toBe(true);
    expect(summary.body.data.stockValue).toEqual(expect.any(Number));
    expect(keysOf(transactions.body).has("unitCost")).toBe(true);
  });

  it("purchase bills still show their prices to anyone who may view purchases", async () => {
    const res = await ravi.get(`/purchase/${purchaseId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].unitCost).toBe(97);
  });

  it("a manager without the permission can't set a cost either", async () => {
    const res = await ravi.put(`/catalog/products/${productId}`, { purchasePrice: 1 });
    expect(res.status).toBe(200);
    const asAdmin = await admin.get(`/catalog/products/${productId}`);
    expect(asAdmin.body.data.purchasePrice).not.toBe(1);
  });
});
