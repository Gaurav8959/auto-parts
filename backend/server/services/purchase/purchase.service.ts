import moment from "moment-timezone";
import { Brackets, In } from "typeorm";
import { PURCHASE_NUMBER_SEQ } from "../../constants/sequence.const";
import { AppDataSource } from "../../data-source/data-source";
import { PurchaseRepository, ShopRepository, SupplierRepository } from "../../data-source/repository";
import { Product } from "../../entities/catalog/product.entity";
import { ShopStock } from "../../entities/inventory/shop-stock.entity";
import { PurchasePayment } from "../../entities/purchase/purchase-payment.entity";
import { Purchase } from "../../entities/purchase/purchase.entity";
import { PurchaseItem } from "../../entities/purchase/purchase-item.entity";
import { StringError } from "../../errors/string.error";
import { TStockTransactionType } from "../../types/inventory.type";
import {
  TPaymentStatus,
  TPurchase,
  TPurchaseListParams,
  TPurchasePayment,
  TPurchaseUpdate,
} from "../../types/purchase.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { endOfDay, SHOP_TIME_ZONE, startOfDay } from "../../utilities/date-time.utility";
import { formatInr } from "../../utilities/amount-in-words.utility";
import { TRevisionDocument } from "../../types/revision.type";
import revisionService from "../utility/revision.service";
import { assertInScope } from "../../utilities/shop-scope.utility";
import { TShopScope } from "../../types/shop.type";
import stockService from "../inventory/stock.service";
import sequenceService from "../utility/sequence.service";

export const PURCHASE_REFERENCE = "PURCHASE";

export const getPaymentStatus = (paid: number, total: number) => {
  if (paid <= 0) return TPaymentStatus.UNPAID;
  if (paid >= total) return TPaymentStatus.PAID;
  return TPaymentStatus.PARTIAL;
};

const list = async (params: TPurchaseListParams) => {
  const query = PurchaseRepository.createQueryBuilder("purchase")
    .leftJoin("purchase.supplier", "supplier")
    .leftJoin("purchase.shop", "shop")
    .addSelect(["supplier.id", "supplier.name", "shop.id", "shop.name", "shop.code"]);

  if (params.shopId) query.andWhere("shop.id = :shopId", { shopId: params.shopId });

  if (params.keyword) {
    const keyword = `%${params.keyword.trim()}%`;
    query.andWhere(
      new Brackets((qb) => {
        qb.where("purchase.purchaseNumber LIKE :keyword", { keyword })
          .orWhere("purchase.supplierBillNo LIKE :keyword", { keyword })
          .orWhere("supplier.name LIKE :keyword", { keyword });
      })
    );
  }
  if (params.supplierId) {
    query.andWhere("supplier.id = :supplierId", { supplierId: params.supplierId });
  }
  if (params.paymentStatus) {
    query.andWhere("purchase.paymentStatus = :paymentStatus", {
      paymentStatus: params.paymentStatus,
    });
  }
  if (params.gst === "true" || params.gst === "false") {
    query.andWhere("purchase.isGst = :isGst", { isGst: params.gst === "true" });
  }
  if (params.from) {
    query.andWhere("purchase.purchaseDate >= :from", { from: startOfDay(params.from) });
  }
  if (params.to) {
    query.andWhere("purchase.purchaseDate <= :to", { to: endOfDay(params.to) });
  }

  const [response, total] = await query
    .orderBy("purchase.purchaseDate", "DESC")
    .addOrderBy("purchase.id", "DESC")
    .skip(ApiUtility.getOffset(params.limit, params.page))
    .take(params.limit)
    .getManyAndCount();

  return {
    response,
    pagination: ApiUtility.getPagination(total, params.limit, params.page)
      .pagination,
  };
};

const detail = async (id: number, shopId: TShopScope) => {
  const purchase = await PurchaseRepository.findOne({
    where: { id },
    relations: {
      shop: true,
      supplier: true,
      items: { product: true },
      payments: { createdBy: true },
      createdBy: true,
    },
    order: { items: { id: "ASC" }, payments: { id: "ASC" } },
  });
  if (!purchase) throw new StringError("Purchase not found.");
  assertInScope(purchase.shop.id, shopId, "Purchase");
  purchase.revisions = await revisionService.history(TRevisionDocument.PURCHASE, purchase.id);
  return purchase;
};

