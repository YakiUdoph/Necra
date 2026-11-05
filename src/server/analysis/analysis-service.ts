import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";

import { hasProjectPermission } from "../authorization/policy";
import { requireVerifiedSession } from "../authorization/session";
import { getDatabase, type Database } from "../db/client";
import {
  analysisRuns,
  auditEvents,
  authAccounts,
  changeRequests,
  documentVersions,
  projectMemberships,
  projects,
  sourceDocuments,
  workspaceMemberships,
} from "../db/schema";
import { buildClockedGroundingRequest, hashClockedRequest } from "./clocked-mapping";
import { AnalysisValidationError, parseAnalysisCreation } from "./validation";
import {
  MAX_ANALYSIS_ATTEMPTS,
  requireAnalysisTransition,
  type AnalysisLifecycleStatus,
} from "./state-machine";

export class AnalysisNotFoundError extends Error {
  constructor() {
    super("Project or evidence version not found");
    this.name = "AnalysisNotFoundError";
  }
}
export class AnalysisConflictError extends Error {
  constructor() {
    super("The retry key was already used for different Reality Check inputs");
    this.name = "AnalysisConflictError";
  }
}
export class AnalysisStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super("The Reality Check could not be created", options);
    this.name = "AnalysisStorageError";
  }
}
export class AnalysisStaleTransitionError extends Error {
  constructor() {
    super("The analysis state changed before this worker update");
    this.name = "AnalysisStaleTransitionError";
  }
}

export interface AnalysisRecord {
  id: string;
  projectId: string;
  workspaceId: string;
  agreementDocumentId: string;
  agreementVersionId: string;
  agreementContentHash: string;
  agreementTitle: string;
  agreementVersionNumber: number;
  instructionDocumentId: string;
  instructionVersionId: string;
  instructionContentHash: string;
  instructionTitle: string;
  instructionVersionNumber: number;
  status:
    | "pending"
    | "running"
    | "reconciliation_required"
    | "failed"
    | "completed"
    | "evidence_missing";
  lifecycleRevision: number;
  attemptNumber: number;
  failureCode: string | null;
  createdByUserId: string;
  createdAt: Date;
  queuedAt: Date;
  processingStartedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  reconciliationRequiredAt: Date | null;
}

export async function createAnalysis(projectId: string, input: unknown) {
  const session = await requireVerifiedSession();
  return createAnalysisForActor(getDatabase(), session.user.id, projectId, input);
}

export async function listAnalyses(projectId: string) {
  const session = await requireVerifiedSession();
  return listAnalysesForActor(getDatabase(), session.user.id, projectId);
}

export type AnalysisWorkerEvent =
  | { type: "start" }
  | { type: "outcome_unknown" }
  | {
      type: "fail";
      code:
        | "provider_unavailable"
        | "provider_rejected"
        | "invalid_provider_response"
        | "retry_exhausted";
    }
  | { type: "retry" };

export async function transitionAnalysisForWorker(
  database: Database,
  analysisId: string,
  expectedRevision: number,
  event: AnalysisWorkerEvent,
) {
  return database.transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(analysisRuns)
      .where(
        and(
          eq(analysisRuns.id, analysisId),
          eq(analysisRuns.lifecycleRevision, expectedRevision),
        ),
      )
      .limit(1)
      .for("update");
    if (!current) throw new AnalysisStaleTransitionError();
    const now = new Date();
    const nextStatus: AnalysisLifecycleStatus =
      event.type === "start"
        ? "running"
        : event.type === "outcome_unknown"
          ? "reconciliation_required"
          : event.type === "fail"
            ? "failed"
            : "pending";
    requireAnalysisTransition(current.status, nextStatus);
    if (event.type === "retry" && current.attemptNumber >= MAX_ANALYSIS_ATTEMPTS) {
      throw new Error("Analysis retry limit reached");
    }
    const [updated] = await transaction
      .update(analysisRuns)
      .set({
        status: nextStatus,
        lifecycleRevision: current.lifecycleRevision + 1,
        attemptNumber:
          event.type === "retry" ? current.attemptNumber + 1 : current.attemptNumber,
        processingStartedAt: event.type === "start" ? now : current.processingStartedAt,
        lastAttemptAt: event.type === "start" ? now : current.lastAttemptAt,
        reconciliationRequiredAt:
          event.type === "outcome_unknown" ? now : current.reconciliationRequiredAt,
        failedAt: event.type === "fail" ? now : current.failedAt,
        failureCode: event.type === "fail" ? event.code : null,
      })
      .where(
        and(
          eq(analysisRuns.id, analysisId),
          eq(analysisRuns.lifecycleRevision, expectedRevision),
        ),
      )
      .returning();
    if (!updated) throw new AnalysisStaleTransitionError();
    return updated;
  });
}

