import { Like } from "typeorm";
import { AppDataSource } from "../../data-source/data-source";
import { UserRepository } from "../../data-source/repository";
import { Shop } from "../../entities/shop/shop.entity";
import { User } from "../../entities/usermgmt/user.entity";
import { StringError } from "../../errors/string.error";
import { ILoginUser } from "../../interfaces/user.interface";
import { TChangePassword, TCreateManager, TUser, TUserRole } from "../../types/user.type";
import Encryption from "../../utilities/encryption.utility";
import shopService from "../shop/shop.service";

const where = { isDeleted: false };

const getById = async (id: number) => {
  if (!id) return null;
  return UserRepository.findOne({ where: { id, ...where }, relations: { shop: true } });
};

const login = async (params: ILoginUser) => {
  const user = await UserRepository.findOne({
    where: { email: params.email.trim().toLowerCase(), ...where },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      mobile: true,
      role: true,
      isActive: true,
      tokenVersion: true,
      shop: { id: true, name: true, code: true, isActive: true },
    },
    relations: { shop: true },
  });

  if (!user || !(await Encryption.verifyHash(params.password, user.password))) {
    throw new StringError("Your email or password is incorrect.");
  }
  if (!user.isActive) {
    throw new StringError("Your account is inactive. Contact the admin.");
  }
  if (user.role !== TUserRole.ADMIN && (!user.shop || !user.shop.isActive)) {
    throw new StringError("Your shop is not active. Contact the admin.");
  }

  await UserRepository.update(user.id, { lastLoginAt: new Date() });

  // tokenVersion stays on the user for the session token; the controller strips it from the response
  const { password, ...signedIn } = user;
  return signedIn as User;
};

const list = async (keyword?: string) => {
  const search = keyword ? `%${keyword}%` : null;
  return UserRepository.find({
    where: search
      ? [
          { ...where, firstName: Like(search) },
          { ...where, lastName: Like(search) },
          { ...where, email: Like(search) },
        ]
      : where,
    relations: { shop: true },
    order: { role: "ASC", firstName: "ASC" },
  });
};

// A manager always comes with a shop: either a brand-new one created here,
// or an existing shop that currently has no manager (e.g. after the previous manager left).
const create = async (params: TCreateManager, adminId: number) => {
  const email = params.email.trim().toLowerCase();
  const existing = await UserRepository.findOne({ where: { email } });
  if (existing) throw new StringError("A user with this email already exists.");

  const id = await AppDataSource.transaction(async (manager) => {
    let shopId: number;

    if (params.existingShopId) {
      const shop = await manager.getRepository(Shop).findOne({ where: { id: params.existingShopId } });
      if (!shop) throw new StringError("Shop not found.");
      const taken = await manager.getRepository(User).count({
        where: { shop: { id: shop.id }, isDeleted: false },
      });
      if (taken) throw new StringError(`${shop.name} already has a manager.`);
      shopId = shop.id;
    } else {
      if (!params.shop?.name) throw new StringError("Enter a name for the manager's shop.");
      shopId = (await shopService.create(manager, params.shop, adminId)).id;
    }

    const user = await manager.getRepository(User).save({
      email,
      password: await Encryption.generateHash(params.password),
      firstName: params.firstName,
      lastName: params.lastName,
      mobile: params.mobile,
      role: TUserRole.MANAGER,
      shop: { id: shopId },
      isActive: params.isActive ?? true,
    });
    return user.id;
  });

  return getById(id);
};

const update = async (id: number, params: TUser, currentUser: User) => {
  const user = await getById(id);
  if (!user) throw new StringError("User not found.");

  if (user.role === TUserRole.ADMIN && params.isActive === false) {
    throw new StringError("The admin account cannot be deactivated.");
  }
  if (user.id === currentUser.id && params.isActive === false) {
    throw new StringError("You cannot deactivate your own account.");
  }

  if (params.email) {
    const email = params.email.trim().toLowerCase();
    const existing = await UserRepository.findOne({ where: { email } });
    if (existing && existing.id !== id) {
      throw new StringError("A user with this email already exists.");
    }
    user.email = email;
  }

  if (params.firstName !== undefined) user.firstName = params.firstName;
  if (params.lastName !== undefined) user.lastName = params.lastName;
  if (params.mobile !== undefined) user.mobile = params.mobile;
  if (params.isActive !== undefined) user.isActive = params.isActive;

  await UserRepository.save(user);
  return getById(id);
};

// Ends every session of the user issued so far (see tokenVersion)
const nextTokenVersion = () => "token_version + 1";

// The admin sets a new password; the user is signed out everywhere
const resetPassword = async (id: number, password: string) => {
  const user = await getById(id);
  if (!user) throw new StringError("User not found.");

  await UserRepository.update(id, {
    password: await Encryption.generateHash(password),
    tokenVersion: nextTokenVersion,
  });
  return { id };
};

// Other devices are signed out; the caller gets the updated user to issue a fresh token for this one
const changeOwnPassword = async (userId: number, params: TChangePassword) => {
  const user = await UserRepository.findOne({
    where: { id: userId, ...where },
    select: { id: true, password: true },
  });
  if (!(await Encryption.verifyHash(params.currentPassword, user?.password))) {
    throw new StringError("Current password is incorrect.");
  }

  await UserRepository.update(userId, {
    password: await Encryption.generateHash(params.newPassword),
    tokenVersion: nextTokenVersion,
  });
  return getById(userId);
};

const endOtherSessions = async (userId: number) => {
  await UserRepository.update(userId, { tokenVersion: nextTokenVersion });
  return getById(userId);
};

const remove = async (id: number, currentUser: User) => {
  const user = await getById(id);
  if (!user) throw new StringError("User not found.");
  if (user.role === TUserRole.ADMIN) {
    throw new StringError("The admin account cannot be deleted.");
  }
  if (user.id === currentUser.id) {
    throw new StringError("You cannot delete your own account.");
  }

  // Soft delete. The email and the shop are released: the shop keeps all its data
  // and can be handed to the next manager.
  await UserRepository.update(id, {
    isDeleted: true,
    isActive: false,
    shop: null,
    email: `deleted-${id}-${Date.now()}@removed.local`,
  });
  return { id };
};

const updateProfile = async (userId: number, params: TUser) => {
  await UserRepository.update(userId, {
    firstName: params.firstName,
    lastName: params.lastName,
    mobile: params.mobile,
  });
  return getById(userId);
};

export default {
  getById,
  login,
  list,
  create,
  update,
  resetPassword,
  changeOwnPassword,
  endOtherSessions,
  remove,
  updateProfile,
};