// Goods are received into one shop: its stock, average cost and purchase numbering.
// With or without GST, the goods join the same stock. Without GST every line is at 0%, so the price
// paid is the cost; with GST the cost is before tax (the GST is input tax, not part of the cost).
const create = async (params: TPurchase, userId: number, shopId: number) => {
  const isGst = params.isGst !== false;
  const shop = await ShopRepository.findOne({ where: { id: shopId } });
  const supplier = await SupplierRepository.findOne({
    where: { id: params.supplierId, isDeleted: false },
  });
  if (!supplier) throw new StringError("Supplier not found.");

  const id = await AppDataSource.transaction(async (manager) => {
    const productRepo = manager.getRepository(Product);
    const purchaseNumber = await sequenceService.getNextNumber(
      manager,
      PURCHASE_NUMBER_SEQ,
      shopId,
      shop.purchasePrefix
    );

    let subTotal = 0;
    let taxTotal = 0;

    const items = [];
    for (const item of params.items) {
      const product = await productRepo.findOne({
        where: { id: item.productId, isDeleted: false },
        lock: { mode: "pessimistic_write" },
      });
      if (!product) throw new StringError("One of the products was not found.");

      const taxPercent = isGst ? item.taxPercent ?? Number(product.taxPercent) : 0;
      const base = twoDecimalFloat(item.quantity * item.unitCost);
      const taxAmount = twoDecimalFloat((base * taxPercent) / 100);

      subTotal += base;
      taxTotal += taxAmount;

      // The shop's weighted average cost keeps profit honest when supplier prices move;
      // the catalog keeps the latest price as a reference for every shop
      if (params.updateProductCost !== false) {
        const stock = await stockService.lockStockRow(manager, shopId, product);
        const currentQty = Math.max(0, Number(stock.quantity));
        const newQty = currentQty + item.quantity;
        const averageCost = twoDecimalFloat(
          (currentQty * Number(stock.avgCost) + item.quantity * item.unitCost) / newQty
        );
        await manager.getRepository(ShopStock).update(stock.id, { avgCost: averageCost });
        await productRepo.update(product.id, { purchasePrice: item.unitCost });
      }

      items.push({
        product: { id: product.id },
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxPercent,
        taxAmount,
        lineTotal: twoDecimalFloat(base + taxAmount),
      });
    }

    const grandTotal = twoDecimalFloat(subTotal + taxTotal);
    const paidAmount = twoDecimalFloat(params.paidAmount || 0);
    if (paidAmount > grandTotal) {
      throw new StringError("Paid amount cannot be more than the bill total.");
    }

    const purchase = await manager.getRepository(Purchase).save({
      purchaseNumber,
      isGst,
      shop: { id: shopId },
      supplierBillNo: params.supplierBillNo,
      purchaseDate: params.purchaseDate ? new Date(params.purchaseDate) : new Date(),
      supplier: { id: supplier.id },
      subTotal: twoDecimalFloat(subTotal),
      taxTotal: twoDecimalFloat(taxTotal),
      grandTotal,
      paidAmount,
      paymentStatus: getPaymentStatus(paidAmount, grandTotal),
      notes: params.notes,
      items: items as any,
      payments: paidAmount
        ? ([
            {
              amount: paidAmount,
              paymentMode: params.paymentMode,
              paidAt: new Date(),
              createdBy: { id: userId },
              updatedBy: { id: userId },
            },
          ] as any)
        : [],
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    for (const item of params.items) {
      await stockService.move(manager, {
        shopId,
        productId: item.productId,
        type: TStockTransactionType.PURCHASE,
        quantity: item.quantity,
        unitCost: item.unitCost,
        referenceType: PURCHASE_REFERENCE,
        referenceId: purchase.id,
        referenceNo: purchaseNumber,
        userId,
      });
    }

    return purchase.id;
  });

  return detail(id, shopId);
};

// Edits a recorded purchase in place: supplier, bill details, with or without GST, lines, quantities and costs.
// Stock moves by the difference only. The shop's average cost is worked out again as if the purchase had been
// entered this way: its old lines are taken out of the average and the new ones put in. A quantity can't be
// cut below what is still on the shelf (the rest has been sold). Payments stay as they are.
const update = async (id: number, params: TPurchaseUpdate, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  const supplier = await SupplierRepository.findOne({ where: { id: params.supplierId, isDeleted: false } });
  if (!supplier) throw new StringError("Supplier not found.");

  await AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(Purchase);
    const purchase = await repo.findOne({
      where: { id },
      relations: { shop: true, supplier: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!purchase) throw new StringError("Purchase not found.");
    const oldItems = await manager.getRepository(PurchaseItem).find({
      where: { purchase: { id } },
      relations: { product: true },
      order: { id: "ASC" },
    });
    const isGst = params.isGst ?? purchase.isGst !== false;
    const purchaseShopId = purchase.shop.id;

    const productIds = [...new Set([...params.items.map((i) => i.productId), ...oldItems.map((i) => i.product.id)])];
    const found = await manager.getRepository(Product).find({ where: { id: In(productIds) } });
    const productById = new Map(found.map((product) => [product.id, product]));
    const wasOnBill = new Set(oldItems.map((i) => i.product.id));

    let subTotal = 0;
    let taxTotal = 0;
    const items = params.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product || (!wasOnBill.has(item.productId) && product.isDeleted)) {
        throw new StringError("One of the products was not found.");
      }
      const taxPercent = isGst ? item.taxPercent ?? Number(product.taxPercent) : 0;
      const base = twoDecimalFloat(item.quantity * item.unitCost);
      const taxAmount = twoDecimalFloat((base * taxPercent) / 100);
      subTotal += base;
      taxTotal += taxAmount;
      return {
        purchase: { id },
        product: { id: product.id },
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxPercent,
        taxAmount,
        lineTotal: twoDecimalFloat(base + taxAmount),
      };
    });

    const grandTotal = twoDecimalFloat(subTotal + taxTotal);
    const paid = twoDecimalFloat(Number(purchase.paidAmount));
    if (grandTotal < paid) {
      throw new StringError(
        `${formatInr(paid)} has already been paid to the supplier, more than the new bill total of ${formatInr(grandTotal)}.`
      );
    }

    // quantity and value (before GST) of each product, before and after the edit
    const totalsOf = (lines: { productId: number; quantity: number; unitCost: number }[]) => {
      const map = new Map<number, { quantity: number; value: number }>();
      lines.forEach((l) => {
        const t = map.get(l.productId) || { quantity: 0, value: 0 };
        t.quantity = twoDecimalFloat(t.quantity + l.quantity);
        t.value = twoDecimalFloat(t.value + l.quantity * l.unitCost);
        map.set(l.productId, t);
      });
      return map;
    };
    const before = totalsOf(
      oldItems.map((i) => ({ productId: i.product.id, quantity: Number(i.quantity), unitCost: Number(i.unitCost) }))
    );
    const after = totalsOf(params.items);

    const stockRows = await stockService.lockStockRows(manager, purchaseShopId, found);
    const movements = [];
    for (const productId of productIds) {
      const product = productById.get(productId);
      const was = before.get(productId) || { quantity: 0, value: 0 };
      const now = after.get(productId) || { quantity: 0, value: 0 };
      if (was.quantity === now.quantity && was.value === now.value) continue;

      const stock = stockRows.get(productId);
      const onShelf = Number(stock.quantity);
      const change = twoDecimalFloat(now.quantity - was.quantity);
      if (onShelf + change < 0) {
        throw new StringError(
          `"${product.name}" can't go down to ${now.quantity}: only ${onShelf} ${product.unit} of it is still in stock, ` +
            `the rest has already been sold or moved.`
        );
      }

      // take this purchase's old lines out of the average and put the new ones in
      if (params.updateProductCost !== false) {
        const restQty = onShelf - was.quantity;
        const restValue = Math.max(0, onShelf) * Number(stock.avgCost) - was.value;
        const finalQty = restQty + now.quantity;
        const finalValue = restValue + now.value;
        const avgCost =
          restQty > 0 && finalQty > 0 && finalValue > 0
            ? twoDecimalFloat(finalValue / finalQty)
            : now.quantity > 0
              ? twoDecimalFloat(now.value / now.quantity)
              : Number(stock.avgCost);
        await manager.getRepository(ShopStock).update(stock.id, { avgCost });
        stock.avgCost = avgCost;
        const latest = [...params.items].reverse().find((i) => i.productId === productId);
        if (latest) await manager.getRepository(Product).update(productId, { purchasePrice: latest.unitCost });
      }

      if (change !== 0) {
        movements.push({
          shopId: purchaseShopId,
          productId,
          type: TStockTransactionType.PURCHASE_EDIT,
          quantity: change,
          unitCost: now.quantity > 0 ? twoDecimalFloat(now.value / now.quantity) : undefined,
          referenceType: PURCHASE_REFERENCE,
          referenceId: purchase.id,
          referenceNo: purchase.purchaseNumber,
          note: "Purchase edited",
          userId,
        });
      }
    }

    const purchaseDate = params.purchaseDate ? new Date(params.purchaseDate) : purchase.purchaseDate;
    const day = (d: Date) => moment(d).tz(SHOP_TIME_ZONE).format("DD MMM YYYY");
    const changes = [
      ...revisionService.field("Supplier", purchase.supplier?.name, supplier.name),
      ...revisionService.field("Supplier bill no.", purchase.supplierBillNo, params.supplierBillNo || null),
      ...revisionService.field("Bill date", day(purchase.purchaseDate), day(purchaseDate)),
      ...revisionService.field(
        "GST",
        purchase.isGst !== false ? "with GST" : "without GST",
        isGst ? "with GST" : "without GST"
      ),
      ...revisionService.lines(
        oldItems.map((i) => ({
          productId: i.product.id,
          name: i.productName,
          quantity: Number(i.quantity),
          price: Number(i.unitCost),
          taxPercent: Number(i.taxPercent),
        })),
        items.map((i) => ({
          productId: i.product.id,
          name: i.productName,
          quantity: i.quantity,
          price: i.unitCost,
          taxPercent: i.taxPercent,
        })),
        "cost"
      ),
      ...revisionService.field("Note", purchase.notes, params.notes || null),
      ...revisionService.money("Bill total", Number(purchase.grandTotal), grandTotal),
    ];
    if (!changes.length) return;

    const snapshot = {
      supplier: purchase.supplier ? { id: purchase.supplier.id, name: purchase.supplier.name } : null,
      supplierBillNo: purchase.supplierBillNo,
      purchaseDate: purchase.purchaseDate,
      isGst: purchase.isGst,
      notes: purchase.notes,
      subTotal: Number(purchase.subTotal),
      taxTotal: Number(purchase.taxTotal),
      grandTotal: Number(purchase.grandTotal),
      items: oldItems.map((i) => ({
        productId: i.product.id,
        productName: i.productName,
        sku: i.sku,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        taxPercent: Number(i.taxPercent),
        lineTotal: Number(i.lineTotal),
      })),
    };

    await repo.update(id, {
      supplier: { id: supplier.id },
      supplierBillNo: params.supplierBillNo || null,
      purchaseDate,
      isGst,
      notes: params.notes || null,
      subTotal: twoDecimalFloat(subTotal),
      taxTotal: twoDecimalFloat(taxTotal),
      grandTotal,
      paymentStatus: getPaymentStatus(paid, grandTotal),
      updatedBy: { id: userId },
    } as any);
    await manager.getRepository(PurchaseItem).delete({ purchase: { id } });
    await manager.getRepository(PurchaseItem).insert(items as any);

    await stockService.applyMovements(manager, stockRows, productById, movements);
    await revisionService.record(manager, {
      documentType: TRevisionDocument.PURCHASE,
      documentId: purchase.id,
      shopId: purchaseShopId,
      changes,
      before: snapshot,
      userId,
    });
  });

  return detail(id, shopId);
};

const addPayment = async (id: number, params: TPurchasePayment, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  await AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(Purchase);
    const purchase = await repo.findOne({
      where: { id },
      lock: { mode: "pessimistic_write" },
    });
    if (!purchase) throw new StringError("Purchase not found.");

    const due = twoDecimalFloat(purchase.grandTotal - purchase.paidAmount);
    if (params.amount > due) {
      throw new StringError(`Only ${due} is due on this purchase.`);
    }

    await manager.getRepository(PurchasePayment).save({
      purchase: { id },
      amount: params.amount,
      paymentMode: params.paymentMode,
      note: params.note,
      paidAt: new Date(),
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    const paidAmount = twoDecimalFloat(purchase.paidAmount + params.amount);
    await repo.update(id, {
      paidAmount,
      paymentStatus: getPaymentStatus(paidAmount, purchase.grandTotal),
      updatedBy: { id: userId },
    });
  });

  return detail(id, shopId);
};

export default { list, detail, create, update, addPayment };
