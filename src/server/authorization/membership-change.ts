import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  auditEvents,
  authAccounts,
  projectMemberships,
  projects,
  workspaceMemberships,
} from "../db/schema";
import { hasProjectPermission } from "./policy";

export interface MembershipChange {
  role: "manager" | "reviewer" | "participant";
  canDecide: boolean;
  status: "active" | "suspended";
}

export class ResourceNotFoundError extends Error {
  constructor() {
    super("Resource not found");
    this.name = "ResourceNotFoundError";
  }
}

export class LastOwnerError extends Error {
  constructor() {
    super("A project must retain at least one active owner");
    this.name = "LastOwnerError";
  }
}

export async function changeProjectMembershipForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  targetUserId: string,
  change: MembershipChange,
) {
  return database.transaction(async (transaction) => {
    const [actor] = await transaction
      .select({
        workspaceId: projects.workspaceId,
        role: projectMemberships.role,
        canDecide: projectMemberships.canDecide,
        projectMembershipStatus: projectMemberships.status,
        workspaceMembershipStatus: workspaceMemberships.status,
      })
      .from(projects)
      .innerJoin(
        projectMemberships,
        and(
          eq(projectMemberships.projectId, projects.id),
          eq(projectMemberships.workspaceId, projects.workspaceId),
          eq(projectMemberships.userId, actorUserId),
        ),
      )
      .innerJoin(
        workspaceMemberships,
        and(
          eq(workspaceMemberships.workspaceId, projects.workspaceId),
          eq(workspaceMemberships.userId, actorUserId),
        ),
      )
      .where(eq(projects.id, projectId))
      .limit(1)
      .for("update");

    if (!actor || !hasProjectPermission(actor, "membership:manage")) {
      throw new ResourceNotFoundError();
    }

    const [target] = await transaction
      .select({
        role: projectMemberships.role,
        canDecide: projectMemberships.canDecide,
        status: projectMemberships.status,
      })
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.workspaceId, actor.workspaceId),
          eq(projectMemberships.userId, targetUserId),
        ),
      )
      .limit(1)
      .for("update");

    if (!target) {
      throw new ResourceNotFoundError();
    }

    if (
      target.role === "manager" &&
      target.status === "active" &&
      (change.role !== "manager" || change.status !== "active")
    ) {
      const owners = await transaction
        .select({ userId: projectMemberships.userId })
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.projectId, projectId),
            eq(projectMemberships.workspaceId, actor.workspaceId),
            eq(projectMemberships.role, "manager"),
            eq(projectMemberships.status, "active"),
          ),
        )
        .for("update");
      if (owners.length === 1) {
        throw new LastOwnerError();
      }
    }

    const [identity] = await transaction
      .select({ id: authAccounts.id })
      .from(authAccounts)
      .where(
        and(
          eq(authAccounts.userId, actorUserId),
          eq(authAccounts.providerId, "credential"),
        ),
      )
      .limit(1);

    if (!identity) {
      throw new ResourceNotFoundError();
    }

    const [updated] = await transaction
      .update(projectMemberships)
      .set(change)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.workspaceId, actor.workspaceId),
          eq(projectMemberships.userId, targetUserId),
        ),
      )
      .returning();

    await transaction.insert(auditEvents).values({
      workspaceId: actor.workspaceId,
      projectId,
      origin: "human",
      actorUserId,
      actorIdentityId: identity.id,
      eventType: "project_membership.changed",
      targetType: "project_membership",
      targetId: targetUserId,
      requestCorrelationId: randomUUID(),
      metadata: { before: target, after: change },
    });

    return updated;
  });
}
