import {
  createDecision,
  DecisionConflictError,
  DecisionNotFoundError,
  DecisionStorageError,
} from "@/server/decisions/decision-service";
import {
  DecisionValidationError,
  MAX_DECISION_REQUEST_BYTES,
} from "@/server/decisions/validation";
import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; analysisId: string }> },
) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const { projectId, analysisId } = await context.params;
    const result = await createDecision(
      projectId,
      analysisId,
      await readBoundedJson(request, MAX_DECISION_REQUEST_BYTES),
    );
    return Response.json(result, {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof DecisionValidationError) {
      return Response.json(
        {
          error: "Choose approve or reject and confirm the exact record.",
          fields: error.fieldErrors,
        },
        { status: 400 },
      );
    }
    if (error instanceof RequestTooLargeError) {
      return Response.json(
        { error: "The decision request is too large." },
        { status: 413 },
      );
    }
    if (error instanceof DecisionNotFoundError) {
      return Response.json({ error: "Reality Check not found" }, { status: 404 });
    }
    if (error instanceof DecisionConflictError) {
      const message =
        error.reason === "idempotency_mismatch"
          ? "This retry key was already used for a different decision. Reload before trying again."
          : error.reason === "decision_exists"
            ? "A decision already exists for this Reality Check. Reload before recording a replacement."
            : "The decision history changed. Reload and review the current record before trying again.";
      return Response.json({ error: message }, { status: 409 });
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return Response.json({ error: "Invalid decision request." }, { status: 400 });
    }
    if (error instanceof DecisionStorageError) {
      return Response.json(
        {
          error:
            "The decision was not recorded. Your existing evidence and decision history are unchanged; retry after reloading.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
