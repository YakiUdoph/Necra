import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";

import { hasProjectPermission } from "../authorization/policy";
import { requireVerifiedSession } from "../authorization/session";
import { getDatabase, type Database } from "../db/client";
import {
  analysisProviderResults,
  analysisRuns,
  auditEvents,
  authAccounts,
  changeRequests,
  decisions,
  projectMemberships,
  projects,
  reviewActions,
  workspaceMemberships,
} from "../db/schema";
import {
  type DecisionCreationInput,
  DecisionValidationError,
  parseDecisionCreation,
} from "./validation";

export class DecisionNotFoundError extends Error {
  constructor() {
    super("Reality Check not found");
    this.name = "DecisionNotFoundError";
  }
}

export type DecisionConflictReason =
  | "idempotency_mismatch"
  | "decision_exists"
  | "stale_supersession";

export class DecisionConflictError extends Error {
  constructor(readonly reason: DecisionConflictReason) {
    super("The decision record changed before this submission");
    this.name = "DecisionConflictError";
  }
}

export class DecisionStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super("The decision could not be recorded", options);
    this.name = "DecisionStorageError";
  }
}

export interface RecordedDecision {
  id: string;
  analysisRunId: string;
  changeRequestId: string;
  agreementVersionId: string;
  instructionVersionId: string;
  projectId: string;
  workspaceId: string;
  actorUserId: string;
  outcome: "approved" | "rejected";
  rationale: string | null;
  idempotencyKey: string;
  supersedesDecisionId: string | null;
  decidedAt: Date;
}

export async function createDecision(
  projectId: string,
  analysisId: string,
  input: unknown,
) {
  const session = await requireVerifiedSession();
  return createDecisionForActor(
    getDatabase(),
    session.user.id,
    projectId,
    analysisId,
    input,
  );
}

