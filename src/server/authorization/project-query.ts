import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  projectMemberships,
  projects,
  workspaceMemberships,
  workspaces,
} from "../db/schema";
import {
  hasProjectPermission,
  type ProjectPermission,
  toProductProjectRole,
} from "./policy";

export interface AuthorizedProject {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  role: ReturnType<typeof toProductProjectRole>;
  canDecide: boolean;
}

export async function findProjectForUser(
  database: Database,
  userId: string,
  projectId: string,
  permission: ProjectPermission,
): Promise<AuthorizedProject | null> {
  const [record] = await database
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
      workspaceName: workspaces.name,
      name: projects.name,
      role: projectMemberships.role,
      canDecide: projectMemberships.canDecide,
      projectMembershipStatus: projectMemberships.status,
      workspaceMembershipStatus: workspaceMemberships.status,
    })
    .from(projects)
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .innerJoin(
      projectMemberships,
      and(
        eq(projectMemberships.projectId, projects.id),
        eq(projectMemberships.workspaceId, projects.workspaceId),
        eq(projectMemberships.userId, userId),
      ),
    )
    .innerJoin(
      workspaceMemberships,
      and(
        eq(workspaceMemberships.workspaceId, projects.workspaceId),
        eq(workspaceMemberships.userId, userId),
      ),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!record || !hasProjectPermission(record, permission)) {
    return null;
  }

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    workspaceName: record.workspaceName,
    name: record.name,
    role: toProductProjectRole(record.role),
    canDecide: record.canDecide,
  };
}
