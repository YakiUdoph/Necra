import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type Database } from "../db/client";
import {
  auditEvents,
  authAccounts,
  projectMemberships,
  projects,
  workspaceMemberships,
  workspaces,
} from "../db/schema";
import { requireVerifiedSession } from "../authorization/session";

const projectInputSchema = z
  .object({
    workspaceName: z.string().trim().min(1).max(120),
    projectName: z.string().trim().min(1).max(160),
  })
  .strict();

export class ProjectValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[] | undefined>) {
    super("Project input is invalid");
    this.name = "ProjectValidationError";
  }
}

export class ProjectStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super("Project could not be created", options);
    this.name = "ProjectStorageError";
  }
}

export async function createProject(input: unknown) {
  const session = await requireVerifiedSession();
  return createProjectForActor(getDatabase(), session.user.id, input);
}

export async function createProjectForActor(
  database: Database,
  actorUserId: string,
  unsafeInput: unknown,
) {
  const parsed = projectInputSchema.safeParse(unsafeInput);
  if (!parsed.success) {
    throw new ProjectValidationError(parsed.error.flatten().fieldErrors);
  }

  try {
    return await database.transaction(async (transaction) => {
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
        throw new ProjectStorageError();
      }

      const [workspace] = await transaction
        .insert(workspaces)
        .values({ name: parsed.data.workspaceName })
        .returning({ id: workspaces.id, name: workspaces.name });
      if (!workspace) {
        throw new ProjectStorageError();
      }

      await transaction.insert(workspaceMemberships).values({
        workspaceId: workspace.id,
        userId: actorUserId,
        role: "administrator",
      });

      const [project] = await transaction
        .insert(projects)
        .values({
          workspaceId: workspace.id,
          name: parsed.data.projectName,
          createdByUserId: actorUserId,
        })
        .returning({ id: projects.id, name: projects.name });
      if (!project) {
        throw new ProjectStorageError();
      }

      await transaction.insert(projectMemberships).values({
        projectId: project.id,
        workspaceId: workspace.id,
        userId: actorUserId,
        role: "manager",
        canDecide: false,
      });
      await transaction.insert(auditEvents).values({
        workspaceId: workspace.id,
        projectId: project.id,
        origin: "human",
        actorUserId,
        actorIdentityId: identity.id,
        eventType: "project.created",
        targetType: "project",
        targetId: project.id,
        requestCorrelationId: randomUUID(),
        metadata: {},
      });

      return { ...project, workspaceId: workspace.id, workspaceName: workspace.name };
    });
  } catch (error) {
    if (error instanceof ProjectValidationError || error instanceof ProjectStorageError) {
      throw error;
    }
    throw new ProjectStorageError({ cause: error });
  }
}
