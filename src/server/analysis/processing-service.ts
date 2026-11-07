import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { requireVerifiedSession } from "../authorization/session";
import { getDatabase, type Database } from "../db/client";
import {
  analysisProviderResults,
  analysisRuns,
  auditEvents,
  providerClaimResults,
} from "../db/schema";
import { serverEnvironment } from "../env";
import {
  CLOCKED_ADAPTER_VERSION,
  ClockedAdapterError,
  requestClockedGrounding,
  type ClockedGroundingResult,
} from "../integrations/clocked/adapter";
import {
  getReadyVersion,
  requireProjectActor,
  AnalysisNotFoundError,
  AnalysisStaleTransitionError,
} from "./analysis-service";
import { buildClockedGroundingRequest, hashClockedRequest } from "./clocked-mapping";
import {
  ClockedEvidenceIntegrityError,
  validateClockedClaims,
  verifyContentHash,
} from "./clocked-result";
import { MAX_ANALYSIS_ATTEMPTS } from "./state-machine";
import { requireProcessingAuthorization } from "./processing-authorization";

export { ProcessingAuthorizationError } from "./processing-authorization";

const STALE_PROCESSING_MS = 130_000;

export class ClockedConfigurationError extends Error {
  constructor() {
    super("Clocked processing is not configured");
    this.name = "ClockedConfigurationError";
  }
}

export class AnalysisProcessingConflictError extends Error {
  constructor(
    readonly reason:
      | "already_running"
      | "already_completed"
      | "retry_limit"
      | "new_attempt_required"
      | "retry_backoff"
      | "global_concurrency_limit"
      | "global_attempt_budget"
      | "workspace_concurrency_limit"
      | "workspace_attempt_budget",
  ) {
    super("The Reality Check cannot be started from its current state");
    this.name = "AnalysisProcessingConflictError";
  }
}

export interface ProcessAnalysisResult {
  status: "completed" | "failed" | "reconciliation_required";
  claimCount: number;
  failureCode?: string;
}

type ClaimOutcome =
  | { integrityFailure: true }
  | {
      integrityFailure: false;
      analysisId: string;
      projectId: string;
      workspaceId: string;
      agreementVersionId: string;
      agreementText: string;
      providerIdempotencyKey: string;
      lifecycleRevision: number;
      request: ReturnType<typeof buildClockedGroundingRequest>;
      attemptNumber: number;
    };
type ClaimedAnalysis = Extract<ClaimOutcome, { integrityFailure: false }>;

export async function processAnalysis(
  projectId: string,
  analysisId: string,
  unsafeAuthorization: unknown,
) {
  const session = await requireVerifiedSession();
  if (!serverEnvironment.CLOCKED_API_KEY) throw new ClockedConfigurationError();
  requireProcessingAuthorization(unsafeAuthorization);
  return processAnalysisForActor(getDatabase(), session.user.id, projectId, analysisId, {
    apiKey: serverEnvironment.CLOCKED_API_KEY,
    baseUrl: serverEnvironment.CLOCKED_BASE_URL,
    maxConcurrentGlobal: serverEnvironment.CLOCKED_MAX_CONCURRENT_GLOBAL,
    maxAttemptsGlobal24h: serverEnvironment.CLOCKED_MAX_ATTEMPTS_GLOBAL_24H,
    maxConcurrentPerWorkspace: serverEnvironment.CLOCKED_MAX_CONCURRENT_PER_WORKSPACE,
    maxAttemptsPerWorkspace24h: serverEnvironment.CLOCKED_MAX_ATTEMPTS_PER_WORKSPACE_24H,
  });
}

