// Loaded before every test file, before any app module reads the environment
require("dotenv").config();

// fixed on first load: this file runs again in the test process, after DB_NAME already points at the test DB
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || `${process.env.DB_NAME || "auto_parts"}_test`;
export const TEST_DB = process.env.TEST_DB_NAME;
export const TEST_ADMIN_PASSWORD = "Test-Admin-Pass-1";
export const TEST_MANAGER_PASSWORD = "Test-Manager-Pass-1";

process.env.DB_NAME = TEST_DB;
process.env.ADMIN_EMAIL = "admin@autoparts.local";
process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
process.env.DEMO_MANAGER_PASSWORD = TEST_MANAGER_PASSWORD;
process.env.MAIL_TRANSPORT = "log";
// keep test logs and saved emails out of backend/logs
process.env.LOG_DIR = require("path").join(require("os").tmpdir(), "auto-parts-test-logs");
process.env.TOKEN_SECRET_KEY = process.env.TOKEN_SECRET_KEY || "test-secret-only-for-the-test-suite-0123456789";
