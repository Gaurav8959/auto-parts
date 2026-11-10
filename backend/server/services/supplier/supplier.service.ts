import { Like } from "typeorm";
import {
  PurchaseRepository,
  SupplierRepository,
} from "../../data-source/repository";
import { StringError } from "../../errors/string.error";
import { TParty, TPartyListParams } from "../../types/party.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { TShopScope } from "../../types/shop.type";

const where = { isDeleted: false };

const list = async (params: TPartyListParams) => {
  const search = params.keyword ? `%${params.keyword.trim()}%` : null;

  const [response, total] = await SupplierRepository.findAndCount({
    where: search
      ? [
          { ...where, name: Like(search) },
          { ...where, phone: Like(search) },
          { ...where, gstin: Like(search) },
        ]
      : where,
    order: { name: "ASC" },
    skip: ApiUtility.getOffset(params.limit, params.page),
    take: params.limit,
  });

  // Suppliers are shared by all shops; the amount owed is for the shop in scope (or all shops)
  const ids = response.map((s) => s.id);
  const balanceQuery = PurchaseRepository.createQueryBuilder("purchase")
    .select("purchase.supplier_id", "supplierId")
    .addSelect("SUM(purchase.grandTotal - purchase.paidAmount)", "due")
    .where("purchase.supplier_id IN (:...ids)", { ids })
    .groupBy("purchase.supplier_id");
  if (params.shopId) balanceQuery.andWhere("purchase.shop_id = :shopId", { shopId: params.shopId });
  const balances = ids.length ? await balanceQuery.getRawMany() : [];
  const dueMap = new Map(
    balances.map((b) => [Number(b.supplierId), twoDecimalFloat(Number(b.due))])
  );

  return {
    response: response.map((s) => ({ ...s, balanceDue: dueMap.get(s.id) || 0 })),
    pagination: ApiUtility.getPagination(total, params.limit, params.page)
      .pagination,
  };
};

const all = async () => {
  return SupplierRepository.find({
    where,
    select: { id: true, name: true, phone: true },
    order: { name: "ASC" },
  });
};

const detail = async (id: number, shopId: TShopScope = null) => {
  const supplier = await SupplierRepository.findOne({ where: { id, ...where } });
  if (!supplier) throw new StringError("Supplier not found.");

  const totals = await PurchaseRepository.createQueryBuilder("purchase")
    .select("COUNT(purchase.id)", "purchaseCount")
    .addSelect("COALESCE(SUM(purchase.grandTotal), 0)", "totalPurchased")
    .addSelect("COALESCE(SUM(purchase.grandTotal - purchase.paidAmount), 0)", "balanceDue")
    .where("purchase.supplier_id = :id", { id })
    .andWhere(shopId ? "purchase.shop_id = :shopId" : "1 = 1", { shopId })
    .getRawOne();

  return {
    ...supplier,
    purchaseCount: Number(totals.purchaseCount),
    totalPurchased: twoDecimalFloat(Number(totals.totalPurchased)),
    balanceDue: twoDecimalFloat(Number(totals.balanceDue)),
  };
};

const create = async (params: TParty, userId: number) => {
  return SupplierRepository.save({
    ...params,
    createdBy: { id: userId },
    updatedBy: { id: userId },
  });
};

const update = async (id: number, params: TParty, userId: number) => {
  await detail(id);
  await SupplierRepository.update(id, { ...params, updatedBy: { id: userId } });
  return detail(id);
};

const remove = async (id: number, userId: number) => {
  await detail(id);
  await SupplierRepository.update(id, { isDeleted: true, updatedBy: { id: userId } });
  return { id };
};

export default { list, all, detail, create, update, remove };