export async function processAnalysisForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  analysisId: string,
  adapter: {
    apiKey: string;
    baseUrl: string;
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
    maxConcurrentGlobal?: number;
    maxAttemptsGlobal24h?: number;
    maxConcurrentPerWorkspace?: number;
    maxAttemptsPerWorkspace24h?: number;
  },
): Promise<ProcessAnalysisResult> {
  if (!adapter.apiKey.trim()) throw new ClockedConfigurationError();
  const claimed = await claimAnalysis(database, actorUserId, projectId, analysisId, {
    // Runtime entry points always pass deployment limits. The high direct-call
    // defaults keep this exported test seam from coupling unrelated fixtures.
    maxConcurrentGlobal: adapter.maxConcurrentGlobal ?? 10_000,
    maxAttemptsGlobal24h: adapter.maxAttemptsGlobal24h ?? 10_000,
    maxConcurrentWorkspace: adapter.maxConcurrentPerWorkspace ?? 1,
    maxAttemptsWorkspace24h: adapter.maxAttemptsPerWorkspace24h ?? 20,
  });
  if (claimed.integrityFailure) {
    return {
      status: "failed",
      claimCount: 0,
      failureCode: "input_integrity_failed",
    };
  }
  let providerResult: ClockedGroundingResult;
  try {
    providerResult = await requestClockedGrounding({
      ...adapter,
      idempotencyKey: claimed.providerIdempotencyKey,
      request: claimed.request,
    });
  } catch (error) {
    if (!(error instanceof ClockedAdapterError)) throw error;
    const outcomeUnknown =
      error.kind === "network_unknown" ||
      error.kind === "timeout_unknown" ||
      (error.kind === "conflict" && !error.options.retryAsNew);
    const failureCode = mapFailureCode(error);
    await recordProviderFailure(
      database,
      claimed.analysisId,
      claimed.lifecycleRevision,
      outcomeUnknown ? "reconciliation_required" : "failed",
      failureCode,
    );
    return {
      status: outcomeUnknown ? "reconciliation_required" : "failed",
      claimCount: 0,
      failureCode,
    };
  }

  let claims: ReturnType<typeof validateClockedClaims>;
  try {
    claims = validateClockedClaims({
      response: providerResult.result,
      agreementVersionId: claimed.agreementVersionId,
      agreementText: claimed.agreementText,
    });
  } catch (error) {
    if (!(error instanceof ClockedEvidenceIntegrityError)) throw error;
    await recordProviderFailure(
      database,
      claimed.analysisId,
      claimed.lifecycleRevision,
      "failed",
      "provider_evidence_integrity_failed",
    );
    return {
      status: "failed",
      claimCount: 0,
      failureCode: "provider_evidence_integrity_failed",
    };
  }

  await persistProviderResult(database, claimed, providerResult, claims);
  return { status: "completed", claimCount: claims.length };
}

