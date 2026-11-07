import {
  AnalysisConflictError,
  AnalysisNotFoundError,
  AnalysisStorageError,
  createAnalysis,
  listAnalyses,
} from "@/server/analysis/analysis-service";
import {
  AnalysisValidationError,
  MAX_ANALYSIS_REQUEST_BYTES,
} from "@/server/analysis/validation";
import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    return Response.json(
      { checks: await listAnalyses(projectId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return analysisErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const { projectId } = await context.params;
    const check = await createAnalysis(
      projectId,
      await readBoundedJson(request, MAX_ANALYSIS_REQUEST_BYTES),
    );
    return Response.json(
      {
        check,
        message: "Analysis created. It has not been sent to Clocked.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return analysisErrorResponse(error);
  }
}

function analysisErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (error instanceof AnalysisValidationError) {
    return Response.json(
      { error: "Check the selected evidence versions.", fields: error.fieldErrors },
      { status: 400 },
    );
  }
  if (error instanceof RequestTooLargeError) {
    return Response.json({ error: "The request is too large." }, { status: 413 });
  }
  if (error instanceof AnalysisNotFoundError) {
    return Response.json(
      { error: "Project or evidence version not found" },
      { status: 404 },
    );
  }
  if (error instanceof AnalysisConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof SyntaxError || error instanceof TypeError) {
    return Response.json({ error: "Invalid JSON or text encoding" }, { status: 400 });
  }
  if (error instanceof AnalysisStorageError) {
    return Response.json(
      { error: "The Reality Check could not be created. Retry with the same request." },
      { status: 503 },
    );
  }
  throw error;
}
