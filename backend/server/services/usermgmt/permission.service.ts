import { In } from "typeorm";
import {
  PermissionRepository,
  UserPermissionRepository,
  UserRepository,
} from "../../data-source/repository";
import { UserPermission } from "../../entities/usermgmt/user-permission.entity";
import { User } from "../../entities/usermgmt/user.entity";
import { StringError } from "../../errors/string.error";
import { permissionSeed } from "../../seeds/permission.seed";
import {
  TPermission,
  TUserPermissionUpdate,
} from "../../types/permission.type";
import { TUserRole } from "../../types/user.type";

const ALL_PERMISSIONS = Object.values(TPermission) as string[];

const syncPermissions = async () => {
  await PermissionRepository.upsert(permissionSeed, ["permission"]);

  // drop permissions that no longer exist in code
  const stored = await PermissionRepository.find();
  const stale = stored
    .map((p) => p.permission)
    .filter((p) => !ALL_PERMISSIONS.includes(p));
  if (stale.length) {
    await UserPermissionRepository.delete({ permission: In(stale) });
    await PermissionRepository.delete({ permission: In(stale) });
  }
};

// Admin holds everything. A manager holds everything except what the admin has switched off.
const getEffectivePermissions = async (user: User): Promise<string[]> => {
  if (user.role === TUserRole.ADMIN) return ALL_PERMISSIONS;

  const revoked = await UserPermissionRepository.find({
    where: { user: { id: user.id }, permissionVal: false },
    select: { id: true, permission: true },
  });
  const revokedSet = new Set(revoked.map((r) => r.permission));

  return ALL_PERMISSIONS.filter((p) => !revokedSet.has(p));
};

const getPermissionCatalogue = async () => {
  return PermissionRepository.find({
    order: { permissionOrder: "ASC" },
  });
};

const getUserPermissions = async (userId: number) => {
  const user = await UserRepository.findOne({
    where: { id: userId, isDeleted: false },
  });
  if (!user) throw new StringError("User not found.");

  const catalogue = await getPermissionCatalogue();
  const effective = await getEffectivePermissions(user);

  return catalogue.map((p) => ({
    ...p,
    permissionVal: effective.includes(p.permission),
  }));
};

const updateUserPermissions = async (
  userId: number,
  permissions: TUserPermissionUpdate[],
  updatedById: number
) => {
  const user = await UserRepository.findOne({
    where: { id: userId, isDeleted: false },
  });
  if (!user) throw new StringError("User not found.");
  if (user.role === TUserRole.ADMIN) {
    throw new StringError("Admin always has every permission.");
  }

  const invalid = permissions.find(
    (p) => !ALL_PERMISSIONS.includes(p.permission)
  );
  if (invalid) throw new StringError(`Unknown permission ${invalid.permission}`);

  const rows = permissions.map(
    (p) =>
      ({
        user: { id: userId },
        permission: p.permission,
        permissionVal: p.permissionVal,
        updatedBy: { id: updatedById },
      } as UserPermission)
  );

  await UserPermissionRepository.upsert(rows, ["user", "permission"]);

  return getUserPermissions(userId);
};

export default {
  syncPermissions,
  getEffectivePermissions,
  getPermissionCatalogue,
  getUserPermissions,
  updateUserPermissions,
};
