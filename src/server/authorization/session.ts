import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { getAuth } from "../auth";

export const getVerifiedSession = cache(async function getVerifiedSession() {
  return getAuth().api.getSession({ headers: await headers() });
});

export async function requireVerifiedSession() {
  const session = await getVerifiedSession();
  if (!session) {
    throw new AuthenticationRequiredError();
  }
  return session;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}
