import {
  AnalysisNotFoundError,
  AnalysisStaleTransitionError,
} from "@/server/analysis/analysis-service";
import {
  AnalysisProcessingConflictError,
  ClockedConfigurationError,
  ProcessingAuthorizationError,
  processAnalysis,
} from "@/server/analysis/processing-service";
import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

const MAX_PROCESSING_REQUEST_BYTES = 1024;

export const maxDuration = 130;

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; analysisId: string }> },
) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const { projectId, analysisId } = await context.params;
    const result = await processAnalysis(
      projectId,
      analysisId,
      await readBoundedJson(request, MAX_PROCESSING_REQUEST_BYTES),
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof AnalysisNotFoundError) {
      return Response.json({ error: "Reality Check not found" }, { status: 404 });
    }
    if (error instanceof ClockedConfigurationError) {
      return Response.json(
        {
          error:
            "Clocked processing is not configured. Ask an administrator to configure the server credential.",
        },
        { status: 503 },
      );
    }
    if (error instanceof ProcessingAuthorizationError) {
      return Response.json(
        {
          error:
            "Confirm that the selected evidence is authorized for external Clocked processing.",
        },
        { status: 400 },
      );
    }
    if (error instanceof RequestTooLargeError) {
      return Response.json(
        { error: "Processing request is too large." },
        { status: 413 },
      );
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return Response.json({ error: "Invalid processing request." }, { status: 400 });
    }
    if (error instanceof AnalysisProcessingConflictError) {
      if (
        error.reason === "global_concurrency_limit" ||
        error.reason === "global_attempt_budget" ||
        error.reason === "workspace_concurrency_limit" ||
        error.reason === "workspace_attempt_budget"
      ) {
        const concurrencyLimited = error.reason.endsWith("concurrency_limit");
        const globallyLimited = error.reason.startsWith("global_");
        const message = concurrencyLimited
          ? globallyLimited
            ? "The service's Clocked processing slots are currently in use. Retry after another check finishes."
            : "Another Reality Check is using this workspace's Clocked processing slot. Retry after it finishes."
          : globallyLimited
            ? "The service has reached its 24-hour Clocked processing budget. Ask an administrator or retry later."
            : "This workspace has reached its 24-hour Clocked processing budget. Ask an administrator or retry later.";
        return Response.json(
          { error: message },
          {
            status: 429,
            headers: {
              "Retry-After": concurrencyLimited ? "15" : "3600",
            },
          },
        );
      }
      const message =
        error.reason === "already_running"
          ? "This Reality Check is already being processed. Reload to see its latest state."
          : error.reason === "already_completed"
            ? "This Reality Check already has a validated provider result."
            : error.reason === "new_attempt_required"
              ? "Clocked ended this provider attempt. Create a new Reality Check to use a new request identity."
              : error.reason === "retry_backoff"
                ? "Wait briefly before retrying this provider attempt."
                : "This Reality Check has reached its retry limit and needs operator review.";
      return Response.json({ error: message }, { status: 409 });
    }
    if (error instanceof AnalysisStaleTransitionError) {
      return Response.json(
        { error: "The processing state changed. Reload before trying again." },
        { status: 409 },
      );
    }
    throw error;
  }
}
