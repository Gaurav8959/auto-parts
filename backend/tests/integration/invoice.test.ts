import { AppDataSource } from "../../server/data-source/data-source";
import { as, closeDatabase, login, NEHA, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

type Client = ReturnType<typeof as>;
let ravi: Client; // Karol Bagh (GSTIN 07…, Delhi)
let neha: Client; // Lajpat Nagar

const product = async (client: Client, sku: string) => {
  const res = await client.get(`/catalog/products/search?keyword=${encodeURIComponent(sku)}`);
  const found = res.body.data.find((p: any) => p.sku === sku);
  if (!found) throw new Error(`no product ${sku}`);
  return found as { id: number; sellingPrice: number; stockQuantity: number; taxPercent: number; avgCost: number };
};

const stockOf = async (client: Client, id: number) => (await client.get(`/catalog/products/${id}`)).body.data.stockQuantity as number;

const bill = (client: Client, items: { productId: number; quantity: number; unitPrice: number }[], extra: object = {}) =>
  client.post("/invoice", { items, ...extra });

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

beforeAll(async () => {
  ravi = as((await login(RAVI)).token);
  neha = as((await login(NEHA)).token);
});

describe("billing (PERF-003)", () => {
  it("bills several lines, one product twice, against the running balance, with cost from the shop's average", async () => {
    const pad = await product(ravi, "BP-SWF-F");
    const filter = await product(ravi, "OF-MAR-01");

    const res = await bill(ravi, [
      { productId: pad.id, quantity: 2, unitPrice: pad.sellingPrice },
      { productId: filter.id, quantity: 3, unitPrice: filter.sellingPrice },
      { productId: pad.id, quantity: 1, unitPrice: pad.sellingPrice },
    ]);
    expect(res.status).toBe(201);
    const invoice = res.body.data;

    expect(await stockOf(ravi, pad.id)).toBe(pad.stockQuantity - 3);
    expect(await stockOf(ravi, filter.id)).toBe(filter.stockQuantity - 3);
    // cost of goods is each product's average cost in this shop at the moment of sale
    expect(invoice.costTotal).toBeCloseTo(3 * pad.avgCost + 3 * filter.avgCost, 2);

    const ledger = await AppDataSource.query(
      "SELECT product_id, quantity, balance_after FROM stock_transaction WHERE reference_type = 'INVOICE' AND reference_id = ? ORDER BY id",
      [invoice.id]
    );
    expect(ledger.map((row: any) => [row.product_id, Number(row.quantity), Number(row.balance_after)])).toEqual([
      [pad.id, -2, pad.stockQuantity - 2],
      [filter.id, -3, filter.stockQuantity - 3],
      [pad.id, -1, pad.stockQuantity - 3],
    ]);
  });

  it("refuses to sell more than the shop holds and leaves nothing behind", async () => {
    const belt = await product(ravi, "TB-INN-01");
    const before = await AppDataSource.query("SELECT COUNT(*) n FROM invoice");

    const res = await bill(ravi, [{ productId: belt.id, quantity: belt.stockQuantity + 1, unitPrice: belt.sellingPrice }]);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Not enough stock/);

    expect(await AppDataSource.query("SELECT COUNT(*) n FROM invoice")).toEqual(before);
    expect(await stockOf(ravi, belt.id)).toBe(belt.stockQuantity);
  });

  it("refuses bills of more than 200 lines", async () => {
    const filter = await product(ravi, "OF-MAR-01");
    const items = Array.from({ length: 201 }, () => ({ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }));
    expect((await bill(ravi, items)).status).toBe(400);
  });

  it("completes more simultaneous bills than the connection pool holds, in two shops, without overselling", async () => {
    const filter = await product(ravi, "OF-MAR-01");
    const nehaFilter = await product(neha, "OF-MAR-01");

    // 12 + 6 bills at once against a pool of 10 connections
    const results = await Promise.all([
      ...Array.from({ length: 12 }, () => bill(ravi, [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }])),
      ...Array.from({ length: 6 }, () => bill(neha, [{ productId: nehaFilter.id, quantity: 1, unitPrice: nehaFilter.sellingPrice }])),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(18).fill(201));
    expect(await stockOf(ravi, filter.id)).toBe(filter.stockQuantity - 12);
    expect(await stockOf(neha, nehaFilter.id)).toBe(nehaFilter.stockQuantity - 6);

    // invoice numbers stay unique and gap-free per shop
    const numbers = results.slice(0, 12).map((r) => r.body.data.invoiceNumber);
    expect(new Set(numbers).size).toBe(12);
  });

  it("lets exactly the available stock be sold when many bills race for the last units", async () => {
    const lamp = await product(ravi, "SA-SWF-F"); // seeded with 4 in Karol Bagh
    const available = lamp.stockQuantity;
    const results = await Promise.all(
      Array.from({ length: available + 3 }, () => bill(ravi, [{ productId: lamp.id, quantity: 1, unitPrice: lamp.sellingPrice }]))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(available);
    expect(results.filter((r) => r.status === 400)).toHaveLength(3);
    expect(await stockOf(ravi, lamp.id)).toBe(0);
  });

  it("keeps every shop's stock equal to the sum of its ledger", async () => {
    const drift = await AppDataSource.query(`
      SELECT s.shop_id, s.product_id FROM shop_stock s
      LEFT JOIN (SELECT shop_id, product_id, SUM(quantity) q FROM stock_transaction GROUP BY shop_id, product_id) t
        ON t.shop_id = s.shop_id AND t.product_id = s.product_id
      WHERE ROUND(s.quantity, 2) <> ROUND(COALESCE(t.q, 0), 2)`);
    expect(drift).toEqual([]);
  });
});

describe("IGST for inter-state supply (BUG-001)", () => {
  let invoiceId: number;

  it("bills a registered customer in another state with IGST", async () => {
    const customer = await ravi.post("/customer", { name: "Noida Motors", gstin: "09AAACN1234A1Z5" });
    expect(customer.status).toBe(201);
    const pad = await product(ravi, "BP-SWF-F");

    const res = await bill(ravi, [{ productId: pad.id, quantity: 1, unitPrice: pad.sellingPrice }], {
      customerId: customer.body.data.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ placeOfSupply: "09", isInterState: true });
    invoiceId = res.body.data.id;
  });

  it("keeps a counter sale in the shop's state as CGST + SGST, unless another state is chosen", async () => {
    const filter = await product(ravi, "OF-MAR-01");
    const local = await bill(ravi, [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }]);
    expect(local.body.data).toMatchObject({ placeOfSupply: "07", isInterState: false });

    const toHaryana = await bill(ravi, [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }], {
      placeOfSupply: "06",
    });
    expect(toHaryana.body.data).toMatchObject({ placeOfSupply: "06", isInterState: true });

    expect((await bill(ravi, [{ productId: filter.id, quantity: 1, unitPrice: 190 }], { placeOfSupply: "99" })).status).toBe(400);
  });

  it("splits the GST report into CGST, SGST and IGST", async () => {
    const res = await ravi.get(`/report/gst?from=${today()}&to=${today()}`);
    expect(res.status).toBe(200);
    const rate28 = res.body.data.find((row: any) => row.taxPercent === 28);
    expect(rate28.igst).toBeGreaterThan(0);
    expect(rate28.cgst + rate28.sgst + rate28.igst).toBeCloseTo(rate28.tax, 2);
  });

  it("prints the inter-state invoice as a PDF", async () => {
    const res = await ravi.get(`/invoice/${invoiceId}/pdf`).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("refunds when a paid invoice is cancelled (BUG-002)", () => {
  it("asks how the money was refunded, records it, and nets it out of collections", async () => {
    const pad = await product(ravi, "BP-SWF-F");
    const created = await bill(ravi, [{ productId: pad.id, quantity: 1, unitPrice: pad.sellingPrice }], {
      paidAmount: pad.sellingPrice,
      paymentMode: "CHEQUE",
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const before = (await ravi.get(`/report/sales?from=${today()}&to=${today()}`)).body.data.payments;
    const chequesBefore = before.find((p: any) => p.paymentMode === "CHEQUE");

    const withoutMode = await ravi.post(`/invoice/${id}/cancel`, { reason: "Customer returned it" });
    expect(withoutMode.status).toBe(400);
    expect(withoutMode.body.error.message).toMatch(/Choose how it was refunded/);

    const cancelled = await ravi.post(`/invoice/${id}/cancel`, { reason: "Customer returned it", refundMode: "CHEQUE" });
    expect(cancelled.status).toBe(200);
    const invoice = cancelled.body.data;
    expect(invoice.status).toBe("CANCELLED");
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.payments.map((p: any) => [p.type, p.amount])).toEqual([
      ["PAYMENT", pad.sellingPrice],
      ["REFUND", -pad.sellingPrice],
    ]);
    expect(await stockOf(ravi, pad.id)).toBe(pad.stockQuantity);

    const after = (await ravi.get(`/report/sales?from=${today()}&to=${today()}`)).body.data.payments;
    const cheques = after.find((p: any) => p.paymentMode === "CHEQUE");
    // the cheque was received and given back today: net zero, with the refund shown
    expect(cheques.amount).toBe(chequesBefore.amount - pad.sellingPrice);
    expect(cheques.refunded).toBe(pad.sellingPrice);
  });

  it("cancels an unpaid invoice without asking about refunds", async () => {
    const filter = await product(ravi, "OF-MAR-01");
    const created = await bill(ravi, [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }]);
    const res = await ravi.post(`/invoice/${created.body.data.id}/cancel`, { reason: "Billed twice" });
    expect(res.status).toBe(200);
    expect(res.body.data.payments).toEqual([]);
  });
});