async function claimAnalysis(
  database: Database,
  actorUserId: string,
  projectId: string,
  analysisId: string,
  limits: {
    maxConcurrentGlobal: number;
    maxAttemptsGlobal24h: number;
    maxConcurrentWorkspace: number;
    maxAttemptsWorkspace24h: number;
  },
): Promise<ClaimOutcome> {
  return database.transaction(async (transaction) => {
    await requireProjectActor(transaction, actorUserId, projectId, true);
    const [run] = await transaction
      .select()
      .from(analysisRuns)
      .where(and(eq(analysisRuns.id, analysisId), eq(analysisRuns.projectId, projectId)))
      .limit(1)
      .for("update");
    if (!run) throw new AnalysisNotFoundError();
    if (run.status === "completed") {
      throw new AnalysisProcessingConflictError("already_completed");
    }
    if (run.status === "evidence_missing") throw new AnalysisNotFoundError();

    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('clocked-budget:global', 0))`,
    );
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`clocked-budget:${run.workspaceId}`}, 0))`,
    );

    const [globalUsage] = await transaction
      .select({
        running: sql<number>`count(*) filter (
          where ${analysisRuns.status} = 'running'
            and ${analysisRuns.lastAttemptAt} > now() - interval '130 seconds'
            and ${analysisRuns.id} <> ${run.id}
        )::int`,
        attempts: sql<number>`coalesce(sum(
          case when ${analysisRuns.lastAttemptAt} > now() - interval '24 hours'
            then ${analysisRuns.attemptNumber} else 0 end
        ), 0)::int`,
      })
      .from(analysisRuns);
    const [workspaceUsage] = await transaction
      .select({
        running: sql<number>`count(*) filter (
          where ${analysisRuns.status} = 'running'
            and ${analysisRuns.lastAttemptAt} > now() - interval '130 seconds'
            and ${analysisRuns.id} <> ${run.id}
        )::int`,
        attempts: sql<number>`coalesce(sum(
          case when ${analysisRuns.lastAttemptAt} > now() - interval '24 hours'
            then ${analysisRuns.attemptNumber} else 0 end
        ), 0)::int`,
      })
      .from(analysisRuns)
      .where(eq(analysisRuns.workspaceId, run.workspaceId));
    if ((globalUsage?.running ?? 0) >= limits.maxConcurrentGlobal) {
      throw new AnalysisProcessingConflictError("global_concurrency_limit");
    }
    if ((workspaceUsage?.running ?? 0) >= limits.maxConcurrentWorkspace) {
      throw new AnalysisProcessingConflictError("workspace_concurrency_limit");
    }
    const currentAttemptWithinWindow =
      run.lastAttemptAt && Date.now() - run.lastAttemptAt.getTime() < 86_400_000;
    const attemptIncrement = currentAttemptWithinWindow
      ? run.status === "failed"
        ? 1
        : 0
      : run.status === "failed"
        ? run.attemptNumber + 1
        : run.attemptNumber;
    if ((globalUsage?.attempts ?? 0) + attemptIncrement > limits.maxAttemptsGlobal24h) {
      throw new AnalysisProcessingConflictError("global_attempt_budget");
    }
    if (
      (workspaceUsage?.attempts ?? 0) + attemptIncrement >
      limits.maxAttemptsWorkspace24h
    ) {
      throw new AnalysisProcessingConflictError("workspace_attempt_budget");
    }

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
    const request = buildClockedGroundingRequest({
      agreementVersionId: agreement.versionId,
      agreementText: agreement.content,
      instructionText: instruction.content,
    });
    try {
      if (
        agreement.sourceDocumentId !== run.agreementDocumentId ||
        instruction.sourceDocumentId !== run.instructionDocumentId ||
        agreement.contentHash !== run.agreementContentHash ||
        instruction.contentHash !== run.instructionContentHash ||
        hashClockedRequest(request) !== run.providerRequestHash
      ) {
        throw new ClockedEvidenceIntegrityError();
      }
      verifyContentHash(agreement.content, run.agreementContentHash);
      verifyContentHash(instruction.content, run.instructionContentHash);
    } catch (error) {
      if (!(error instanceof ClockedEvidenceIntegrityError)) throw error;
      await markIntegrityFailure(transaction, run);
      return { integrityFailure: true as const };
    }

    let currentStatus = run.status;
    let revision = run.lifecycleRevision;
    let attemptNumber = run.attemptNumber;
    if (currentStatus === "running") {
      if (
        !run.lastAttemptAt ||
        Date.now() - run.lastAttemptAt.getTime() < STALE_PROCESSING_MS
      ) {
        throw new AnalysisProcessingConflictError("already_running");
      }
      const [reconciliation] = await transaction
        .update(analysisRuns)
        .set({
          status: "reconciliation_required",
          lifecycleRevision: revision + 1,
          reconciliationRequiredAt: new Date(),
          failureCode: "provider_outcome_unknown",
        })
        .where(
          and(eq(analysisRuns.id, run.id), eq(analysisRuns.lifecycleRevision, revision)),
        )
        .returning({ lifecycleRevision: analysisRuns.lifecycleRevision });
      if (!reconciliation) throw new AnalysisStaleTransitionError();
      revision = reconciliation.lifecycleRevision;
      currentStatus = "reconciliation_required";
    }
    if (currentStatus === "failed") {
      if (run.failureCode === "provider_requires_new_attempt") {
        throw new AnalysisProcessingConflictError("new_attempt_required");
      }
      if (attemptNumber >= MAX_ANALYSIS_ATTEMPTS) {
        throw new AnalysisProcessingConflictError("retry_limit");
      }
      const retryDelayMs = Math.min(30_000, 1_000 * 2 ** (attemptNumber - 1));
      if (run.lastAttemptAt && Date.now() - run.lastAttemptAt.getTime() < retryDelayMs) {
        throw new AnalysisProcessingConflictError("retry_backoff");
      }
      const [pending] = await transaction
        .update(analysisRuns)
        .set({
          status: "pending",
          lifecycleRevision: revision + 1,
          attemptNumber: attemptNumber + 1,
          failureCode: null,
        })
        .where(
          and(eq(analysisRuns.id, run.id), eq(analysisRuns.lifecycleRevision, revision)),
        )
        .returning({
          lifecycleRevision: analysisRuns.lifecycleRevision,
          attemptNumber: analysisRuns.attemptNumber,
        });
      if (!pending) throw new AnalysisStaleTransitionError();
      revision = pending.lifecycleRevision;
      attemptNumber = pending.attemptNumber;
    }

    const now = new Date();
    const [running] = await transaction
      .update(analysisRuns)
      .set({
        status: "running",
        lifecycleRevision: revision + 1,
        processingStartedAt: now,
        lastAttemptAt: now,
        failureCode: null,
      })
      .where(
        and(eq(analysisRuns.id, run.id), eq(analysisRuns.lifecycleRevision, revision)),
      )
      .returning({ lifecycleRevision: analysisRuns.lifecycleRevision });
    if (!running) throw new AnalysisStaleTransitionError();
    return {
      integrityFailure: false as const,
      analysisId: run.id,
      projectId: run.projectId,
      workspaceId: run.workspaceId,
      agreementVersionId: run.agreementVersionId,
      agreementText: agreement.content,
      providerIdempotencyKey: run.providerIdempotencyKey,
      lifecycleRevision: running.lifecycleRevision,
      request,
      attemptNumber,
    };
  });
}

