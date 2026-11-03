import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "../db/client";
import {
  projectMemberships,
  projects,
  workspaceMemberships,
  workspaces,
} from "../db/schema";
import type { ProjectPermission } from "./policy";
import { toProductProjectRole } from "./policy";
import { findProjectForUser, type AuthorizedProject } from "./project-query";
import { requireVerifiedSession } from "./session";

export async function getAuthorizedProject(
  projectId: string,
  permission: ProjectPermission = "project:read",
) {
  const session = await requireVerifiedSession();
  return findProjectForUser(getDatabase(), session.user.id, projectId, permission);
}

export async function listAuthorizedProjects(): Promise<AuthorizedProject[]> {
  const session = await requireVerifiedSession();
  const records = await getDatabase()
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
      workspaceName: workspaces.name,
      name: projects.name,
      role: projectMemberships.role,
      canDecide: projectMemberships.canDecide,
    })
    .from(projects)
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .innerJoin(
      projectMemberships,
      and(
        eq(projectMemberships.projectId, projects.id),
        eq(projectMemberships.workspaceId, projects.workspaceId),
        eq(projectMemberships.userId, session.user.id),
        eq(projectMemberships.status, "active"),
      ),
    )
    .innerJoin(
      workspaceMemberships,
      and(
        eq(workspaceMemberships.workspaceId, projects.workspaceId),
        eq(workspaceMemberships.userId, session.user.id),
        eq(workspaceMemberships.status, "active"),
      ),
    )
    .orderBy(projects.name, projects.id);

  return records.map((record) => ({
    ...record,
    role: toProductProjectRole(record.role),
  }));
}
