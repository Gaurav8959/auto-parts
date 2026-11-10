// `npm test` runs both projects; `npm run test:unit` needs no database.
// Integration tests use a throwaway MySQL database (DB_NAME + "_test" unless TEST_DB_NAME is set) that
// tests/support/global-setup.ts creates, migrates and seeds, and global-teardown drops.
const shared = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/support/env.ts"],
};

module.exports = {
  // integration tests share one database
  maxWorkers: 1,
  testTimeout: 30000,
  projects: [
    { ...shared, displayName: "unit", testMatch: ["<rootDir>/tests/unit/**/*.test.ts"] },
    {
      ...shared,
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      globalSetup: "<rootDir>/tests/support/global-setup.ts",
      globalTeardown: "<rootDir>/tests/support/global-teardown.ts",
    },
  ],
};
