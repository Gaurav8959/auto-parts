require("dotenv").config();
import "reflect-metadata";
import { AppDataSource, connectDatabase } from "../data-source/data-source";
import permissionService from "../services/usermgmt/permission.service";
import settingsService from "../services/settings/settings.service";
import { seedAdmin } from "./admin.seed";
import { seedDemoCatalog } from "./demo-catalog.seed";

// npm run seed            -> permissions, admin user, shop settings
// npm run seed -- --demo  -> also adds a sample catalog, suppliers and customers
const run = async () => {
  await connectDatabase();

  await permissionService.syncPermissions();
  console.log("Permissions synced");

  const admin = await seedAdmin();
  await settingsService.get();
  console.log("Shop settings ready");

  if (process.argv.includes("--demo")) {
    await seedDemoCatalog(admin);
  }

  await AppDataSource.destroy();
};

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
