import { DataSource } from "typeorm";
require("dotenv").config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: ["server/entities/**/*.entity.ts"],
  subscribers: [],
  migrations: ["server/migrations/*.ts"],
  migrationsTableName: "migrations",
  timezone: "Z",
  extra: {
    connectionLimit: 10,
  },
});

// TypeORM reads and writes datetimes as UTC (timezone "Z"), but MySQL fills createdAt/updatedAt
// from CURRENT_TIMESTAMP in the *session* time zone, which defaults to the server's (e.g. IST).
// Pinning every pooled connection to UTC makes both agree, whatever time zone the server runs in.
export const connectDatabase = async () => {
  await AppDataSource.initialize();
  const pool = (AppDataSource.driver as any).pool;
  const toUtc = (connection: any) => connection.query("SET time_zone = '+00:00'");
  pool.on("connection", toUtc);
  pool._allConnections?.toArray?.().forEach(toUtc);
  return AppDataSource;
};
