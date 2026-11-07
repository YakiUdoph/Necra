import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { hasProjectPermission } from "../authorization/policy";
import { requireVerifiedSession } from "../authorization/session";
import { getDatabase, type Database } from "../db/client";
import {
  analysisProviderResults,
  analysisRuns,
  auditEvents,
  changeRequests,
  decisions,
  documentVersions,
  projectMemberships,
  projects,
  providerClaimResults,
  reviewActions,
  sourceDocuments,
  users,
  workspaceMemberships,
} from "../db/schema";
import {
  type FindingSourceVersion,
  type NormalizedFinding,
  normalizePersistedProviderClaim,
} from "../analysis/finding-normalization";

export class ReplayNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ReplayNotFoundError";
  }
}

export type ReplayEventKind =
  | "evidence_version"
  | "change_request"
  | "analysis"
  | "provider_result"
  | "review"
  | "decision";

interface ReplayEventBase {
  id: string;
  kind: ReplayEventKind;
  occurredAt: Date;
  actorLabel: string;
  origin: "human" | "external";
  audit: { id: string; occurredAt: Date; relation: "direct" | "linked" } | null;
}

export interface ReplayEvidenceVersionEvent extends ReplayEventBase {
  kind: "evidence_version";
  sourceDocumentId: string;
  sourceKind: "agreement" | "instruction" | "attachment" | "manual";
  title: string;
  sourceAttribution: string | null;
  sourceObservedAt: Date | null;
  versionNumber: number;
  contentHash: string;
  content: string | null;
}

export interface ReplayChangeRequestEvent extends ReplayEventBase {
  kind: "change_request";
  title: string;
  instructionVersionId: string;
  status:
    | "requested"
    | "under_review"
    | "approved"
    | "rejected"
    | "unresolved"
    | "completed";
}

export interface ReplayAnalysisEvent extends ReplayEventBase {
  kind: "analysis";
  changeRequestId: string;
  agreementVersionId: string;
  agreementContentHash: string;
  instructionVersionId: string;
  instructionContentHash: string;
  status:
    | "pending"
    | "running"
    | "reconciliation_required"
    | "failed"
    | "completed"
    | "evidence_missing";
}

export interface ReplayProviderResultEvent extends ReplayEventBase {
  kind: "provider_result";
  analysisRunId: string;
  provider: string;
  adapterVersion: string;
  model: string;
  responseHash: string;
  findings: NormalizedFinding[];
}

export interface ReplayReviewEvent extends ReplayEventBase {
  kind: "review";
  analysisRunId: string;
  action: "noted" | "confirmed" | "corrected" | "dismissed";
  note: string | null;
}

export interface ReplayDecisionEvent extends ReplayEventBase {
  kind: "decision";
  analysisRunId: string;
  changeRequestId: string;
  agreementVersionId: string;
  instructionVersionId: string;
  outcome: "approved" | "rejected" | "unresolved";
  rationale: string | null;
  supersedesDecisionId: string | null;
  isCurrent: boolean;
}

export type ReplayEvent =
  | ReplayEvidenceVersionEvent
  | ReplayChangeRequestEvent
  | ReplayAnalysisEvent
  | ReplayProviderResultEvent
  | ReplayReviewEvent
  | ReplayDecisionEvent;

export interface DecisionReplay {
  projectId: string;
  events: ReplayEvent[];
}

const kindOrder: Record<ReplayEventKind, number> = {
  evidence_version: 10,
  change_request: 20,
  analysis: 30,
  provider_result: 40,
  review: 50,
  decision: 60,
};

export function sortReplayEvents(events: ReplayEvent[]) {
  return [...events].sort(
    (left, right) =>
      left.occurredAt.getTime() - right.occurredAt.getTime() ||
      kindOrder[left.kind] - kindOrder[right.kind] ||
      left.id.localeCompare(right.id),
  );
}

export async function getDecisionReplay(projectId: string) {
  const session = await requireVerifiedSession();
  return getDecisionReplayForActor(getDatabase(), session.user.id, projectId);
}

