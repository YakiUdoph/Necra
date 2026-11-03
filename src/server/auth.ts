import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { getDatabase } from "./db/client";
import { authAccounts, authSessions, authVerifications, users } from "./db/schema";
import { serverEnvironment } from "./env";

const authSchema = {
  user: users,
  session: authSessions,
  account: authAccounts,
  verification: authVerifications,
};

function createAuth() {
  const secret = serverEnvironment.BETTER_AUTH_SECRET;
  const baseURL = serverEnvironment.BETTER_AUTH_URL;

  if (!secret || !baseURL) {
    throw new Error(
      "BETTER_AUTH_SECRET and BETTER_AUTH_URL are required for authentication",
    );
  }

  return betterAuth({
    appName: "Necra",
    baseURL,
    secret,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !serverEnvironment.AUTH_ALLOW_SIGN_UP,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: serverEnvironment.NODE_ENV === "production",
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    trustedOrigins: [baseURL],
    telemetry: { enabled: false },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
