import { EntityManager, In } from "typeorm";
import { ShopRepository, UserRepository } from "../../data-source/repository";
import { Shop } from "../../entities/shop/shop.entity";
import { StringError } from "../../errors/string.error";
import { TShop, TShopScope } from "../../types/shop.type";
import ApiUtility from "../../utilities/api.utility";
import { assertInScope } from "../../utilities/shop-scope.utility";

// "Sharma Auto Spares" -> "SAS"; numbered if that code is already taken
const suggestCode = async (repo: { count: (o: any) => Promise<number> }, name: string) => {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "SHOP";
  let code = initials;
  for (let i = 2; await repo.count({ where: { code } }); i++) code = `${initials}${i}`;
  return code;
};

const withManagers = async (shops: Shop[]) => {
  if (!shops.length) return [];
  const managers = await UserRepository.find({
    where: { shop: { id: In(shops.map((s) => s.id)) }, isDeleted: false },
    relations: { shop: true },
  });
  return shops.map((shop) => {
    const manager = managers.find((m) => m.shop?.id === shop.id);
    const { shop: _shop, ...rest } = manager ? ApiUtility.sanitizeUser(manager) : ({} as any);
    return { ...shop, manager: manager ? rest : null };
  });
};

const list = async (shopId: TShopScope) => {
  const shops = await ShopRepository.find({
    where: shopId ? { id: shopId } : {},
    order: { isActive: "DESC", name: "ASC" },
  });
  return withManagers(shops);
};

const detail = async (id: number, shopId: TShopScope) => {
  assertInScope(id, shopId, "Shop");
  const shop = await ShopRepository.findOne({ where: { id } });
  if (!shop) throw new StringError("Shop not found.");
  return (await withManagers([shop]))[0];
};

// Shops whose manager left: offered when adding a new manager, so the shop's data carries on
const withoutManager = async () => {
  const shops = await ShopRepository.find({ order: { name: "ASC" } });
  return (await withManagers(shops)).filter((s) => !s.manager);
};

// GST invoices and bills without GST are numbered separately; one prefix for both would make their
// numbers collide
const assertSeparateSeries = (invoicePrefix: string, nonGstPrefix: string) => {
  if (invoicePrefix && nonGstPrefix && invoicePrefix.toUpperCase() === nonGstPrefix.toUpperCase()) {
    throw new StringError("Use a different prefix for bills without GST than for GST invoices.");
  }
};

// Called inside the "add manager" transaction
const create = async (manager: EntityManager, params: TShop, userId: number) => {
  const repo = manager.getRepository(Shop);
  const code = params.code?.trim().toUpperCase() || (await suggestCode(repo, params.name));
  if (await repo.count({ where: { code } })) {
    throw new StringError(`Shop code ${code} is already used by another shop.`);
  }

  const invoicePrefix = params.invoicePrefix?.toUpperCase() || code;
  const nonGstPrefix = params.nonGstPrefix?.toUpperCase() || "BILL";
  assertSeparateSeries(invoicePrefix, nonGstPrefix);

  return repo.save({
    name: params.name.trim(),
    code,
    tagline: params.tagline,
    address: params.address,
    phone: params.phone,
    email: params.email,
    gstin: params.gstin,
    invoiceTerms: params.invoiceTerms,
    invoicePrefix,
    purchasePrefix: params.purchasePrefix?.toUpperCase() || `${code}P`,
    nonGstPrefix,
    isActive: true,
    createdBy: { id: userId },
    updatedBy: { id: userId },
  });
};

// Admin edits any shop. A manager may edit their own shop's details but not its code or status.
const update = async (id: number, params: TShop, userId: number, shopId: TShopScope) => {
  assertInScope(id, shopId, "Shop");
  const shop = await ShopRepository.findOne({ where: { id } });
  if (!shop) throw new StringError("Shop not found.");

  const { code, isActive, ...details } = params;
  const changes: Partial<Shop> = { ...details, updatedBy: { id: userId } as any };

  if (!shopId) {
    if (code && code.toUpperCase() !== shop.code) {
      const taken = await ShopRepository.count({ where: { code: code.toUpperCase() } });
      if (taken) throw new StringError(`Shop code ${code.toUpperCase()} is already used.`);
      changes.code = code.toUpperCase();
    }
    if (isActive !== undefined) changes.isActive = isActive;
  }
  if (changes.invoicePrefix) changes.invoicePrefix = changes.invoicePrefix.toUpperCase();
  if (changes.purchasePrefix) changes.purchasePrefix = changes.purchasePrefix.toUpperCase();
  if (changes.nonGstPrefix) changes.nonGstPrefix = changes.nonGstPrefix.toUpperCase();
  assertSeparateSeries(changes.invoicePrefix || shop.invoicePrefix, changes.nonGstPrefix || shop.nonGstPrefix);

  await ShopRepository.update(id, changes);
  return detail(id, shopId);
};

export default { list, detail, withoutManager, create, update };
