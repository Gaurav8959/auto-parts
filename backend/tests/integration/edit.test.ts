import { AppDataSource } from "../../server/data-source/data-source";
import { ADMIN, as, closeDatabase, login, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

type Client = ReturnType<typeof as>;
let admin: Client;
let ravi: Client; // Karol Bagh
let raviId: number;

const product = async (sku: string) => {
  const res = await ravi.get(`/catalog/products/search?keyword=${encodeURIComponent(sku)}`);
  const found = res.body.data.find((p: any) => p.sku === sku);
  if (!found) throw new Error(`no product ${sku}`);
  return found as { id: number; name: string; sellingPrice: number; stockQuantity: number; taxPercent: number; avgCost: number };
};
const stockOf = async (id: number) => (await ravi.get(`/catalog/products/${id}`)).body.data;
const supplierId = async () => (await ravi.get("/supplier/all")).body.data[0].id;

const withPermission = async (permission: string, run: () => Promise<void>) => {
  await admin.put(`/user/${raviId}/permissions`, { permissions: [{ permission, permissionVal: false }] });
  try {
    await run();
  } finally {
    await admin.put(`/user/${raviId}/permissions`, { permissions: [{ permission, permissionVal: true }] });
  }
};

beforeAll(async () => {
  admin = as((await login(ADMIN)).token);
  const manager = await login(RAVI);
  ravi = as(manager.token);
  raviId = manager.user.id;
});

describe("editing an invoice", () => {
  it("changes lines in place: same number, totals redone, stock moved by the difference, edit kept in history", async () => {
    const pad = await product("BP-SWF-F");
    const filter = await product("OF-MAR-01");
    const plug = await product("SP-IR-4");

    const created = (
      await ravi.post("/invoice", {
        customerName: "Before Edit",
        items: [
          { productId: pad.id, quantity: 2, unitPrice: pad.sellingPrice },
          { productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice },
        ],
      })
    ).body.data;

    const res = await ravi.put(`/invoice/${created.id}`, {
      customerName: "After Edit",
      vehicleNumber: "dl1ca0001",
      items: [
        { productId: pad.id, quantity: 3, unitPrice: pad.sellingPrice },
        { productId: plug.id, quantity: 2, unitPrice: plug.sellingPrice },
      ],
    });
    expect(res.status).toBe(200);
    const edited = res.body.data;

    expect(edited.invoiceNumber).toBe(created.invoiceNumber);
    expect(edited.customerName).toBe("After Edit");
    expect(edited.vehicleNumber).toBe("DL1CA0001");
    expect(edited.items.map((i: any) => [i.product.id, i.quantity])).toEqual([
      [pad.id, 3],
      [plug.id, 2],
    ]);
    expect(edited.grandTotal).toBe(Math.round(3 * pad.sellingPrice + 2 * plug.sellingPrice));
    expect(edited.taxTotal).toBeGreaterThan(0);

    // stock: pad 2 -> 3 sold, filter given back, plug newly sold
    expect((await stockOf(pad.id)).stockQuantity).toBe(pad.stockQuantity - 3);
    expect((await stockOf(filter.id)).stockQuantity).toBe(filter.stockQuantity);
    expect((await stockOf(plug.id)).stockQuantity).toBe(plug.stockQuantity - 2);
    const ledger = await AppDataSource.query(
      "SELECT product_id, quantity FROM stock_transaction WHERE reference_type = 'INVOICE' AND reference_id = ? AND type = 'SALE_EDIT' ORDER BY product_id",
      [created.id]
    );
    expect(ledger.map((r: any) => [r.product_id, Number(r.quantity)]).sort()).toEqual(
      [
        [pad.id, -1],
        [filter.id, 1],
        [plug.id, -2],
      ].sort()
    );

    expect(edited.revisions).toHaveLength(1);
    const changes: string[] = edited.revisions[0].changes;
    expect(changes).toEqual(
      expect.arrayContaining([
        "Customer: Before Edit → After Edit",
        `${pad.name}: quantity 2 → 3`,
        `Added ${plug.name} × 2 at ₹${plug.sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        `Removed ${filter.name} (1)`,
        expect.stringMatching(/^Total: /),
      ])
    );
    expect(edited.revisions[0].createdBy.firstName).toBeTruthy();
  });

  it("saves nothing when nothing changed", async () => {
    const filter = await product("OF-MAR-01");
    const items = [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }];
    const created = (await ravi.post("/invoice", { items })).body.data;
    const res = await ravi.put(`/invoice/${created.id}`, { items });
    expect(res.status).toBe(200);
    expect(res.body.data.revisions).toHaveLength(0);
  });

  it("keeps a bill without GST without GST, in its own series", async () => {
    const filter = await product("OF-MAR-01");
    const bill = (
      await ravi.post("/invoice", { isGst: false, items: [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }] })
    ).body.data;
    const edited = (
      await ravi.put(`/invoice/${bill.id}`, { items: [{ productId: filter.id, quantity: 3, unitPrice: filter.sellingPrice }] })
    ).body.data;
    expect(edited.invoiceNumber).toBe(bill.invoiceNumber);
    expect(edited.isGst).toBe(false);
    expect(edited.taxTotal).toBe(0);
    expect(edited.grandTotal).toBe(3 * filter.sellingPrice);

    // the kind of bill can't be switched by an edit
    expect((await ravi.put(`/invoice/${bill.id}`, { isGst: true, items: [] })).status).toBe(400);
  });

  it("won't take the total below what has already been paid", async () => {
    const filter = await product("OF-MAR-01");
    const paid = (
      await ravi.post("/invoice", {
        items: [{ productId: filter.id, quantity: 2, unitPrice: filter.sellingPrice }],
        paidAmount: 2 * filter.sellingPrice,
        paymentMode: "CASH",
      })
    ).body.data;
    const res = await ravi.put(`/invoice/${paid.id}`, {
      items: [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already been paid/);
    expect((await ravi.get(`/invoice/${paid.id}`)).body.data.items[0].quantity).toBe(2);
  });

  it("refuses to sell more than the shop holds, and leaves the invoice as it was", async () => {
    const belt = await product("TB-INN-01");
    const filter = await product("OF-MAR-01");
    const created = (await ravi.post("/invoice", { items: [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }] })).body.data;
    const res = await ravi.put(`/invoice/${created.id}`, {
      items: [{ productId: belt.id, quantity: belt.stockQuantity + 1, unitPrice: belt.sellingPrice }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Not enough stock/);
    const after = (await ravi.get(`/invoice/${created.id}`)).body.data;
    expect(after.items.map((i: any) => i.product.id)).toEqual([filter.id]);
    expect((await stockOf(belt.id)).stockQuantity).toBe(belt.stockQuantity);
  });

  it("can't edit a cancelled invoice", async () => {
    const filter = await product("OF-MAR-01");
    const items = [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }];
    const created = (await ravi.post("/invoice", { items })).body.data;
    await ravi.post(`/invoice/${created.id}/cancel`, { reason: "wrong customer" });
    const res = await ravi.put(`/invoice/${created.id}`, { items: [{ ...items[0], quantity: 2 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cancelled/);
  });

  it("is refused to a manager whose 'Edit issued invoices' is switched off", async () => {
    const filter = await product("OF-MAR-01");
    const items = [{ productId: filter.id, quantity: 1, unitPrice: filter.sellingPrice }];
    const created = (await ravi.post("/invoice", { items })).body.data;
    await withPermission("INVOICE_EDIT", async () => {
      expect((await ravi.put(`/invoice/${created.id}`, { items: [{ ...items[0], quantity: 2 }] })).status).toBe(403);
    });
  });
});

describe("editing a purchase", () => {
  it("moves stock by the difference and redoes the average cost as if entered that way", async () => {
    const disc = await product("BD-I20-F");
    const supplier = await supplierId();
    const startQty = disc.stockQuantity;
    const startValue = startQty * disc.avgCost;

    const purchase = (
      await ravi.post("/purchase", { supplierId: supplier, items: [{ productId: disc.id, quantity: 10, unitCost: 1000, taxPercent: 28 }] })
    ).body.data;
    expect((await stockOf(disc.id)).stockQuantity).toBe(startQty + 10);

    const res = await ravi.put(`/purchase/${purchase.id}`, {
      supplierId: supplier,
      supplierBillNo: "FIXED-001",
      items: [{ productId: disc.id, quantity: 12, unitCost: 1200, taxPercent: 28 }],
    });
    expect(res.status).toBe(200);
    const edited = res.body.data;
    expect(edited.purchaseNumber).toBe(purchase.purchaseNumber);
    expect(edited.grandTotal).toBeCloseTo(12 * 1200 * 1.28, 2);

    const after = await stockOf(disc.id);
    expect(after.stockQuantity).toBe(startQty + 12);
    expect(after.avgCost).toBeCloseTo((startValue + 12 * 1200) / (startQty + 12), 1);

    expect(edited.revisions[0].changes).toEqual(
      expect.arrayContaining([
        "Supplier bill no.: — → FIXED-001",
        `${disc.name}: quantity 10 → 12, cost ₹1,000.00 → ₹1,200.00`,
      ])
    );
  });

  it("switches a purchase to without GST", async () => {
    const filter = await product("OF-MAR-01");
    const supplier = await supplierId();
    const purchase = (
      await ravi.post("/purchase", { supplierId: supplier, items: [{ productId: filter.id, quantity: 2, unitCost: 100, taxPercent: 18 }] })
    ).body.data;
    const edited = (
      await ravi.put(`/purchase/${purchase.id}`, { supplierId: supplier, isGst: false, items: [{ productId: filter.id, quantity: 2, unitCost: 100 }] })
    ).body.data;
    expect(edited.isGst).toBe(false);
    expect(edited.taxTotal).toBe(0);
    expect(edited.grandTotal).toBe(200);
    expect(edited.revisions[0].changes).toEqual(expect.arrayContaining(["GST: with GST → without GST"]));
  });

  it("won't cut a quantity below what is still in stock", async () => {
    const lamp = await product("HN-12V-PR");
    const supplier = await supplierId();
    const purchase = (await ravi.post("/purchase", { supplierId: supplier, items: [{ productId: lamp.id, quantity: 3, unitCost: 380 }] })).body.data;
    // sell everything on the shelf
    const all = (await stockOf(lamp.id)).stockQuantity;
    expect((await ravi.post("/invoice", { items: [{ productId: lamp.id, quantity: all, unitPrice: lamp.sellingPrice }] })).status).toBe(201);

    const res = await ravi.put(`/purchase/${purchase.id}`, { supplierId: supplier, items: [{ productId: lamp.id, quantity: 1, unitCost: 380 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already been sold/);
    expect((await stockOf(lamp.id)).stockQuantity).toBe(0);
  });

  it("won't take the bill below what has been paid to the supplier", async () => {
    const filter = await product("OF-MAR-01");
    const supplier = await supplierId();
    const purchase = (
      await ravi.post("/purchase", {
        supplierId: supplier,
        isGst: false,
        items: [{ productId: filter.id, quantity: 5, unitCost: 100 }],
        paidAmount: 500,
        paymentMode: "CASH",
      })
    ).body.data;
    const res = await ravi.put(`/purchase/${purchase.id}`, { supplierId: supplier, isGst: false, items: [{ productId: filter.id, quantity: 4, unitCost: 100 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already been paid/);
  });

  it("is refused to a manager whose 'Edit recorded purchases' is switched off", async () => {
    const filter = await product("OF-MAR-01");
    const supplier = await supplierId();
    const purchase = (await ravi.post("/purchase", { supplierId: supplier, items: [{ productId: filter.id, quantity: 1, unitCost: 100 }] })).body.data;
    await withPermission("PURCHASE_EDIT", async () => {
      const res = await ravi.put(`/purchase/${purchase.id}`, { supplierId: supplier, items: [{ productId: filter.id, quantity: 2, unitCost: 100 }] });
      expect(res.status).toBe(403);
    });
  });
});
