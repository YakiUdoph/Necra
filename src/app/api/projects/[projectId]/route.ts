import { AuthenticationRequiredError } from "@/server/authorization/session";
import { getAuthorizedProject } from "@/server/authorization/project-access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const project = await getAuthorizedProject(projectId);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    return Response.json({ project }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }
}
