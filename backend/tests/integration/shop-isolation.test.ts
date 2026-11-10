import { ADMIN, as, closeDatabase, login, NEHA, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

// A manager sees and touches only their own shop, whatever ids or headers they send
describe("shop isolation", () => {
  let admin: ReturnType<typeof as>;
  let ravi: ReturnType<typeof as>;
  let nehaToken: string;
  let neha: ReturnType<typeof as>;
  let kbShopId: number;
  let invoiceId: number;
  let customerId: number;

  beforeAll(async () => {
    admin = as((await login(ADMIN)).token);
    const r = await login(RAVI);
    ravi = as(r.token);
    kbShopId = r.user.shop.id;
    nehaToken = (await login(NEHA)).token;
    neha = as(nehaToken);

    customerId = (await ravi.post("/customer", { name: "Karol Bagh Garage" })).body.data.id;
    const productId = (await ravi.get("/catalog/products/search?keyword=OF-MAR-01")).body.data[0].id;
    invoiceId = (await ravi.post("/invoice", { customerId, items: [{ productId, quantity: 1, unitPrice: 190 }] })).body.data.id;
  });

  it.each([
    ["read the invoice", () => neha.get(`/invoice/${invoiceId}`)],
    ["download its PDF", () => neha.get(`/invoice/${invoiceId}/pdf`)],
    ["take a payment on it", () => neha.post(`/invoice/${invoiceId}/payments`, { amount: 10, paymentMode: "CASH" })],
    ["cancel it", () => neha.post(`/invoice/${invoiceId}/cancel`, { reason: "not mine" })],
    ["read the customer", () => neha.get(`/customer/${customerId}`)],
    ["edit the customer", () => neha.put(`/customer/${customerId}`, { name: "Taken" })],
    ["read the other shop", () => neha.get(`/shop/${kbShopId}`)],
  ])("another shop's manager can't %s (reported as not found)", async (_, call) => {
    const res = await call();
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not found/);
  });

  it("a manager's x-shop-id header is ignored", async () => {
    const res = await as(nehaToken, kbShopId).get("/invoice");
    expect(res.status).toBe(200);
    expect(res.body.data.map((i: any) => i.id)).not.toContain(invoiceId);
  });

  it("the admin can look inside any shop", async () => {
    const res = await as((await login(ADMIN)).token, kbShopId).get(`/invoice/${invoiceId}`);
    expect(res.status).toBe(200);
    expect((await admin.get("/invoice")).body.data.map((i: any) => i.id)).toContain(invoiceId);
  });
});
