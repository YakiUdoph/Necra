import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import {
  createEvidenceSource,
  EvidenceConflictError,
  EvidenceNotFoundError,
  EvidenceStorageError,
  listEvidenceSources,
} from "@/server/evidence/evidence-service";
import {
  EvidenceValidationError,
  MAX_EVIDENCE_REQUEST_BYTES,
} from "@/server/evidence/validation";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const evidence = await listEvidenceSources(projectId);
    return Response.json({ evidence }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return evidenceErrorResponse(error);
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
    const evidence = await createEvidenceSource(
      projectId,
      await readBoundedJson(request, MAX_EVIDENCE_REQUEST_BYTES),
    );
    return Response.json(
      { evidence },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return evidenceErrorResponse(error);
  }
}

function evidenceErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (error instanceof EvidenceValidationError) {
    return Response.json(
      { error: "Check the evidence details.", fields: error.fieldErrors },
      { status: 400 },
    );
  }
  if (error instanceof RequestTooLargeError) {
    return Response.json(
      { error: "The evidence request is too large. Text is limited to 256 KiB." },
      { status: 413 },
    );
  }
  if (error instanceof EvidenceNotFoundError) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (error instanceof EvidenceConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof SyntaxError || error instanceof TypeError) {
    return Response.json({ error: "Invalid JSON or text encoding" }, { status: 400 });
  }
  if (error instanceof EvidenceStorageError) {
    return Response.json(
      {
        error: "Evidence could not be saved. Your text is still in the form; try again.",
      },
      { status: 503 },
    );
  }
  throw error;
}
