import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export function createDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

let applicationDatabase: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
  if (!applicationDatabase) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for authenticated application requests");
    }
    applicationDatabase = createDatabase(databaseUrl);
  }
  return applicationDatabase.db;
}
