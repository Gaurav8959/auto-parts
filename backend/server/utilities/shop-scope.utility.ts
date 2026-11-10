import { ShopRepository } from "../data-source/repository";
import { User } from "../entities/usermgmt/user.entity";
import { ForbiddenError } from "../errors/forbidden.error";
import { StringError } from "../errors/string.error";
import { TShopScope } from "../types/shop.type";
import { TUserRole } from "../types/user.type";

export const SHOP_HEADER = "x-shop-id";

// Managers are pinned to their own shop no matter what they send.
// The admin picks a shop with the x-shop-id header, or omits it to see every shop.
export const resolveShopScope = async (
  user: User,
  requestedShopId: string | string[] | undefined
): Promise<TShopScope> => {
  if (user.role !== TUserRole.ADMIN) {
    if (!user.shop) {
      throw new ForbiddenError("No shop is assigned to your account. Ask the admin.");
    }
    if (!user.shop.isActive) {
      throw new ForbiddenError("Your shop is inactive. Ask the admin.");
    }
    return user.shop.id;
  }

  const id = Number(Array.isArray(requestedShopId) ? requestedShopId[0] : requestedShopId);
  if (!id) return null;

  const shop = await ShopRepository.findOne({ where: { id }, select: { id: true } });
  if (!shop) throw new StringError("The selected shop does not exist.");
  return id;
};

// For actions that only make sense inside one shop (billing, purchases, stock changes)
export const requireShop = (shopId: TShopScope) => {
  if (!shopId) {
    throw new StringError("Select a shop first. This action belongs to a specific shop.");
  }
  return shopId;
};

// A record from another shop is reported as missing, not forbidden, so ids don't leak across shops
export const assertInScope = (recordShopId: number, shopId: TShopScope, label: string) => {
  if (shopId && recordShopId !== shopId) throw new StringError(`${label} not found.`);
};