export async function createAnalysisForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  unsafeInput: unknown,
): Promise<AnalysisRecord> {
  const input = parseAnalysisCreation(unsafeInput);
  try {
    return await database.transaction(async (transaction) => {
      const actor = await requireProjectActor(transaction, actorUserId, projectId, true);
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`analysis:${projectId}:${input.idempotencyKey}`}, 0))`,
      );
      const [existing] = await transaction
        .select()
        .from(analysisRuns)
        .where(
          and(
            eq(analysisRuns.projectId, projectId),
            eq(analysisRuns.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        if (
          existing.agreementVersionId !== input.agreementVersionId ||
          existing.instructionVersionId !== input.instructionVersionId
        ) {
          throw new AnalysisConflictError();
        }
        return getAnalysisInScope(transaction, projectId, existing.id);
      }

      const agreement = await getReadyVersion(
        transaction,
        projectId,
        actor.workspaceId,
        input.agreementVersionId,
        "agreement",
      );
      const instruction = await getReadyVersion(
        transaction,
        projectId,
        actor.workspaceId,
        input.instructionVersionId,
        "instruction",
      );
      const providerRequest = buildClockedGroundingRequest({
        agreementVersionId: agreement.versionId,
        agreementText: agreement.content,
        instructionText: instruction.content,
      });
      const [changeRequest] = await transaction
        .insert(changeRequests)
        .values({
          projectId,
          workspaceId: actor.workspaceId,
          instructionVersionId: instruction.versionId,
          title: instruction.title,
          idempotencyKey: `analysis:${input.idempotencyKey}`,
          createdByUserId: actorUserId,
        })
        .returning({ id: changeRequests.id });
      if (!changeRequest) throw new AnalysisStorageError();
      const [analysis] = await transaction
        .insert(analysisRuns)
        .values({
          projectId,
          workspaceId: actor.workspaceId,
          changeRequestId: changeRequest.id,
          agreementDocumentId: agreement.sourceDocumentId,
          agreementVersionId: agreement.versionId,
          agreementContentHash: agreement.contentHash,
          instructionDocumentId: instruction.sourceDocumentId,
          instructionVersionId: instruction.versionId,
          instructionContentHash: instruction.contentHash,
          idempotencyKey: input.idempotencyKey,
          providerIdempotencyKey: randomUUID(),
          providerRequestHash: hashClockedRequest(providerRequest),
          createdByUserId: actorUserId,
        })
        .returning({ id: analysisRuns.id });
      if (!analysis) throw new AnalysisStorageError();
      await transaction.insert(auditEvents).values({
        workspaceId: actor.workspaceId,
        projectId,
        origin: "human",
        actorUserId,
        actorIdentityId: actor.identityId,
        eventType: "analysis.created",
        targetType: "analysis_run",
        targetId: analysis.id,
        requestCorrelationId: randomUUID(),
        metadata: {
          agreementDocumentId: agreement.sourceDocumentId,
          agreementVersionId: agreement.versionId,
          agreementContentHash: agreement.contentHash,
          instructionDocumentId: instruction.sourceDocumentId,
          instructionVersionId: instruction.versionId,
          instructionContentHash: instruction.contentHash,
          status: "pending",
        },
      });
      return getAnalysisInScope(transaction, projectId, analysis.id);
    });
  } catch (error) {
    throw mapAnalysisError(error);
  }
}

export async function listAnalysesForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
): Promise<AnalysisRecord[]> {
  try {
    return await database.transaction(async (transaction) => {
      await requireProjectActor(transaction, actorUserId, projectId, false);
      const ids = await transaction
        .select({ id: analysisRuns.id })
        .from(analysisRuns)
        .where(eq(analysisRuns.projectId, projectId))
        .orderBy(asc(analysisRuns.createdAt));
      return Promise.all(
        ids.map(({ id }) => getAnalysisInScope(transaction, projectId, id)),
      );
    });
  } catch (error) {
    throw mapAnalysisError(error);
  }
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function requireProjectActor(
  transaction: Transaction,
  actorUserId: string,
  projectId: string,
  requireWrite: boolean,
) {
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
    .for("update");
  if (
    !actor ||
    !hasProjectPermission(actor, requireWrite ? "project:write" : "project:read")
  ) {
    throw new AnalysisNotFoundError();
  }
  return actor;
}

async function getReadyVersion(
  transaction: Transaction,
  projectId: string,
  workspaceId: string,
  versionId: string,
  requiredKind: "agreement" | "instruction",
) {
  const [record] = await transaction
    .select({
      versionId: documentVersions.id,
      sourceDocumentId: documentVersions.sourceDocumentId,
      contentHash: documentVersions.contentHash,
      content: documentVersions.contentText,
      versionNumber: documentVersions.versionNumber,
      processingStatus: documentVersions.processingStatus,
      kind: sourceDocuments.kind,
      title: sourceDocuments.title,
    })
    .from(documentVersions)
    .innerJoin(
      sourceDocuments,
      and(
        eq(sourceDocuments.id, documentVersions.sourceDocumentId),
        eq(sourceDocuments.projectId, documentVersions.projectId),
        eq(sourceDocuments.workspaceId, documentVersions.workspaceId),
      ),
    )
    .where(
      and(
        eq(documentVersions.id, versionId),
        eq(documentVersions.projectId, projectId),
        eq(documentVersions.workspaceId, workspaceId),
      ),
    )
    .limit(1)
    .for("share");
  if (
    !record ||
    record.kind !== requiredKind ||
    record.processingStatus !== "ready" ||
    record.content === null
  ) {
    throw new AnalysisNotFoundError();
  }
  return { ...record, content: record.content };
}

async function getAnalysisInScope(
  transaction: Transaction,
  projectId: string,
  analysisId: string,
): Promise<AnalysisRecord> {
  const [run] = await transaction
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.id, analysisId), eq(analysisRuns.projectId, projectId)))
    .limit(1);
  if (!run) throw new AnalysisNotFoundError();
  const agreement = await getReadyVersion(
    transaction,
    projectId,
    run.workspaceId,
    run.agreementVersionId,
    "agreement",
  );
  const instruction = await getReadyVersion(
    transaction,
    projectId,
    run.workspaceId,
    run.instructionVersionId,
    "instruction",
  );
  return {
    id: run.id,
    projectId: run.projectId,
    workspaceId: run.workspaceId,
    agreementDocumentId: run.agreementDocumentId,
    agreementVersionId: run.agreementVersionId,
    agreementContentHash: run.agreementContentHash,
    agreementTitle: agreement.title,
    agreementVersionNumber: agreement.versionNumber,
    instructionDocumentId: run.instructionDocumentId,
    instructionVersionId: run.instructionVersionId,
    instructionContentHash: run.instructionContentHash,
    instructionTitle: instruction.title,
    instructionVersionNumber: instruction.versionNumber,
    status: run.status,
    lifecycleRevision: run.lifecycleRevision,
    attemptNumber: run.attemptNumber,
    failureCode: run.failureCode,
    createdByUserId: run.createdByUserId,
    createdAt: run.createdAt,
    queuedAt: run.queuedAt,
    processingStartedAt: run.processingStartedAt,
    completedAt: run.completedAt,
    failedAt: run.failedAt,
    reconciliationRequiredAt: run.reconciliationRequiredAt,
  };
}

function mapAnalysisError(error: unknown) {
  if (
    error instanceof AnalysisValidationError ||
    error instanceof AnalysisNotFoundError ||
    error instanceof AnalysisConflictError ||
    error instanceof AnalysisStorageError
  )
    return error;
  return new AnalysisStorageError({ cause: error });
}
