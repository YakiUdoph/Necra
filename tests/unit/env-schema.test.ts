import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "../../src/server/env-schema";

describe("parseServerEnvironment", () => {
  it("uses safe defaults without requiring unconfigured services", () => {
    const result = parseServerEnvironment({ NODE_ENV: "test" });

    expect(result).toEqual({
      NODE_ENV: "test",
      CLOCKED_BASE_URL: "https://clocked.rezolve.ai/clocked",
      CLOCKED_MAX_CONCURRENT_GLOBAL: 1,
      CLOCKED_MAX_ATTEMPTS_GLOBAL_24H: 20,
      CLOCKED_MAX_CONCURRENT_PER_WORKSPACE: 1,
      CLOCKED_MAX_ATTEMPTS_PER_WORKSPACE_24H: 20,
      AUTH_ALLOW_SIGN_UP: false,
    });
  });

  it("treats blank optional secrets as unconfigured", () => {
    const result = parseServerEnvironment({
      NODE_ENV: "development",
      CLOCKED_API_KEY: "",
      DATABASE_URL: "",
      BETTER_AUTH_SECRET: "",
      BETTER_AUTH_URL: "",
      AUTH_ALLOW_SIGN_UP: "false",
      PRIVATE_STORAGE_BUCKET: "",
      PRIVATE_STORAGE_ENDPOINT: "",
    });

    expect(result.CLOCKED_API_KEY).toBeUndefined();
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.BETTER_AUTH_SECRET).toBeUndefined();
    expect(result.BETTER_AUTH_URL).toBeUndefined();
    expect(result.AUTH_ALLOW_SIGN_UP).toBe(false);
    expect(result.PRIVATE_STORAGE_BUCKET).toBeUndefined();
    expect(result.PRIVATE_STORAGE_ENDPOINT).toBeUndefined();
  });

  it("rejects malformed configured URLs", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "not-a-url",
      }),
    ).toThrow();
  });

  it("keeps private service credentials inside the server schema", () => {
    const result = parseServerEnvironment({
      NODE_ENV: "test",
      BETTER_AUTH_SECRET: "test-only-secret-at-least-32-characters",
      PRIVATE_STORAGE_SECRET_ACCESS_KEY: "test-only-storage-key",
      CLOCKED_API_KEY: "test-only-clocked-key",
    });

    expect(result.BETTER_AUTH_SECRET).toBe("test-only-secret-at-least-32-characters");
    expect(result.PRIVATE_STORAGE_SECRET_ACCESS_KEY).toBe("test-only-storage-key");
    expect(result.CLOCKED_API_KEY).toBe("test-only-clocked-key");
  });

  it("requires authentication secrets to be at least 32 characters", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow();
  });

  it("requires an HTTPS authentication origin in production", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        BETTER_AUTH_URL: "http://necra.example",
      }),
    ).toThrow("BETTER_AUTH_URL must use HTTPS in production");

    expect(
      parseServerEnvironment({
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://necra.example",
      }).BETTER_AUTH_URL,
    ).toBe("https://necra.example");
  });

  it("requires an HTTPS Clocked base URL in production", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        CLOCKED_BASE_URL: "http://clocked.example/clocked",
      }),
    ).toThrow("CLOCKED_BASE_URL must use HTTPS in production");
  });
});
