import { z } from "zod";

import {
  changeProjectMembership,
  LastOwnerError,
  ResourceNotFoundError,
} from "@/server/authorization/membership-service";
import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";

const membershipChangeSchema = z
  .object({
    role: z.enum(["manager", "reviewer", "participant"]),
    canDecide: z.boolean(),
    status: z.enum(["active", "suspended"]),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const body = membershipChangeSchema.safeParse(await request.json());
    if (!body.success) {
      return Response.json({ error: "Invalid membership change" }, { status: 400 });
    }
    const { projectId, userId } = await context.params;
    const membership = await changeProjectMembership(projectId, userId, body.data);
    return Response.json({ membership }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof ResourceNotFoundError) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    if (error instanceof LastOwnerError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    throw error;
  }
}
