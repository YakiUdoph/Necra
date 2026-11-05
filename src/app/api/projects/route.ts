import { hasTrustedMutationOrigin } from "@/server/authorization/csrf";
import { AuthenticationRequiredError } from "@/server/authorization/session";
import {
  createProject,
  ProjectStorageError,
  ProjectValidationError,
} from "@/server/projects/project-service";
import { readBoundedJson, RequestTooLargeError } from "@/server/http/bounded-json";

export async function POST(request: Request) {
  try {
    if (!hasTrustedMutationOrigin(request)) {
      return Response.json({ error: "Request origin not allowed" }, { status: 403 });
    }
    const project = await createProject(await readBoundedJson(request, 8 * 1024));
    return Response.json(
      { project },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof ProjectValidationError) {
      return Response.json(
        { error: "Check the project details.", fields: error.fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (error instanceof RequestTooLargeError) {
      return Response.json({ error: "Project details are too large." }, { status: 413 });
    }
    if (error instanceof TypeError) {
      return Response.json({ error: "Invalid JSON or text encoding" }, { status: 400 });
    }
    if (error instanceof ProjectStorageError) {
      return Response.json(
        { error: "The project could not be created. Try again." },
        { status: 503 },
      );
    }
    throw error;
  }
}