export async function createDecisionForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  analysisId: string,
  unsafeInput: unknown,
): Promise<{ decision: RecordedDecision; created: boolean }> {
  const input = parseDecisionCreation(unsafeInput);
  try {
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${projectId}:${input.idempotencyKey}`}, 0))`,
      );

      const [actor] = await transaction
        .select({
          workspaceId: projects.workspaceId,
          role: projectMemberships.role,
          canDecide: projectMemberships.canDecide,
          projectMembershipStatus: projectMemberships.status,
          workspaceMembershipStatus: workspaceMemberships.status,
          identityId: authAccounts.id,
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
        .innerJoin(
          authAccounts,
          and(
            eq(authAccounts.userId, actorUserId),
            eq(authAccounts.providerId, "credential"),
          ),
        )
        .where(eq(projects.id, projectId))
        .limit(1)
        .for("update", { of: projectMemberships });

      if (!actor || !hasProjectPermission(actor, "decision:create")) {
        throw new DecisionNotFoundError();
      }

      // Decision history is linear per immutable Reality Check. Membership row locks
      // protect authorization changes, but different authorized actors lock different
      // rows. This shared context lock makes their simultaneous decisions observe the
      // same committed history and return a conflict instead of a constraint failure.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`decision:${projectId}:${analysisId}`}, 0))`,
      );

      const [run] = await transaction
        .select({
          id: analysisRuns.id,
          projectId: analysisRuns.projectId,
          workspaceId: analysisRuns.workspaceId,
          changeRequestId: analysisRuns.changeRequestId,
          agreementVersionId: analysisRuns.agreementVersionId,
          instructionVersionId: analysisRuns.instructionVersionId,
          agreementContentHash: analysisRuns.agreementContentHash,
          instructionContentHash: analysisRuns.instructionContentHash,
          providerResponseHash: analysisRuns.providerResponseHash,
          status: analysisRuns.status,
        })
        .from(analysisRuns)
        .innerJoin(
          analysisProviderResults,
          and(
            eq(analysisProviderResults.analysisRunId, analysisRuns.id),
            eq(analysisProviderResults.projectId, analysisRuns.projectId),
            eq(analysisProviderResults.workspaceId, analysisRuns.workspaceId),
          ),
        )
        .where(
          and(eq(analysisRuns.id, analysisId), eq(analysisRuns.projectId, projectId)),
        )
        .limit(1)
        .for("update", { of: analysisRuns });
      if (run?.status !== "completed" || !run.providerResponseHash) {
        throw new DecisionNotFoundError();
      }

      const [existingRetry] = await transaction
        .select()
        .from(decisions)
        .where(
          and(
            eq(decisions.projectId, projectId),
            eq(decisions.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existingRetry) {
        if (sameDecisionRequest(existingRetry, actorUserId, run.id, input)) {
          return { decision: toRecordedDecision(existingRetry), created: false };
        }
        throw new DecisionConflictError("idempotency_mismatch");
      }

      const history = await transaction
        .select()
        .from(decisions)
        .where(
          and(
            eq(decisions.analysisRunId, run.id),
            eq(decisions.projectId, run.projectId),
          ),
        )
        .orderBy(asc(decisions.decidedAt), asc(decisions.id));
      const supersededIds = new Set(
        history.flatMap((decision) =>
          decision.supersedesDecisionId ? [decision.supersedesDecisionId] : [],
        ),
      );
      const current = history.find((decision) => !supersededIds.has(decision.id));

      if (current && input.supersedesDecisionId === null) {
        throw new DecisionConflictError("decision_exists");
      }
      if (
        (current && input.supersedesDecisionId !== current.id) ||
        (!current && input.supersedesDecisionId !== null)
      ) {
        throw new DecisionConflictError("stale_supersession");
      }

      const [review] = await transaction
        .insert(reviewActions)
        .values({
          analysisRunId: run.id,
          projectId: run.projectId,
          workspaceId: run.workspaceId,
          actorUserId,
          actorIdentityId: actor.identityId,
          action: "confirmed",
        })
        .returning({ id: reviewActions.id });
      if (!review) throw new DecisionStorageError();

      const [decision] = await transaction
        .insert(decisions)
        .values({
          analysisRunId: run.id,
          changeRequestId: run.changeRequestId,
          agreementVersionId: run.agreementVersionId,
          instructionVersionId: run.instructionVersionId,
          projectId: run.projectId,
          workspaceId: run.workspaceId,
          actorUserId,
          actorIdentityId: actor.identityId,
          outcome: input.outcome,
          rationale: input.rationale ?? null,
          authoritySnapshot: {
            role: actor.role,
            canDecide: actor.canDecide,
            projectMembershipStatus: actor.projectMembershipStatus,
            workspaceMembershipStatus: actor.workspaceMembershipStatus,
            agreementContentHash: run.agreementContentHash,
            instructionContentHash: run.instructionContentHash,
            providerResponseHash: run.providerResponseHash,
          },
          idempotencyKey: input.idempotencyKey,
          supersedesDecisionId: input.supersedesDecisionId,
        })
        .returning();
      if (!decision) throw new DecisionStorageError();

      await transaction
        .update(changeRequests)
        .set({ status: input.outcome })
        .where(
          and(
            eq(changeRequests.id, run.changeRequestId),
            eq(changeRequests.projectId, run.projectId),
            eq(changeRequests.workspaceId, run.workspaceId),
          ),
        );

      await transaction.insert(auditEvents).values({
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        origin: "human",
        actorUserId,
        actorIdentityId: actor.identityId,
        eventType: input.supersedesDecisionId
          ? "decision.superseded"
          : "decision.recorded",
        targetType: "decision",
        targetId: decision.id,
        requestCorrelationId: randomUUID(),
        metadata: {
          analysisRunId: run.id,
          changeRequestId: run.changeRequestId,
          agreementVersionId: run.agreementVersionId,
          instructionVersionId: run.instructionVersionId,
          reviewActionId: review.id,
          outcome: input.outcome,
          supersedesDecisionId: input.supersedesDecisionId,
        },
      });

      return { decision: toRecordedDecision(decision), created: true };
    });
  } catch (error) {
    if (
      error instanceof DecisionValidationError ||
      error instanceof DecisionNotFoundError ||
      error instanceof DecisionConflictError ||
      error instanceof DecisionStorageError
    ) {
      throw error;
    }
    throw new DecisionStorageError({ cause: error });
  }
}

function sameDecisionRequest(
  existing: typeof decisions.$inferSelect,
  actorUserId: string,
  analysisRunId: string,
  input: DecisionCreationInput,
) {
  return (
    existing.actorUserId === actorUserId &&
    existing.analysisRunId === analysisRunId &&
    existing.outcome === input.outcome &&
    existing.rationale === (input.rationale ?? null) &&
    existing.supersedesDecisionId === input.supersedesDecisionId
  );
}

function toRecordedDecision(value: typeof decisions.$inferSelect): RecordedDecision {
  if (value.outcome === "unresolved") {
    throw new DecisionStorageError();
  }
  return {
    id: value.id,
    analysisRunId: value.analysisRunId,
    changeRequestId: value.changeRequestId,
    agreementVersionId: value.agreementVersionId,
    instructionVersionId: value.instructionVersionId,
    projectId: value.projectId,
    workspaceId: value.workspaceId,
    actorUserId: value.actorUserId,
    outcome: value.outcome,
    rationale: value.rationale,
    idempotencyKey: value.idempotencyKey,
    supersedesDecisionId: value.supersedesDecisionId,
    decidedAt: value.decidedAt,
  };
}
