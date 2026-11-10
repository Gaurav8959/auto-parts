import { MysqlQueryRunner } from "typeorm/driver/mysql/MysqlQueryRunner";
import { ADMIN, as, closeDatabase, keysOf, login, NEHA, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

// a valid 1×1 PNG, padded so it is clearly "large"
const LOGO = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg${"A".repeat(20000)}==`;
const BUSINESS_LOGO = LOGO.replace("iVBOR", "iVBOr");

let admin: ReturnType<typeof as>;
let ravi: ReturnType<typeof as>;
let neha: ReturnType<typeof as>;
let kbShopId: number;
let lnShopId: number;

beforeAll(async () => {
  admin = as((await login(ADMIN)).token);
  const r = await login(RAVI);
  const n = await login(NEHA);
  ravi = as(r.token);
  neha = as(n.token);
  kbShopId = r.user.shop.id;
  lnShopId = n.user.shop.id;

  expect((await admin.put("/me/logo", { logo: BUSINESS_LOGO })).status).toBe(200);
  expect((await ravi.put("/me/logo", { logo: LOGO })).status).toBe(200);
});

describe("logos stay off the busy paths (PERF-001)", () => {
  it("settings, shops, the signed-in user and lists don't carry logos", async () => {
    const responses = await Promise.all([
      admin.get("/settings"),
      admin.get("/shop"),
      ravi.get("/me"),
      ravi.get(`/shop/${kbShopId}`),
      ravi.get("/customer"),
      admin.get("/user"),
      admin.get("/dashboard"),
    ]);
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(keysOf(res.body).has("logo")).toBe(false);
      expect(JSON.stringify(res.body).length).toBeLessThan(20000);
    });
  });

  it("each user gets the logos they need, once, from /settings/logos", async () => {
    const forAdmin = (await admin.get("/settings/logos")).body.data;
    expect(forAdmin.business).toBe(BUSINESS_LOGO);
    expect(forAdmin.shops).toEqual([{ id: kbShopId, logo: LOGO }]);

    const forRavi = (await ravi.get("/settings/logos")).body.data;
    expect(forRavi.shops).toEqual([{ id: kbShopId, logo: LOGO }]);

    // Lajpat Nagar has no logo of its own
    const forNeha = (await neha.get("/settings/logos")).body.data;
    expect(forNeha).toEqual({ business: BUSINESS_LOGO, shops: [] });
  });

  it("an invoice prints its shop's logo, or the business logo when the shop has none", async () => {
    const kbProduct = (await ravi.get("/catalog/products/search?keyword=OF-MAR-01")).body.data[0];
    const kb = await ravi.post("/invoice", { items: [{ productId: kbProduct.id, quantity: 1, unitPrice: 190 }] });
    expect(kb.body.data.shop.logo).toBe(LOGO);

    const lnProduct = (await neha.get("/catalog/products/search?keyword=OF-MAR-01")).body.data[0];
    const ln = await neha.post("/invoice", { items: [{ productId: lnProduct.id, quantity: 1, unitPrice: 190 }] });
    expect(ln.body.data.shop.logo).toBe(BUSINESS_LOGO);
    expect(ln.body.data.shop.id).toBe(lnShopId);
  });
});

describe("dashboard (PERF-002)", () => {
  // counts every SQL statement and the most that run at the same time
  const watchQueries = async (run: () => Promise<unknown>) => {
    const original = MysqlQueryRunner.prototype.query;
    let total = 0;
    let running = 0;
    let peak = 0;
    const spy = jest.spyOn(MysqlQueryRunner.prototype, "query").mockImplementation(async function (this: any, ...args: any[]) {
      total++;
      peak = Math.max(peak, ++running);
      try {
        return await (original as any).apply(this, args);
      } finally {
        running--;
      }
    });
    try {
      await run();
    } finally {
      spy.mockRestore();
    }
    return { total, peak };
  };

  it("uses a handful of queries, well under the connection pool", async () => {
    const auth = await watchQueries(() => admin.get("/settings/mail"));
    const all = await watchQueries(() => admin.get("/dashboard"));
    const oneShop = await watchQueries(() => ravi.get("/dashboard"));

    expect(all.total - auth.total).toBeLessThanOrEqual(8);
    expect(all.peak).toBeLessThanOrEqual(6);
    expect(oneShop.peak).toBeLessThanOrEqual(6);
  });

  it("adds up: the business totals are the sum of the shops", async () => {
    const all = (await admin.get("/dashboard")).body.data;
    expect(all.shops.map((s: any) => s.id).sort()).toEqual([kbShopId, lnShopId].sort());
    const shopsToday = all.shops.reduce((sum: number, s: any) => sum + s.todaySales, 0);
    const shopsReceivable = all.shops.reduce((sum: number, s: any) => sum + s.receivable, 0);
    expect(all.today.total).toBeCloseTo(shopsToday, 2);
    expect(all.receivable).toBeCloseTo(shopsReceivable, 2);
    expect(all.lowStock.length).toBeLessThanOrEqual(8);

    const kb = (await ravi.get("/dashboard")).body.data;
    expect(kb.shops).toBeNull();
    expect(kb.today.total).toBeCloseTo(all.shops.find((s: any) => s.id === kbShopId).todaySales, 2);
  });
});
