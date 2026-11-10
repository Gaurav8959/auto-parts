import { EntityManager } from "typeorm";
import { stockLogger } from "../../configs/logger.config";
import { AppDataSource } from "../../data-source/data-source";
import { ShopStockRepository, StockTransactionRepository } from "../../data-source/repository";
import { Product } from "../../entities/catalog/product.entity";
import { ShopStock } from "../../entities/inventory/shop-stock.entity";
import { StockTransaction } from "../../entities/inventory/stock-transaction.entity";
import { StringError } from "../../errors/string.error";
import {
  TStockAdjustment,
  TStockMovement,
  TStockTransactionListParams,
  TStockTransactionType,
} from "../../types/inventory.type";
import { TShopScope } from "../../types/shop.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { endOfDay, startOfDay } from "../../utilities/date-time.utility";

const ADJUSTMENT_REFERENCE = "ADJUSTMENT";

// Returns the shop's stock rows for these products (by product id), locked for this transaction.
// Rows are locked in product id order, the same order for every caller, so two transactions over the
// same products wait for each other instead of deadlocking. The first time a shop handles a product
// its row is created from the catalog defaults.
const lockStockRows = async (manager: EntityManager, shopId: number, products: Product[]) => {
  const repo = manager.getRepository(ShopStock);
  const unique = [...new Map(products.map((product) => [product.id, product])).values()].sort((a, b) => a.id - b.id);
  if (!unique.length) return new Map<number, ShopStock>();

  // ON DUPLICATE KEY UPDATE (a no-op) takes an exclusive lock on an existing row straight away.
  // INSERT IGNORE would take a shared lock, and two bills upgrading their shared locks deadlock.
  await repo
    .createQueryBuilder()
    .insert()
    .values(
      unique.map((product) => ({
        shop: { id: shopId },
        product: { id: product.id },
        quantity: 0,
        reorderLevel: product.reorderLevel,
        avgCost: product.purchasePrice,
      }))
    )
    .orUpdate(["shop_id"], ["shop_id", "product_id"])
    // rows may already exist, so there are no generated ids to read back
    .updateEntity(false)
    .execute();

  const rows = await repo
    .createQueryBuilder("stock")
    .where("stock.shop_id = :shopId AND stock.product_id IN (:...ids)", { shopId, ids: unique.map((p) => p.id) })
    .orderBy("stock.product_id", "ASC")
    .setLock("pessimistic_write")
    .loadAllRelationIds({ relations: ["product"] })
    .getMany();

  // loadAllRelationIds leaves the product id in place of the product
  return new Map(rows.map((row) => [Number(row.product), row]));
};

const lockStockRow = async (manager: EntityManager, shopId: number, product: Product) =>
  (await lockStockRows(manager, shopId, [product])).get(product.id);

// The only place stock quantity changes. Applies movements to rows locked by lockStockRows, refusing
// to go below zero, and writes the ledger entries in the same transaction, so the cached quantity and
// the ledger can never disagree. Several movements of one product run against the running balance.
const applyMovements = async (
  manager: EntityManager,
  rows: Map<number, ShopStock>,
  products: Map<number, Product>,
  movements: TStockMovement[]
) => {
  if (!movements.length) return [];
  const ledger = movements.map((movement) => {
    const product = products.get(movement.productId);
    const stock = rows.get(movement.productId);
    if (!product || !stock) throw new StringError("Product not found.");

    const balanceAfter = twoDecimalFloat(Number(stock.quantity) + movement.quantity);
    if (balanceAfter < 0) {
      throw new StringError(
        `Not enough stock for "${product.name}". Available in this shop: ${Number(stock.quantity)} ${product.unit}.`
      );
    }
    stock.quantity = balanceAfter;

    return {
      shop: { id: movement.shopId },
      product: { id: product.id },
      type: movement.type,
      quantity: movement.quantity,
      balanceAfter,
      unitCost: movement.unitCost ?? stock.avgCost,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      referenceNo: movement.referenceNo,
      note: movement.note,
      createdBy: { id: movement.userId },
      updatedBy: { id: movement.userId },
    };
  });

  const touched = [...new Set(movements.map((movement) => movement.productId))];
  for (const productId of touched) {
    const stock = rows.get(productId);
    await manager.getRepository(ShopStock).update(stock.id, { quantity: stock.quantity });
  }
  const result = await manager.getRepository(StockTransaction).insert(ledger);

  ledger.forEach((entry) =>
    stockLogger.info(
      `${entry.type} shop=${entry.shop.id} product=${entry.product.id} qty=${entry.quantity} balance=${entry.balanceAfter} by=${entry.createdBy.id}`
    )
  );
  return result.identifiers.map((identifier) => Number(identifier.id));
};

// One movement of one product (adjustments, opening stock, purchases)
const move = async (manager: EntityManager, movement: TStockMovement) => {
  const product = await manager.getRepository(Product).findOne({ where: { id: movement.productId } });
  if (!product) throw new StringError("Product not found.");

  const rows = await lockStockRows(manager, movement.shopId, [product]);
  const [transactionId] = await applyMovements(manager, rows, new Map([[product.id, product]]), [movement]);
  const transaction = await manager.getRepository(StockTransaction).findOne({ where: { id: transactionId } });

  return { product, stock: rows.get(product.id), transaction };
};

