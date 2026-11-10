import { Like } from "typeorm";
import { CustomerRepository, InvoiceRepository } from "../../data-source/repository";
import { StringError } from "../../errors/string.error";
import { TInvoiceStatus } from "../../types/invoice.type";
import { TParty, TPartyListParams } from "../../types/party.type";
import { TShopScope } from "../../types/shop.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { assertInScope } from "../../utilities/shop-scope.utility";

// Customers belong to the shop that serves them
const scopeWhere = (shopId: TShopScope) => ({ isDeleted: false, ...(shopId && { shop: { id: shopId } }) });

const list = async (params: TPartyListParams) => {
  const where = scopeWhere(params.shopId);
  const search = params.keyword ? `%${params.keyword.trim()}%` : null;

  const [response, total] = await CustomerRepository.findAndCount({
    where: search
      ? [
          { ...where, name: Like(search) },
          { ...where, phone: Like(search) },
          { ...where, gstin: Like(search) },
        ]
      : where,
    relations: { shop: true },
    order: { name: "ASC" },
    skip: ApiUtility.getOffset(params.limit, params.page),
    take: params.limit,
  });

  // amount each customer still owes
  const ids = response.map((s) => s.id);
  const balances = ids.length
    ? await InvoiceRepository.createQueryBuilder("invoice")
        .select("invoice.customer_id", "customerId")
        .addSelect("SUM(invoice.grandTotal - invoice.paidAmount)", "due")
        .where("invoice.customer_id IN (:...ids)", { ids })
        .andWhere("invoice.status = :status", { status: TInvoiceStatus.ISSUED })
        .groupBy("invoice.customer_id")
        .getRawMany()
    : [];
  const dueMap = new Map(balances.map((b) => [Number(b.customerId), twoDecimalFloat(Number(b.due))]));

  return {
    response: response.map(({ shop, ...c }) => ({
      ...c,
      shop: { id: shop.id, name: shop.name, code: shop.code },
      balanceDue: dueMap.get(c.id) || 0,
    })),
    pagination: ApiUtility.getPagination(total, params.limit, params.page).pagination,
  };
};

// compact list for the billing screen's customer picker (GSTIN decides the default place of supply)
const all = async (shopId: TShopScope) => {
  return CustomerRepository.find({
    where: scopeWhere(shopId),
    select: { id: true, name: true, phone: true, gstin: true },
    order: { name: "ASC" },
  });
};

const detail = async (id: number, shopId: TShopScope) => {
  const customer = await CustomerRepository.findOne({ where: { id, isDeleted: false }, relations: { shop: true } });
  if (!customer) throw new StringError("Customer not found.");
  assertInScope(customer.shop.id, shopId, "Customer");

  const totals = await InvoiceRepository.createQueryBuilder("invoice")
    .select("COUNT(invoice.id)", "invoiceCount")
    .addSelect("COALESCE(SUM(invoice.grandTotal), 0)", "totalBilled")
    .addSelect("COALESCE(SUM(invoice.grandTotal - invoice.paidAmount), 0)", "balanceDue")
    .where("invoice.customer_id = :id", { id })
    .andWhere("invoice.status = :status", { status: TInvoiceStatus.ISSUED })
    .getRawOne();

  return {
    ...customer,
    invoiceCount: Number(totals.invoiceCount),
    totalBilled: twoDecimalFloat(Number(totals.totalBilled)),
    balanceDue: twoDecimalFloat(Number(totals.balanceDue)),
  };
};

const create = async (params: TParty, userId: number, shopId: number) => {
  return CustomerRepository.save({
    ...params,
    shop: { id: shopId },
    createdBy: { id: userId },
    updatedBy: { id: userId },
  });
};

const update = async (id: number, params: TParty, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  await CustomerRepository.update(id, { ...params, updatedBy: { id: userId } });
  return detail(id, shopId);
};

const remove = async (id: number, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  await CustomerRepository.update(id, { isDeleted: true, updatedBy: { id: userId } });
  return { id };
};

export default { list, all, detail, create, update, remove };
