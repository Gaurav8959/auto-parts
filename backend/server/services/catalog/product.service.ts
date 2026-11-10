import { Brackets, SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../../data-source/data-source";
import { ProductRepository, ShopStockRepository } from "../../data-source/repository";
import { Product } from "../../entities/catalog/product.entity";
import { ShopStock } from "../../entities/inventory/shop-stock.entity";
import { Shop } from "../../entities/shop/shop.entity";
import { StringError } from "../../errors/string.error";
import { TProduct, TProductListParams, TStockStatusFilter } from "../../types/catalog.type";
import { TStockTransactionType } from "../../types/inventory.type";
import { TShopScope } from "../../types/shop.type";
import ApiUtility from "../../utilities/api.utility";
import { requireShop } from "../../utilities/shop-scope.utility";
import stockService from "../inventory/stock.service";

const QTY = "COALESCE(stock.quantity, 0)";
const REORDER = "COALESCE(stock.reorderLevel, product.reorderLevel)";

// Joins each product's stock for the scope: one shop's row, or totals over all active shops
const withStock = (query: SelectQueryBuilder<Product>, shopId: TShopScope) =>
  query
    .leftJoin(
      (qb) => {
        const sub = qb
          .from(ShopStock, "ss")
          .innerJoin(Shop, "sh", "sh.id = ss.shop_id AND sh.is_active = 1")
          .select("ss.product_id", "productId")
          .addSelect("SUM(ss.quantity)", "quantity")
          .addSelect("SUM(ss.reorder_level)", "reorderLevel")
          .addSelect("MAX(ss.rack_location)", "rackLocation")
          .addSelect("SUM(ss.quantity * ss.avg_cost) / NULLIF(SUM(ss.quantity), 0)", "avgCost")
          .addSelect("MAX(ss.avg_cost)", "lastAvgCost")
          .groupBy("ss.product_id");
        return shopId ? sub.where("ss.shop_id = :shopId", { shopId }) : sub;
      },
      "stock",
      "stock.productId = product.id"
    )
    .addSelect(QTY, "stock_quantity")
    .addSelect(REORDER, "stock_reorder")
    .addSelect("stock.rackLocation", "stock_rack")
    .addSelect("COALESCE(stock.avgCost, stock.lastAvgCost, product.purchasePrice)", "stock_cost");

const baseQuery = (shopId: TShopScope) =>
  withStock(
    ProductRepository.createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.brand", "brand")
      .where("product.isDeleted = :isDeleted", { isDeleted: false }),
    shopId
  );

// Product + its stock figures for the scope, in the shape the screens use
const hydrate = async (query: SelectQueryBuilder<Product>, shopId: TShopScope) => {
  const { entities, raw } = await query.getRawAndEntities();
  const byId = new Map(raw.map((r) => [Number(r.product_id), r]));
  return entities.map((product) => {
    const r = byId.get(product.id);
    return {
      ...product,
      stockQuantity: Number(r?.stock_quantity || 0),
      reorderLevel: Number(r?.stock_reorder ?? product.reorderLevel),
      rackLocation: shopId ? r?.stock_rack || null : null,
      avgCost: Number(r?.stock_cost || 0),
    };
  });
};

const searchCondition = (keyword: string) =>
  new Brackets((qb) => {
    qb.where("product.name LIKE :keyword", { keyword })
      .orWhere("product.sku LIKE :keyword", { keyword })
      .orWhere("product.partNumber LIKE :keyword", { keyword })
      .orWhere("product.vehicleCompatibility LIKE :keyword", { keyword })
      .orWhere("brand.name LIKE :keyword", { keyword });
  });

const list = async (params: TProductListParams) => {
  const query = baseQuery(params.shopId);

  if (params.keyword) query.andWhere(searchCondition(`%${params.keyword.trim()}%`));
  if (params.categoryId) query.andWhere("category.id = :categoryId", { categoryId: params.categoryId });
  if (params.brandId) query.andWhere("brand.id = :brandId", { brandId: params.brandId });
  if (params.isActive === "true" || params.isActive === "false") {
    query.andWhere("product.isActive = :isActive", { isActive: params.isActive === "true" });
  }
  switch (params.stockStatus) {
    case TStockStatusFilter.OUT_OF_STOCK:
      query.andWhere(`${QTY} <= 0`);
      break;
    case TStockStatusFilter.LOW_STOCK:
      query.andWhere(`${QTY} > 0 AND ${QTY} <= ${REORDER}`);
      break;
    case TStockStatusFilter.IN_STOCK:
      query.andWhere(`${QTY} > ${REORDER}`);
      break;
  }

  const total = await query.getCount();
  // joins are all many-to-one, so offset/limit is safe
  const response = await hydrate(
    query
      .orderBy("product.name", "ASC")
      .offset(ApiUtility.getOffset(params.limit, params.page))
      .limit(params.limit),
    params.shopId
  );

  return {
    response,
    pagination: ApiUtility.getPagination(total, params.limit, params.page).pagination,
  };
};

// Lightweight lookup used by the billing / purchase screens
const search = async (keyword: string, shopId: TShopScope) => {
  const query = baseQuery(shopId).andWhere("product.isActive = 1");
  if (keyword) query.andWhere(searchCondition(`%${keyword.trim()}%`));

  // exact SKU / part number matches first, so scanning a code lands on the right part
  return hydrate(
    query
      .addSelect("CASE WHEN product.sku = :exact OR product.partNumber = :exact THEN 0 ELSE 1 END", "exact_match")
      .setParameter("exact", keyword?.trim() || "")
      .orderBy("exact_match", "ASC")
      .addOrderBy("product.name", "ASC")
      .limit(15),
    shopId
  );
};

const detail = async (id: number, shopId: TShopScope) => {
  const [product] = await hydrate(baseQuery(shopId).andWhere("product.id = :id", { id }), shopId);
  if (!product) throw new StringError("Product not found.");

  const rows = await ShopStockRepository.find({
    where: { product: { id }, ...(shopId && { shop: { id: shopId } }) },
    relations: { shop: true },
    order: { shop: { name: "ASC" } },
  });

  return {
    ...product,
    stockByShop: rows.map((row) => ({
      shop: { id: row.shop.id, name: row.shop.name, code: row.shop.code },
      quantity: row.quantity,
      reorderLevel: row.reorderLevel,
      rackLocation: row.rackLocation,
      avgCost: row.avgCost,
    })),
  };
};

const assertUniqueSku = async (sku: string, exceptId?: number) => {
  const existing = await ProductRepository.findOne({ where: { sku: sku.trim(), isDeleted: false } });
  if (existing && existing.id !== exceptId) {
    throw new StringError(`SKU ${sku} is already used by "${existing.name}".`);
  }
};

// Catalog fields only; stock, rack and reorder level are per shop
const toEntity = (params: TProduct) => {
  const product: Partial<Product> = {};
  const fields: (keyof TProduct)[] = [
    "partNumber",
    "name",
    "description",
    "unit",
    "hsnCode",
    "taxPercent",
    "purchasePrice",
    "sellingPrice",
    "mrp",
    "vehicleCompatibility",
    "isActive",
  ];
  fields.forEach((field) => {
    if (params[field] !== undefined) (product as any)[field] = params[field];
  });
  if (params.sku !== undefined) product.sku = params.sku.trim();
  if (params.categoryId !== undefined) product.category = params.categoryId ? ({ id: params.categoryId } as any) : null;
  if (params.brandId !== undefined) product.brand = params.brandId ? ({ id: params.brandId } as any) : null;
  return product;
};

// Products are shared by every shop. Opening stock, rack and reorder level go to the current shop.
const create = async (params: TProduct, userId: number, shopId: TShopScope) => {
  await assertUniqueSku(params.sku);
  if (params.openingStock > 0) requireShop(shopId);

  const id = await AppDataSource.transaction(async (manager) => {
    const product = await manager.getRepository(Product).save({
      ...toEntity(params),
      reorderLevel: params.reorderLevel ?? 5,
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    if (shopId) {
      const stock = await stockService.lockStockRow(manager, shopId, product);
      await manager.getRepository(ShopStock).update(stock.id, {
        rackLocation: params.rackLocation || null,
        avgCost: params.purchasePrice ?? 0,
      });
    }

    if (params.openingStock > 0) {
      await stockService.move(manager, {
        shopId,
        productId: product.id,
        type: TStockTransactionType.OPENING,
        quantity: params.openingStock,
        unitCost: params.purchasePrice,
        note: "Opening stock",
        userId,
      });
    }
    return product.id;
  });

  return detail(id, shopId);
};

const update = async (id: number, params: TProduct, userId: number, shopId: TShopScope) => {
  const existing = await ProductRepository.findOne({ where: { id, isDeleted: false } });
  if (!existing) throw new StringError("Product not found.");
  if (params.sku) await assertUniqueSku(params.sku, id);

  await ProductRepository.update(id, {
    ...toEntity(params),
    // without a shop selected, the admin edits the default used by shops that start stocking it
    ...(!shopId && params.reorderLevel !== undefined && { reorderLevel: params.reorderLevel }),
    updatedBy: { id: userId },
  });

  if (shopId && (params.reorderLevel !== undefined || params.rackLocation !== undefined)) {
    await stockService.updateShopSettings(shopId, existing, {
      ...(params.reorderLevel !== undefined && { reorderLevel: params.reorderLevel }),
      ...(params.rackLocation !== undefined && { rackLocation: params.rackLocation || null }),
    });
  }

  return detail(id, shopId);
};

// Soft delete keeps invoice and purchase history intact; the SKU is released for reuse.
// Refused while any shop still holds stock of it.
const remove = async (id: number, userId: number) => {
  const product = await ProductRepository.findOne({ where: { id, isDeleted: false } });
  if (!product) throw new StringError("Product not found.");

  const stocked = await ShopStockRepository.createQueryBuilder("stock")
    .innerJoin("stock.shop", "shop")
    .where("stock.product_id = :id AND stock.quantity > 0", { id })
    .select("shop.name", "name")
    .getRawMany();
  if (stocked.length) {
    throw new StringError(
      `"${product.name}" is still in stock at ${stocked.map((s) => s.name).join(", ")}. Sell or adjust it out first.`
    );
  }

  await ProductRepository.update(id, {
    isDeleted: true,
    isActive: false,
    sku: `${product.sku}~del${id}`.slice(0, 50),
    updatedBy: { id: userId },
  });
  return { id };
};

export default { list, search, detail, create, update, remove };
