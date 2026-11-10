import { ShopRepository, ShopSettingRepository } from "../../data-source/repository";
import { User } from "../../entities/usermgmt/user.entity";
import { TUserRole } from "../../types/user.type";
import { TShopSettings } from "../../types/settings.type";
import { TShopScope } from "../../types/shop.type";

// Business-wide settings. Each shop's address, GSTIN, terms and prefixes are on the shop itself.
const SETTINGS_ID = 1;

const get = async () => {
  let settings = await ShopSettingRepository.findOne({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await ShopSettingRepository.save({ id: SETTINGS_ID });
  }
  return settings;
};

// printed on invoices of shops without their own logo
const businessLogo = async () => {
  const settings = await ShopSettingRepository.findOne({ where: { id: SETTINGS_ID }, select: { id: true, logo: true } });
  return settings?.logo || null;
};

// Every logo the user's screens show, fetched once and cached by the app: the business logo and the
// logos of the shops in scope (all shops for the admin, their own shop for a manager)
const logos = async (shopId: TShopScope) => {
  const shops = await ShopRepository.find({ where: shopId ? { id: shopId } : {}, select: { id: true, logo: true } });
  return {
    business: await businessLogo(),
    shops: shops.filter((shop) => shop.logo).map((shop) => ({ id: shop.id, logo: shop.logo })),
  };
};

const update = async (params: TShopSettings) => {
  await get();
  await ShopSettingRepository.update(SETTINGS_ID, params);
  return get();
};

// The logo on someone's profile: a manager's is their shop's logo, the admin's is the business logo
const setProfileLogo = async (user: User, logo: string | null) => {
  if (user.role === TUserRole.ADMIN) {
    await update({ logo: logo || null });
  } else {
    await ShopRepository.update(user.shop.id, { logo: logo || null, updatedBy: { id: user.id } });
  }
  return { logo: logo || null };
};

export default { get, businessLogo, logos, update, setProfileLogo };
