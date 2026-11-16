import { AnalysisNotFoundError } from "@/server/analysis/analysis-service";
import {
  CompareAlreadyStartedError,
  CompareBudgetError,
  CompareUnavailableError,
  runCompare,
} from "@/server/analysis/compare-service";
import { ProcessingAuthorizationError } from "@/server/analysis/processing-authorization";
import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

export const maxDuration = 130;
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; analysisId: string }> },
) {
  try {
    if (!hasTrustedMutationOrigin(request))
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    const { projectId, analysisId } = await context.params;
    const result = await runCompare(
      projectId,
      analysisId,
      await readBoundedJson(request, 1024),
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError)
      return Response.json({ error: "Sign in required" }, { status: 401 });
    if (error instanceof AnalysisNotFoundError)
      return Response.json({ error: "Reality Check unavailable" }, { status: 404 });
    if (error instanceof ProcessingAuthorizationError)
      return Response.json(
        { error: "Confirm external processing authorization" },
        { status: 400 },
      );
    if (error instanceof CompareAlreadyStartedError)
      return Response.json(
        { error: "Compare was already started. Reload to inspect its recorded status." },
        { status: 409 },
      );
    if (error instanceof CompareBudgetError)
      return Response.json(
        { error: "Compare capacity or daily budget reached" },
        { status: 429 },
      );
    if (error instanceof CompareUnavailableError)
      return Response.json({ error: error.message }, { status: 503 });
    if (error instanceof RequestTooLargeError)
      return Response.json({ error: "Request too large" }, { status: 413 });
    if (error instanceof SyntaxError || error instanceof TypeError)
      return Response.json({ error: "Invalid request" }, { status: 400 });
    throw error;
  }
}