export async function getDecisionReplayForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
): Promise<DecisionReplay> {
  return database.transaction(async (transaction) => {
    const [authorization] = await transaction
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
      .for("share");
    if (!authorization || !hasProjectPermission(authorization, "project:read")) {
      throw new ReplayNotFoundError();
    }

    const scope = and(
      eq(sourceDocuments.projectId, projectId),
      eq(sourceDocuments.workspaceId, authorization.workspaceId),
    );
    // A Drizzle transaction owns one pg client. Keep these reads sequential so the
    // projection remains compatible with pg 9, which will reject overlapping queries
    // on an already-busy client.
    const [
      versions,
      requests,
      runs,
      providerResults,
      claims,
      reviews,
      decisionRows,
      audits,
    ] = [
      await transaction
        .select({
          id: documentVersions.id,
          sourceDocumentId: sourceDocuments.id,
          sourceKind: sourceDocuments.kind,
          title: sourceDocuments.title,
          sourceAttribution: sourceDocuments.sourceAttribution,
          sourceObservedAt: sourceDocuments.sourceObservedAt,
          versionNumber: documentVersions.versionNumber,
          contentHash: documentVersions.contentHash,
          content: documentVersions.contentText,
          createdAt: documentVersions.createdAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(documentVersions)
        .innerJoin(
          sourceDocuments,
          eq(sourceDocuments.id, documentVersions.sourceDocumentId),
        )
        .innerJoin(users, eq(users.id, documentVersions.createdByUserId))
        .where(scope)
        .orderBy(asc(documentVersions.createdAt), asc(documentVersions.id)),
      await transaction
        .select({
          id: changeRequests.id,
          title: changeRequests.title,
          instructionVersionId: changeRequests.instructionVersionId,
          status: changeRequests.status,
          createdAt: changeRequests.createdAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(changeRequests)
        .innerJoin(users, eq(users.id, changeRequests.createdByUserId))
        .where(
          and(
            eq(changeRequests.projectId, projectId),
            eq(changeRequests.workspaceId, authorization.workspaceId),
          ),
        ),
      await transaction
        .select({
          id: analysisRuns.id,
          changeRequestId: analysisRuns.changeRequestId,
          agreementVersionId: analysisRuns.agreementVersionId,
          agreementContentHash: analysisRuns.agreementContentHash,
          instructionVersionId: analysisRuns.instructionVersionId,
          instructionContentHash: analysisRuns.instructionContentHash,
          status: analysisRuns.status,
          createdAt: analysisRuns.createdAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(analysisRuns)
        .innerJoin(users, eq(users.id, analysisRuns.createdByUserId))
        .where(
          and(
            eq(analysisRuns.projectId, projectId),
            eq(analysisRuns.workspaceId, authorization.workspaceId),
          ),
        ),
      await transaction
        .select({
          id: analysisProviderResults.id,
          analysisRunId: analysisProviderResults.analysisRunId,
          provider: analysisProviderResults.provider,
          adapterVersion: analysisProviderResults.adapterVersion,
          model: analysisProviderResults.model,
          responseHash: analysisProviderResults.responseHash,
          receivedAt: analysisProviderResults.receivedAt,
        })
        .from(analysisProviderResults)
        .where(
          and(
            eq(analysisProviderResults.projectId, projectId),
            eq(analysisProviderResults.workspaceId, authorization.workspaceId),
          ),
        ),
      await transaction
        .select({
          id: providerClaimResults.id,
          analysisRunId: providerClaimResults.analysisRunId,
          claimIndex: providerClaimResults.claimIndex,
          claim: providerClaimResults.claim,
          verdict: providerClaimResults.verdict,
          evidenceDocumentVersionId: providerClaimResults.evidenceDocumentVersionId,
          evidenceQuote: providerClaimResults.evidenceQuote,
          evidenceStartOffset: providerClaimResults.evidenceStartOffset,
          evidenceEndOffset: providerClaimResults.evidenceEndOffset,
        })
        .from(providerClaimResults)
        .where(
          and(
            eq(providerClaimResults.projectId, projectId),
            eq(providerClaimResults.workspaceId, authorization.workspaceId),
          ),
        )
        .orderBy(asc(providerClaimResults.claimIndex)),
      await transaction
        .select({
          id: reviewActions.id,
          analysisRunId: reviewActions.analysisRunId,
          action: reviewActions.action,
          note: reviewActions.note,
          createdAt: reviewActions.createdAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(reviewActions)
        .innerJoin(users, eq(users.id, reviewActions.actorUserId))
        .where(
          and(
            eq(reviewActions.projectId, projectId),
            eq(reviewActions.workspaceId, authorization.workspaceId),
          ),
        ),
      await transaction
        .select({
          id: decisions.id,
          analysisRunId: decisions.analysisRunId,
          changeRequestId: decisions.changeRequestId,
          agreementVersionId: decisions.agreementVersionId,
          instructionVersionId: decisions.instructionVersionId,
          outcome: decisions.outcome,
          rationale: decisions.rationale,
          supersedesDecisionId: decisions.supersedesDecisionId,
          decidedAt: decisions.decidedAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(decisions)
        .innerJoin(users, eq(users.id, decisions.actorUserId))
        .where(
          and(
            eq(decisions.projectId, projectId),
            eq(decisions.workspaceId, authorization.workspaceId),
          ),
        ),
      await transaction
        .select({
          id: auditEvents.id,
          eventType: auditEvents.eventType,
          targetId: auditEvents.targetId,
          metadata: auditEvents.metadata,
          occurredAt: auditEvents.occurredAt,
        })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.projectId, projectId),
            eq(auditEvents.workspaceId, authorization.workspaceId),
          ),
        )
        .orderBy(asc(auditEvents.occurredAt), asc(auditEvents.id)),
    ];

    const supportedAudits = audits.filter((event) =>
      [
        "evidence.version_created",
        "analysis.created",
        "analysis.provider_result_validated",
        "decision.recorded",
        "decision.superseded",
      ].includes(event.eventType),
    );
    const auditByTarget = new Map(
      supportedAudits.map((event) => [
        `${event.eventType}:${event.targetId}`,
        { id: event.id, occurredAt: event.occurredAt, relation: "direct" as const },
      ]),
    );
    const reviewAuditById = new Map<
      string,
      { id: string; occurredAt: Date; relation: "linked" }
    >();
    for (const event of supportedAudits) {
      if (
        (event.eventType === "decision.recorded" ||
          event.eventType === "decision.superseded") &&
        typeof event.metadata.reviewActionId === "string"
      ) {
        reviewAuditById.set(event.metadata.reviewActionId, {
          id: event.id,
          occurredAt: event.occurredAt,
          relation: "linked",
        });
      }
    }
    const sourceByVersion = new Map(
      versions.map((version) => [
        version.id,
        {
          documentId: version.sourceDocumentId,
          versionId: version.id,
          title: version.title,
          versionNumber: version.versionNumber,
          contentHash: version.contentHash,
          content: version.content,
        },
      ]),
    );
    const runById = new Map(runs.map((run) => [run.id, run]));
    const claimsByRun = new Map<string, typeof claims>();
    for (const claim of claims) {
      const group = claimsByRun.get(claim.analysisRunId) ?? [];
      group.push(claim);
      claimsByRun.set(claim.analysisRunId, group);
    }
    const supersededIds = new Set(
      decisionRows.flatMap((decision) =>
        decision.supersedesDecisionId ? [decision.supersedesDecisionId] : [],
      ),
    );

    const events: ReplayEvent[] = [];
    for (const version of versions) {
      events.push({
        id: version.id,
        kind: "evidence_version",
        occurredAt: version.createdAt,
        actorLabel: actorLabel(version.actorName, version.actorEmail),
        origin: "human",
        audit: auditByTarget.get(`evidence.version_created:${version.id}`) ?? null,
        sourceDocumentId: version.sourceDocumentId,
        sourceKind: version.sourceKind,
        title: version.title,
        sourceAttribution: version.sourceAttribution,
        sourceObservedAt: version.sourceObservedAt,
        versionNumber: version.versionNumber,
        contentHash: version.contentHash,
        content: version.content,
      });
    }
    for (const request of requests) {
      events.push({
        id: request.id,
        kind: "change_request",
        occurredAt: request.createdAt,
        actorLabel: actorLabel(request.actorName, request.actorEmail),
        origin: "human",
        audit: null,
        title: request.title,
        instructionVersionId: request.instructionVersionId,
        status: request.status,
      });
    }
    for (const run of runs) {
      events.push({
        id: run.id,
        kind: "analysis",
        occurredAt: run.createdAt,
        actorLabel: actorLabel(run.actorName, run.actorEmail),
        origin: "human",
        audit: auditByTarget.get(`analysis.created:${run.id}`) ?? null,
        changeRequestId: run.changeRequestId,
        agreementVersionId: run.agreementVersionId,
        agreementContentHash: run.agreementContentHash,
        instructionVersionId: run.instructionVersionId,
        instructionContentHash: run.instructionContentHash,
        status: run.status,
      });
    }
    for (const result of providerResults) {
      const providerAudit = auditByTarget.get(
        `analysis.provider_result_validated:${result.analysisRunId}`,
      );
      const run = runById.get(result.analysisRunId);
      const agreement = run ? sourceByVersion.get(run.agreementVersionId) : undefined;
      const resultClaims = claimsByRun.get(result.analysisRunId) ?? [];
      let normalizedFindings: NormalizedFinding[];
      if (agreement !== undefined && agreement.content !== null) {
        const findingSource: FindingSourceVersion = {
          ...agreement,
          content: agreement.content,
        };
        normalizedFindings = resultClaims.map((claim) =>
          normalizePersistedProviderClaim(claim, findingSource),
        );
      } else {
        normalizedFindings = resultClaims.map((claim) => ({
          claimIndex: claim.claimIndex,
          claim: claim.claim,
          verdict: claim.verdict,
          category: "missing_evidence" as const,
          reviewState: "unresolved" as const,
          evidence: { state: "invalid" as const },
        }));
      }
      events.push({
        id: result.id,
        kind: "provider_result",
        occurredAt: result.receivedAt,
        actorLabel: `${result.provider} external provider`,
        origin: "external",
        audit: providerAudit ? { ...providerAudit, relation: "linked" } : null,
        analysisRunId: result.analysisRunId,
        provider: result.provider,
        adapterVersion: result.adapterVersion,
        model: result.model,
        responseHash: result.responseHash,
        findings: normalizedFindings,
      });
    }
    for (const review of reviews) {
      events.push({
        id: review.id,
        kind: "review",
        occurredAt: review.createdAt,
        actorLabel: actorLabel(review.actorName, review.actorEmail),
        origin: "human",
        audit: reviewAuditById.get(review.id) ?? null,
        analysisRunId: review.analysisRunId,
        action: review.action,
        note: review.note,
      });
    }
    for (const decision of decisionRows) {
      events.push({
        id: decision.id,
        kind: "decision",
        occurredAt: decision.decidedAt,
        actorLabel: actorLabel(decision.actorName, decision.actorEmail),
        origin: "human",
        audit:
          auditByTarget.get(
            `${decision.supersedesDecisionId ? "decision.superseded" : "decision.recorded"}:${decision.id}`,
          ) ?? null,
        analysisRunId: decision.analysisRunId,
        changeRequestId: decision.changeRequestId,
        agreementVersionId: decision.agreementVersionId,
        instructionVersionId: decision.instructionVersionId,
        outcome: decision.outcome,
        rationale: decision.rationale,
        supersedesDecisionId: decision.supersedesDecisionId,
        isCurrent: !supersededIds.has(decision.id),
      });
    }

    return { projectId, events: sortReplayEvents(events) };
  });
}

function actorLabel(name: string | null, email: string | null) {
  return name?.trim() || email?.trim() || "Authenticated project member";
}
