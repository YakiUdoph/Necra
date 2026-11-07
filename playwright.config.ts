import { defineConfig, devices } from "@playwright/test";

import { databaseName, getAdminUrl } from "./tests/e2e/database";

const adminUrl = getAdminUrl();
const applicationUrl = new URL(adminUrl);
applicationUrl.pathname = `/${databaseName}`;
const clockedLiveTest = process.env.CLOCKED_LIVE_TEST === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: clockedLiveTest ? 180_000 : 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: "npm.cmd run dev",
    gracefulShutdown: { signal: "SIGINT", timeout: 1_000 },
    url: "http://localhost:3000/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: applicationUrl.toString(),
      BETTER_AUTH_SECRET: "test-only-browser-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      AUTH_ALLOW_SIGN_UP: "true",
      CLOCKED_API_KEY: clockedLiveTest ? (process.env.CLOCKED_API_KEY ?? "") : "",
    },
  },
});
