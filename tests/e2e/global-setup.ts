import {
  applyMigration,
  createAdminPool,
  databaseName,
  getApplicationUrl,
} from "./database";
import { Pool } from "pg";

export default async function globalSetup() {
  if (!/^necra_test_[a-z0-9_]+$/.test(databaseName)) {
    throw new Error("Refusing to manage an unsafe browser-test database name");
  }
  const admin = createAdminPool();
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  await admin.end();

  const pool = new Pool({ connectionString: getApplicationUrl(), max: 1 });
  const client = await pool.connect();
  try {
    await applyMigration(client, "0000_lovely_marvel_apes.sql");
    await applyMigration(client, "0001_omniscient_black_widow.sql");
  } finally {
    client.release();
    await pool.end();
  }
}
