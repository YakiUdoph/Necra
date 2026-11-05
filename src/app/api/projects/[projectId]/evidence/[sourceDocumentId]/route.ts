import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import {
  createEvidenceVersion,
  EvidenceConflictError,
  EvidenceNotFoundError,
  EvidenceStorageError,
  getEvidenceSource,
} from "@/server/evidence/evidence-service";
import {
  EvidenceValidationError,
  MAX_EVIDENCE_REQUEST_BYTES,
} from "@/server/evidence/validation";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

type Context = {
  params: Promise<{ projectId: string; sourceDocumentId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { projectId, sourceDocumentId } = await context.params;
    const evidence = await getEvidenceSource(projectId, sourceDocumentId);
    return Response.json({ evidence }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return evidenceErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const { projectId, sourceDocumentId } = await context.params;
    const evidence = await createEvidenceVersion(
      projectId,
      sourceDocumentId,
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
      { error: "Check the version text.", fields: error.fieldErrors },
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
    return Response.json({ error: "Evidence not found" }, { status: 404 });
  }
  if (error instanceof EvidenceConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof SyntaxError || error instanceof TypeError) {
    return Response.json({ error: "Invalid JSON or text encoding" }, { status: 400 });
  }
  if (error instanceof EvidenceStorageError) {
    return Response.json(
      { error: "The new version could not be saved. Your text is still in the form." },
      { status: 503 },
    );
  }
  throw error;
}
