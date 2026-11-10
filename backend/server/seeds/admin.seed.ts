import { UserRepository } from "../data-source/repository";
import { TUserRole } from "../types/user.type";
import Encryption from "../utilities/encryption.utility";

// Creates the single admin account if no admin exists yet
export const seedAdmin = async () => {
  const existing = await UserRepository.findOne({
    where: { role: TUserRole.ADMIN, isDeleted: false },
  });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    return existing;
  }

  const email = (process.env.ADMIN_EMAIL || "admin@autoparts.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";

  const admin = await UserRepository.save({
    email,
    password: await Encryption.generateHash(password),
    firstName: "Admin",
    role: TUserRole.ADMIN,
    isActive: true,
  });
  console.log(`Admin created: ${email}`);
  return admin;
};
