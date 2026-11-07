import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool, type PoolClient } from "pg";

import { getSafeTestDatabaseAdminUrl } from "../helpers/test-database";

export const databaseName = "necra_test_t005_e2e";

export function getAdminUrl() {
  return getSafeTestDatabaseAdminUrl();
}

export function getApplicationUrl() {
  const value = new URL(getAdminUrl());
  value.pathname = `/${databaseName}`;
  return value.toString();
}

export async function applyMigration(client: PoolClient, filename: string) {
  const migration = await readFile(resolve("migrations", filename), "utf8");
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await client.query(statement);
  }
}

export function createAdminPool() {
  return new Pool({ connectionString: getAdminUrl(), max: 1 });
}
