const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const TEST_ROLE_PATTERN = /^necra_[a-z0-9_]+_test$/;

export function getSafeTestDatabaseAdminUrl(value = process.env.TEST_DATABASE_ADMIN_URL) {
  if (!value) {
    throw new Error(
      "TEST_DATABASE_ADMIN_URL is required for disposable PostgreSQL tests.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_ADMIN_URL must be a valid PostgreSQL URL.");
  }

  if (
    url.protocol !== "postgresql:" ||
    !LOOPBACK_HOSTS.has(url.hostname) ||
    url.port !== "5432" ||
    url.pathname !== "/postgres" ||
    !TEST_ROLE_PATTERN.test(url.username) ||
    url.password.length === 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      "Refusing unsafe TEST_DATABASE_ADMIN_URL: use a password-protected necra_*_test role on loopback PostgreSQL port 5432 and the postgres admin database.",
    );
  }

  return value;
}