const adjust = async (params: TStockAdjustment, userId: number, shopId: number) => {
  const sign = params.type === TStockTransactionType.ADJUSTMENT_IN ? 1 : -1;

  const result = await AppDataSource.transaction((manager) =>
    move(manager, {
      shopId,
      productId: params.productId,
      type: params.type,
      quantity: sign * params.quantity,
      referenceType: ADJUSTMENT_REFERENCE,
      referenceNo: params.reason,
      note: params.note,
      userId,
    })
  );

  return result.transaction;
};

// Shop-specific settings for a product (rack, reorder level) without moving stock
const updateShopSettings = async (
  shopId: number,
  product: Product,
  settings: { reorderLevel?: number; rackLocation?: string }
) => {
  await AppDataSource.transaction(async (manager) => {
    const stock = await lockStockRow(manager, shopId, product);
    await manager.getRepository(ShopStock).update(stock.id, settings);
  });
};

const listTransactions = async (params: TStockTransactionListParams) => {
  const query = StockTransactionRepository.createQueryBuilder("txn")
    .leftJoin("txn.product", "product")
    .leftJoin("txn.shop", "shop")
    .leftJoin("txn.createdBy", "createdBy")
    .select([
      "txn",
      "product.id",
      "product.name",
      "product.sku",
      "product.unit",
      "shop.id",
      "shop.name",
      "shop.code",
      "createdBy.id",
      "createdBy.firstName",
      "createdBy.lastName",
    ]);

  if (params.shopId) query.andWhere("shop.id = :shopId", { shopId: params.shopId });
  if (params.productId) query.andWhere("product.id = :productId", { productId: params.productId });
  if (params.type) query.andWhere("txn.type = :type", { type: params.type });
  if (params.from) query.andWhere("txn.createdAt >= :from", { from: startOfDay(params.from) });
  if (params.to) query.andWhere("txn.createdAt <= :to", { to: endOfDay(params.to) });

  const [response, total] = await query
    .orderBy("txn.id", "DESC")
    .skip(ApiUtility.getOffset(params.limit, params.page))
    .take(params.limit)
    .getManyAndCount();

  return {
    response,
    pagination: ApiUtility.getPagination(total, params.limit, params.page).pagination,
  };
};

// Products at or below their reorder level. Only products a shop has actually stocked count,
// otherwise every catalog item would look "out of stock" in every shop.
const lowStock = async (shopId: TShopScope, limit?: number) => {
  const query = ShopStockRepository.createQueryBuilder("stock")
    .innerJoinAndSelect("stock.product", "product")
    .innerJoinAndSelect("stock.shop", "shop")
    .leftJoinAndSelect("product.brand", "brand")
    .where("product.isDeleted = 0 AND product.isActive = 1 AND shop.isActive = 1")
    .andWhere("stock.quantity <= stock.reorderLevel");
  if (shopId) query.andWhere("shop.id = :shopId", { shopId });

  query.orderBy("stock.quantity", "ASC").addOrderBy("product.name", "ASC");
  // every join is many-to-one, so a plain LIMIT is safe
  if (limit) query.limit(limit);
  const rows = await query.getMany();

  return rows.map(({ product, shop, ...stock }) => ({
    ...product,
    stockQuantity: stock.quantity,
    reorderLevel: stock.reorderLevel,
    rackLocation: stock.rackLocation,
    shop: { id: shop.id, name: shop.name, code: shop.code },
  }));
};

const summary = async (shopId: TShopScope) => {
  const query = ShopStockRepository.createQueryBuilder("stock")
    .innerJoin("stock.product", "product")
    .innerJoin("stock.shop", "shop")
    .select([
      "COUNT(DISTINCT CASE WHEN stock.quantity > 0 THEN product.id END) AS totalProducts",
      "COALESCE(SUM(stock.quantity), 0) AS totalUnits",
      "COALESCE(SUM(stock.quantity * stock.avgCost), 0) AS stockValue",
      "COALESCE(SUM(stock.quantity * product.sellingPrice), 0) AS retailValue",
      "SUM(CASE WHEN stock.quantity <= 0 THEN 1 ELSE 0 END) AS outOfStock",
      "SUM(CASE WHEN stock.quantity > 0 AND stock.quantity <= stock.reorderLevel THEN 1 ELSE 0 END) AS lowStock",
    ])
    .where("product.isDeleted = 0 AND product.isActive = 1 AND shop.isActive = 1");
  if (shopId) query.andWhere("shop.id = :shopId", { shopId });

  const row = await query.getRawOne();

  return {
    totalProducts: Number(row.totalProducts || 0),
    totalUnits: Number(row.totalUnits || 0),
    stockValue: twoDecimalFloat(Number(row.stockValue || 0)),
    retailValue: twoDecimalFloat(Number(row.retailValue || 0)),
    outOfStock: Number(row.outOfStock || 0),
    lowStock: Number(row.lowStock || 0),
  };
};

export default {
  lockStockRows,
  lockStockRow,
  applyMovements,
  move,
  adjust,
  updateShopSettings,
  listTransactions,
  lowStock,
  summary,
};
