import "server-only";

import { serverEnvironment } from "../env";
import { isTrustedMutationRequest } from "./csrf-policy";

export function hasTrustedMutationOrigin(request: Request): boolean {
  const baseUrl = serverEnvironment.BETTER_AUTH_URL;
  return Boolean(baseUrl && isTrustedMutationRequest(request, baseUrl));
}
