import { createAdminPool, databaseName } from "./database";

export default async function globalTeardown() {
  // The application pool releases idle connections after 10 seconds. Waiting avoids
  // force-terminating the dev server connection and emitting credential-bearing errors.
  await new Promise((resolve) => setTimeout(resolve, 11_000));
  const admin = createAdminPool();
  if (/^necra_test_[a-z0-9_]+$/.test(databaseName)) {
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  }
  await admin.end();
}
