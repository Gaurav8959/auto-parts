import { Brackets } from "typeorm";
import { PURCHASE_NUMBER_SEQ } from "../../constants/sequence.const";
import { AppDataSource } from "../../data-source/data-source";
import { PurchaseRepository, ShopRepository, SupplierRepository } from "../../data-source/repository";
import { Product } from "../../entities/catalog/product.entity";
import { ShopStock } from "../../entities/inventory/shop-stock.entity";
import { PurchasePayment } from "../../entities/purchase/purchase-payment.entity";
import { Purchase } from "../../entities/purchase/purchase.entity";
import { StringError } from "../../errors/string.error";
import { TStockTransactionType } from "../../types/inventory.type";
import {
  TPaymentStatus,
  TPurchase,
  TPurchaseListParams,
  TPurchasePayment,
} from "../../types/purchase.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { endOfDay, startOfDay } from "../../utilities/date-time.utility";
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
  return purchase;
};

// Goods are received into one shop: its stock, average cost and purchase numbering
const create = async (params: TPurchase, userId: number, shopId: number) => {
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

      const taxPercent = item.taxPercent ?? product.taxPercent;
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

export default { list, detail, create, addPayment };
