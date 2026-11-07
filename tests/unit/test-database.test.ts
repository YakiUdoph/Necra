import { describe, expect, it } from "vitest";

import { getSafeTestDatabaseAdminUrl } from "../helpers/test-database";

describe("disposable PostgreSQL test URL guard", () => {
  it("accepts only the dedicated loopback test-admin shape", () => {
    const value =
      "postgresql://necra_t008_test:test-only-password@127.0.0.1:5432/postgres";

    expect(getSafeTestDatabaseAdminUrl(value)).toBe(value);
  });

  it.each([
    "postgresql://necra_t008_test:test-only-password@db.example.com:5432/postgres",
    "postgresql://postgres:test-only-password@127.0.0.1:5432/postgres",
    "postgresql://necra_t008_test:test-only-password@127.0.0.1:5432/client_records",
    "postgresql://necra_t008_test@127.0.0.1:5432/postgres",
    "postgresql://necra_t008_test:test-only-password@127.0.0.1:5433/postgres",
  ])("rejects unsafe or non-test targets", (value) => {
    expect(() => getSafeTestDatabaseAdminUrl(value)).toThrow(
      "Refusing unsafe TEST_DATABASE_ADMIN_URL",
    );
  });
});