async function markIntegrityFailure(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  run: typeof analysisRuns.$inferSelect,
) {
  if (run.status === "failed") return;
  await transaction
    .update(analysisRuns)
    .set({
      status: "failed",
      lifecycleRevision: run.lifecycleRevision + 1,
      failedAt: new Date(),
      failureCode: "input_integrity_failed",
    })
    .where(
      and(
        eq(analysisRuns.id, run.id),
        eq(analysisRuns.lifecycleRevision, run.lifecycleRevision),
      ),
    );
}

async function recordProviderFailure(
  database: Database,
  analysisId: string,
  expectedRevision: number,
  status: "failed" | "reconciliation_required",
  failureCode: string,
) {
  await database.transaction(async (transaction) => {
    const now = new Date();
    const [updated] = await transaction
      .update(analysisRuns)
      .set({
        status,
        lifecycleRevision: expectedRevision + 1,
        failedAt: status === "failed" ? now : null,
        reconciliationRequiredAt: status === "reconciliation_required" ? now : null,
        failureCode,
      })
      .where(
        and(
          eq(analysisRuns.id, analysisId),
          eq(analysisRuns.status, "running"),
          eq(analysisRuns.lifecycleRevision, expectedRevision),
        ),
      )
      .returning({ id: analysisRuns.id });
    if (!updated) throw new AnalysisStaleTransitionError();
  });
}

