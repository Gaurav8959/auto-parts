import mysql from "mysql2/promise";
import { TEST_DB } from "./env";

export default async () => {
  if (process.env.KEEP_TEST_DB) return;
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await connection.end();
};
