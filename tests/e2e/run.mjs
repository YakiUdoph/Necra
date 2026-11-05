import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { Pool } from "pg";

// Keep this value aligned with database.ts, which is loaded by Playwright's TypeScript
// runtime. This plain-module runner intentionally does not require a TS loader.
const databaseName = "necra_test_t005_e2e";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) {
  throw new Error("TEST_DATABASE_ADMIN_URL is required for browser tests.");
}
if (!/^necra_test_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error("Refusing to manage an unsafe browser-test database name.");
}

const playwrightCli = resolve("node_modules", "@playwright", "test", "cli.js");
const child = spawn(process.execPath, [playwrightCli, "test"], {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolveExit(code ?? 1));
});

let cleanupFailed = false;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
try {
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
} catch (error) {
  cleanupFailed = true;
  console.error("Disposable browser-test database cleanup failed.", error);
} finally {
  await admin.end();
}

process.exitCode = exitCode === 0 && !cleanupFailed ? 0 : 1;
