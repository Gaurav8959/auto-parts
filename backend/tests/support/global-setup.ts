import "reflect-metadata";
import mysql from "mysql2/promise";
import { TEST_DB } from "./env";

// A fresh database for the run: migrations exactly as in production, then the demo seed
// (two shops, each with a manager, a shared catalog and opening stock)
export default async () => {
  if (!/_test$/.test(TEST_DB)) throw new Error(`Refusing to use ${TEST_DB}: the test database name must end in _test`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await connection.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  const { AppDataSource, connectDatabase } = await import("../../server/data-source/data-source");
  await connectDatabase();
  await AppDataSource.runMigrations();

  const permissionService = (await import("../../server/services/usermgmt/permission.service")).default;
  const settingsService = (await import("../../server/services/settings/settings.service")).default;
  const { seedAdmin } = await import("../../server/seeds/admin.seed");
  const { seedDemoCatalog } = await import("../../server/seeds/demo-catalog.seed");

  const log = console.log;
  console.log = () => undefined;
  await permissionService.syncPermissions();
  const admin = await seedAdmin();
  await settingsService.get();
  await seedDemoCatalog(admin);
  console.log = log;

  await AppDataSource.destroy();
};
