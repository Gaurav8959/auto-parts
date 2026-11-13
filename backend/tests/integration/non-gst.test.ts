import { documentTitle } from "../../server/pdf/invoice-pdf.template";
import { TInvoiceStatus } from "../../server/types/invoice.type";
import { ADMIN, as, closeDatabase, login, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

type Client = ReturnType<typeof as>;
let admin: Client;
let ravi: Client; // Karol Bagh, a GST-registered shop
let raviId: number;
let shopId: number;

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const range = () => `from=${today()}&to=${today()}`;

const product = async (sku: string) => {
  const res = await ravi.get(`/catalog/products/search?keyword=${encodeURIComponent(sku)}`);
  const found = res.body.data.find((p: any) => p.sku === sku);
  if (!found) throw new Error(`no product ${sku}`);
  return found as { id: number; sellingPrice: number; stockQuantity: number; taxPercent: number; avgCost: number };
};
const stockOf = async (id: number) => (await ravi.get(`/catalog/products/${id}`)).body.data;

// "KB-00012" -> { prefix: "KB", n: 12 }
const numberOf = (invoiceNumber: string) => {
  const [, prefix, n] = invoiceNumber.match(/^(.*)-(\d+)$/)!;
  return { prefix, n: Number(n) };
};

beforeAll(async () => {
  admin = as((await login(ADMIN)).token);
  const manager = await login(RAVI);
  ravi = as(manager.token);
  raviId = manager.user.id;
  shopId = manager.user.shop.id;
});

describe("selling without GST from the same stock", () => {
  it("bills with no tax, in its own number series, and leaves the GST invoice series unbroken", async () => {
    const pad = await product("BP-SWF-F");
    const line = { productId: pad.id, quantity: 1, unitPrice: pad.sellingPrice };

    const gstBefore = (await ravi.post("/invoice", { items: [line] })).body.data;
    expect(gstBefore.isGst).toBe(true);
    expect(gstBefore.taxTotal).toBeGreaterThan(0);

    const res = await ravi.post("/invoice", { isGst: false, items: [{ ...line, quantity: 2 }] });
    expect(res.status).toBe(201);
    const bill = res.body.data;

    expect(bill.isGst).toBe(false);
    expect(numberOf(bill.invoiceNumber).prefix).toBe("BILL");
    expect(bill.taxTotal).toBe(0);
    expect(bill.placeOfSupply).toBeNull();
    expect(bill.grandTotal).toBe(Math.round(2 * pad.sellingPrice));
    bill.items.forEach((item: any) => {
      expect(item.taxPercent).toBe(0);
      expect(item.taxAmount).toBe(0);
      expect(item.taxableAmount).toBe(item.lineTotal);
    });

    // one stock: the bill without GST took from the same count as the GST invoice
    expect((await stockOf(pad.id)).stockQuantity).toBe(pad.stockQuantity - 3);
    expect(bill.costTotal).toBeCloseTo(2 * pad.avgCost, 2);

    // the next GST invoice follows straight on from the previous one
    const gstAfter = (await ravi.post("/invoice", { items: [line] })).body.data;
    expect(numberOf(gstAfter.invoiceNumber)).toEqual({
      prefix: numberOf(gstBefore.invoiceNumber).prefix,
      n: numberOf(gstBefore.invoiceNumber).n + 1,
    });

    const next = (await ravi.post("/invoice", { isGst: false, items: [line] })).body.data;
    expect(numberOf(next.invoiceNumber)).toEqual({ prefix: "BILL", n: numberOf(bill.invoiceNumber).n + 1 });
  });

  it("keeps bills without GST out of the GST report, and counts them in sales and profit", async () => {
    const filter = await product("OF-MAR-01");
    const gstBefore = (await ravi.get(`/report/gst?${range()}`)).body.data;
    const salesBefore = (await ravi.get(`/report/sales?${range()}`)).body.data.summary;

    const bill = (
      await ravi.post("/invoice", {
        isGst: false,
        items: [{ productId: filter.id, quantity: 2, unitPrice: filter.sellingPrice }],
      })
    ).body.data;

    expect((await ravi.get(`/report/gst?${range()}`)).body.data).toEqual(gstBefore);

    const sales = (await ravi.get(`/report/sales?${range()}`)).body.data.summary;
    expect(sales.nonGstCount).toBe(salesBefore.nonGstCount + 1);
    expect(sales.nonGstSales).toBeCloseTo(salesBefore.nonGstSales + bill.grandTotal, 2);
    expect(sales.gstSales).toBeCloseTo(salesBefore.gstSales, 2);
    expect(sales.tax).toBeCloseTo(salesBefore.tax, 2);
    // with no GST in it, the whole bill less its cost is profit
    expect(sales.profit).toBeCloseTo(salesBefore.profit + bill.grandTotal - bill.costTotal, 2);
  });

  it("filters the invoice list by GST or not", async () => {
    const withoutGst = (await ravi.get("/invoice?gst=false&limit=200")).body.data;
    const withGst = (await ravi.get("/invoice?gst=true&limit=200")).body.data;
    expect(withoutGst.length).toBeGreaterThan(0);
    expect(withoutGst.every((i: any) => i.isGst === false)).toBe(true);
    expect(withGst.every((i: any) => i.isGst === true)).toBe(true);
  });

  it("is refused to a manager whose 'Make bills without GST' is switched off", async () => {
    const filter = await product("OF-MAR-01");
    const items = [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }];
    const revoke = await admin.put(`/user/${raviId}/permissions`, {
      permissions: [{ permission: "INVOICE_NON_GST", permissionVal: false }],
    });
    expect(revoke.status).toBe(200);
    try {
      const refused = await ravi.post("/invoice", { isGst: false, items });
      expect(refused.status).toBe(403);
      expect((await ravi.post("/invoice", { items })).status).toBe(201);
    } finally {
      await admin.put(`/user/${raviId}/permissions`, {
        permissions: [{ permission: "INVOICE_NON_GST", permissionVal: true }],
      });
    }
  });

  it("prints as a bill, not a tax invoice", async () => {
    const filter = await product("OF-MAR-01");
    const bill = (
      await ravi.post("/invoice", { isGst: false, items: [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }] })
    ).body.data;

    const pdf = await ravi.get(`/invoice/${bill.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);

    expect(documentTitle({ isGst: false, status: TInvoiceStatus.ISSUED })).toBe("BILL");
    expect(documentTitle({ isGst: false, status: TInvoiceStatus.CANCELLED })).toBe("CANCELLED BILL");
    expect(documentTitle({ isGst: true, status: TInvoiceStatus.ISSUED })).toBe("TAX INVOICE");
  });

  it("won't let both series share one prefix", async () => {
    const shop = (await ravi.get(`/shop/${shopId}`)).body.data;
    const res = await ravi.put(`/shop/${shopId}`, { nonGstPrefix: shop.invoicePrefix });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/different prefix/);
  });
});

describe("buying without GST into the same stock", () => {
  it("records a supplier bill without GST at 0%, with the price paid as the cost", async () => {
    const belt = await product("TB-INN-01");
    const supplierId = (await ravi.get("/supplier/all")).body.data[0].id;

    // a GST rate sent by mistake is ignored on a purchase without GST
    const res = await ravi.post("/purchase", {
      supplierId,
      isGst: false,
      items: [{ productId: belt.id, quantity: 4, unitCost: 100, taxPercent: 18 }],
    });
    expect(res.status).toBe(201);
    const purchase = res.body.data;
    expect(purchase.isGst).toBe(false);
    expect(purchase.taxTotal).toBe(0);
    expect(purchase.grandTotal).toBe(400);
    expect(purchase.items[0].taxPercent).toBe(0);

    const after = await stockOf(belt.id);
    expect(after.stockQuantity).toBe(belt.stockQuantity + 4);
    const expectedAvg = (belt.stockQuantity * belt.avgCost + 4 * 100) / (belt.stockQuantity + 4);
    expect(after.avgCost).toBeCloseTo(expectedAvg, 1);
  });

  it("counts only purchases with GST as input tax, and splits purchase totals", async () => {
    const belt = await product("TB-INN-01");
    const supplierId = (await ravi.get("/supplier/all")).body.data[0].id;
    const rateRow = (rows: any[]) => rows.find((r) => r.taxPercent === 18) || { taxable: 0, tax: 0 };

    const inputBefore = rateRow((await ravi.get(`/report/gst-input?${range()}`)).body.data);
    const salesBefore = (await ravi.get(`/report/sales?${range()}`)).body.data.summary;

    const withGst = (
      await ravi.post("/purchase", { supplierId, items: [{ productId: belt.id, quantity: 2, unitCost: 100, taxPercent: 18 }] })
    ).body.data;
    const withoutGst = (
      await ravi.post("/purchase", { supplierId, isGst: false, items: [{ productId: belt.id, quantity: 3, unitCost: 100 }] })
    ).body.data;
    expect(withGst.isGst).toBe(true);
    expect(withGst.grandTotal).toBe(236);
    expect(withoutGst.grandTotal).toBe(300);

    const input = rateRow((await ravi.get(`/report/gst-input?${range()}`)).body.data);
    expect(input.taxable).toBeCloseTo(inputBefore.taxable + 200, 2);
    expect(input.tax).toBeCloseTo(inputBefore.tax + 36, 2);

    const sales = (await ravi.get(`/report/sales?${range()}`)).body.data.summary;
    expect(sales.gstPurchaseTotal).toBeCloseTo(salesBefore.gstPurchaseTotal + 236, 2);
    expect(sales.nonGstPurchaseTotal).toBeCloseTo(salesBefore.nonGstPurchaseTotal + 300, 2);

    const listed = (await ravi.get("/purchase?gst=false&limit=200")).body.data.map((p: any) => p.id);
    expect(listed).toContain(withoutGst.id);
    expect(listed).not.toContain(withGst.id);
  });
});