async function persistProviderResult(
  database: Database,
  claimed: ClaimedAnalysis,
  providerResult: ClockedGroundingResult,
  claims: ReturnType<typeof validateClockedClaims>,
) {
  await database.transaction(async (transaction) => {
    const [run] = await transaction
      .select()
      .from(analysisRuns)
      .where(
        and(
          eq(analysisRuns.id, claimed.analysisId),
          eq(analysisRuns.status, "running"),
          eq(analysisRuns.lifecycleRevision, claimed.lifecycleRevision),
        ),
      )
      .limit(1)
      .for("update");
    if (!run) throw new AnalysisStaleTransitionError();
    const [storedResult] = await transaction
      .insert(analysisProviderResults)
      .values({
        analysisRunId: claimed.analysisId,
        projectId: claimed.projectId,
        workspaceId: claimed.workspaceId,
        provider: "clocked",
        adapterVersion: CLOCKED_ADAPTER_VERSION,
        model: providerResult.result.model,
        responseHash: providerResult.responseHash,
        rawResponse: providerResult.rawResponse,
        transportMetadata: { ...providerResult.transportMetadata },
      })
      .returning({ id: analysisProviderResults.id });
    if (!storedResult) throw new AnalysisStaleTransitionError();
    if (claims.length > 0) {
      await transaction.insert(providerClaimResults).values(
        claims.map((claim) => ({
          providerResultId: storedResult.id,
          analysisRunId: claimed.analysisId,
          projectId: claimed.projectId,
          workspaceId: claimed.workspaceId,
          claimIndex: claim.claimIndex,
          claim: claim.claim,
          kind: claim.kind,
          counted: claim.counted,
          weight: claim.weight,
          supported: claim.supported,
          contradicted: claim.contradicted,
          notStated: claim.notStated,
          notAClaim: claim.notAClaim,
          verdict: claim.verdict,
          sourceAlias: claim.sourceAlias,
          evidenceDocumentVersionId: claim.evidence?.documentVersionId,
          evidenceQuote: claim.evidence?.quote,
          evidenceStartOffset: claim.evidence?.startOffset,
          evidenceEndOffset: claim.evidence?.endOffset,
          evidenceConfidence: claim.evidence?.confidence,
        })),
      );
    }
    const now = new Date();
    const [completed] = await transaction
      .update(analysisRuns)
      .set({
        status: "completed",
        lifecycleRevision: claimed.lifecycleRevision + 1,
        provider: "clocked",
        adapterVersion: CLOCKED_ADAPTER_VERSION,
        validatedResultAt: now,
        providerResponseHash: providerResult.responseHash,
        completedAt: now,
        failureCode: null,
      })
      .where(
        and(
          eq(analysisRuns.id, claimed.analysisId),
          eq(analysisRuns.status, "running"),
          eq(analysisRuns.lifecycleRevision, claimed.lifecycleRevision),
        ),
      )
      .returning({ id: analysisRuns.id });
    if (!completed) throw new AnalysisStaleTransitionError();
    await transaction.insert(auditEvents).values({
      workspaceId: claimed.workspaceId,
      projectId: claimed.projectId,
      origin: "external",
      eventType: "analysis.provider_result_validated",
      targetType: "analysis_run",
      targetId: claimed.analysisId,
      requestCorrelationId: randomUUID(),
      metadata: {
        provider: "clocked",
        adapterVersion: CLOCKED_ADAPTER_VERSION,
        model: providerResult.result.model,
        responseHash: providerResult.responseHash,
        claimCount: claims.length,
        transportMetadata: providerResult.transportMetadata,
      },
    });
  });
}

function mapFailureCode(error: ClockedAdapterError) {
  if (error.options.retryAsNew) return "provider_requires_new_attempt";
  switch (error.kind) {
    case "network_unknown":
    case "timeout_unknown":
    case "conflict":
      return "provider_outcome_unknown";
    case "invalid_response":
      return "invalid_provider_response";
    case "authentication":
      return "provider_authentication_failed";
    case "credits":
      return "provider_credits_unavailable";
    case "invalid_request":
      return "provider_rejected_request";
    case "rate_limited":
      return "provider_rate_limited";
    case "provider_unavailable":
      return "provider_unavailable";
  }
}
