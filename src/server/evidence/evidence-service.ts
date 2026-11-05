import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDatabase, type Database } from "../db/client";
import {
  auditEvents,
  authAccounts,
  documentVersions,
  projectMemberships,
  projects,
  sourceDocuments,
  workspaceMemberships,
} from "../db/schema";
import { hasProjectPermission } from "../authorization/policy";
import { requireVerifiedSession } from "../authorization/session";
import {
  EvidenceValidationError,
  hashEvidenceContent,
  PASTED_TEXT_MEDIA_TYPE,
  parseEvidenceInput,
  parseEvidenceVersionInput,
} from "./validation";

export interface EvidenceVersionRecord {
  id: string;
  versionNumber: number;
  content: string;
  contentHash: string;
  byteSize: number;
  capturedAt: Date | null;
  createdAt: Date;
  createdByUserId: string;
}

export interface EvidenceSourceRecord {
  id: string;
  projectId: string;
  workspaceId: string;
  kind: "agreement" | "instruction";
  title: string;
  sourceAttribution: string | null;
  sourceObservedAt: Date | null;
  createdAt: Date;
  versions: EvidenceVersionRecord[];
}

interface EvidenceRow {
  sourceDocumentId: string;
  projectId: string;
  workspaceId: string;
  kind: "agreement" | "instruction" | "attachment" | "manual";
  title: string;
  sourceAttribution: string | null;
  sourceObservedAt: Date | null;
  sourceCreatedAt: Date;
  versionId: string;
  versionNumber: number;
  content: string | null;
  contentHash: string;
  byteSize: number;
  capturedAt: Date | null;
  versionCreatedAt: Date;
  createdByUserId: string;
}

export class EvidenceNotFoundError extends Error {
  constructor() {
    super("Evidence resource not found");
    this.name = "EvidenceNotFoundError";
  }
}

export class EvidenceConflictError extends Error {
  constructor() {
    super("The retry key was already used for different evidence");
    this.name = "EvidenceConflictError";
  }
}

export class EvidenceStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super("Evidence could not be stored", options);
    this.name = "EvidenceStorageError";
  }
}

export async function createEvidenceSource(projectId: string, input: unknown) {
  const session = await requireVerifiedSession();
  return createEvidenceSourceForActor(getDatabase(), session.user.id, projectId, input);
}

export async function createEvidenceVersion(
  projectId: string,
  sourceDocumentId: string,
  input: unknown,
) {
  const session = await requireVerifiedSession();
  return createEvidenceVersionForActor(
    getDatabase(),
    session.user.id,
    projectId,
    sourceDocumentId,
    input,
  );
}

export async function listEvidenceSources(projectId: string) {
  const session = await requireVerifiedSession();
  return listEvidenceSourcesForActor(getDatabase(), session.user.id, projectId);
}

export async function getEvidenceSource(projectId: string, sourceDocumentId: string) {
  const session = await requireVerifiedSession();
  return getEvidenceSourceForActor(
    getDatabase(),
    session.user.id,
    projectId,
    sourceDocumentId,
  );
}

export async function createEvidenceSourceForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  unsafeInput: unknown,
): Promise<EvidenceSourceRecord> {
  const input = parseEvidenceInput(unsafeInput);
  const contentHash = hashEvidenceContent(input.content);
  const byteSize = Buffer.byteLength(input.content, "utf8");

  try {
    return await database.transaction(async (transaction) => {
      const actor = await requireProjectActor(transaction, actorUserId, projectId, true);
      await lockIdempotencyKey(transaction, projectId, input.idempotencyKey);

      const existing = await findIdempotentVersion(
        transaction,
        projectId,
        input.idempotencyKey,
      );
      if (existing) {
        if (
          existing.kind !== input.kind ||
          existing.title !== input.title ||
          existing.sourceAttribution !== (input.sourceAttribution ?? null) ||
          existing.sourceObservedAt?.toISOString() !==
            (input.sourceObservedAt
              ? new Date(input.sourceObservedAt).toISOString()
              : undefined) ||
          existing.contentHash !== contentHash
        ) {
          throw new EvidenceConflictError();
        }
        return getEvidenceSourceInScope(
          transaction,
          projectId,
          existing.sourceDocumentId,
        );
      }

      const [source] = await transaction
        .insert(sourceDocuments)
        .values({
          projectId,
          workspaceId: actor.workspaceId,
          kind: input.kind,
          title: input.title,
          sourceAttribution: input.sourceAttribution,
          sourceObservedAt: input.sourceObservedAt
            ? new Date(input.sourceObservedAt)
            : undefined,
          createdByUserId: actorUserId,
        })
        .returning();
      if (!source) {
        throw new EvidenceStorageError();
      }

      const [version] = await transaction
        .insert(documentVersions)
        .values({
          sourceDocumentId: source.id,
          projectId,
          workspaceId: actor.workspaceId,
          versionNumber: 1,
          contentHash,
          contentText: input.content,
          captureMethod: "pasted_text",
          idempotencyKey: input.idempotencyKey,
          mediaType: PASTED_TEXT_MEDIA_TYPE,
          byteSize,
          processingStatus: "ready",
          capturedAt: new Date(),
          createdByUserId: actorUserId,
        })
        .returning();
      if (!version) {
        throw new EvidenceStorageError();
      }

      await recordEvidenceAudit(transaction, actor, version, true);
      return getEvidenceSourceInScope(transaction, projectId, source.id);
    });
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function createEvidenceVersionForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  sourceDocumentId: string,
  unsafeInput: unknown,
): Promise<EvidenceSourceRecord> {
  const input = parseEvidenceVersionInput(unsafeInput);
  const contentHash = hashEvidenceContent(input.content);
  const byteSize = Buffer.byteLength(input.content, "utf8");

  try {
    return await database.transaction(async (transaction) => {
      const actor = await requireProjectActor(transaction, actorUserId, projectId, true);
      await lockIdempotencyKey(transaction, projectId, input.idempotencyKey);
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${sourceDocumentId}, 0))`,
      );

      const existing = await findIdempotentVersion(
        transaction,
        projectId,
        input.idempotencyKey,
      );
      if (existing) {
        if (
          existing.sourceDocumentId !== sourceDocumentId ||
          existing.contentHash !== contentHash
        ) {
          throw new EvidenceConflictError();
        }
        return getEvidenceSourceInScope(transaction, projectId, sourceDocumentId);
      }

      const [source] = await transaction
        .select({ id: sourceDocuments.id, workspaceId: sourceDocuments.workspaceId })
        .from(sourceDocuments)
        .where(
          and(
            eq(sourceDocuments.id, sourceDocumentId),
            eq(sourceDocuments.projectId, projectId),
            eq(sourceDocuments.workspaceId, actor.workspaceId),
          ),
        )
        .limit(1);
      if (!source) {
        throw new EvidenceNotFoundError();
      }

      const [latest] = await transaction
        .select({ versionNumber: documentVersions.versionNumber })
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.sourceDocumentId, sourceDocumentId),
            eq(documentVersions.projectId, projectId),
            eq(documentVersions.workspaceId, actor.workspaceId),
          ),
        )
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);
      if (!latest) {
        throw new EvidenceNotFoundError();
      }

      const [version] = await transaction
        .insert(documentVersions)
        .values({
          sourceDocumentId,
          projectId,
          workspaceId: actor.workspaceId,
          versionNumber: latest.versionNumber + 1,
          contentHash,
          contentText: input.content,
          captureMethod: "pasted_text",
          idempotencyKey: input.idempotencyKey,
          mediaType: PASTED_TEXT_MEDIA_TYPE,
          byteSize,
          processingStatus: "ready",
          capturedAt: new Date(),
          createdByUserId: actorUserId,
        })
        .returning();
      if (!version) {
        throw new EvidenceStorageError();
      }

      await recordEvidenceAudit(transaction, actor, version, false);
      return getEvidenceSourceInScope(transaction, projectId, sourceDocumentId);
    });
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function listEvidenceSourcesForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
): Promise<EvidenceSourceRecord[]> {
  try {
    return await database.transaction(async (transaction) => {
      await requireProjectActor(transaction, actorUserId, projectId, false);
      const records = await transaction
        .select(evidenceSelection)
        .from(sourceDocuments)
        .innerJoin(
          documentVersions,
          and(
            eq(documentVersions.sourceDocumentId, sourceDocuments.id),
            eq(documentVersions.projectId, sourceDocuments.projectId),
            eq(documentVersions.workspaceId, sourceDocuments.workspaceId),
          ),
        )
        .where(eq(sourceDocuments.projectId, projectId))
        .orderBy(asc(sourceDocuments.createdAt), asc(documentVersions.versionNumber));
      return groupEvidence(records);
    });
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function getEvidenceSourceForActor(
  database: Database,
  actorUserId: string,
  projectId: string,
  sourceDocumentId: string,
): Promise<EvidenceSourceRecord> {
  try {
    return await database.transaction(async (transaction) => {
      await requireProjectActor(transaction, actorUserId, projectId, false);
      return getEvidenceSourceInScope(transaction, projectId, sourceDocumentId);
    });
  } catch (error) {
    throw mapStorageError(error);
  }
}

const evidenceSelection = {
  sourceDocumentId: sourceDocuments.id,
  projectId: sourceDocuments.projectId,
  workspaceId: sourceDocuments.workspaceId,
  kind: sourceDocuments.kind,
  title: sourceDocuments.title,
  sourceAttribution: sourceDocuments.sourceAttribution,
  sourceObservedAt: sourceDocuments.sourceObservedAt,
  sourceCreatedAt: sourceDocuments.createdAt,
  versionId: documentVersions.id,
  versionNumber: documentVersions.versionNumber,
  content: documentVersions.contentText,
  contentHash: documentVersions.contentHash,
  byteSize: documentVersions.byteSize,
  capturedAt: documentVersions.capturedAt,
  versionCreatedAt: documentVersions.createdAt,
  createdByUserId: documentVersions.createdByUserId,
};

async function requireProjectActor(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
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
    throw new EvidenceNotFoundError();
  }
  return actor;
}

async function lockIdempotencyKey(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  projectId: string,
  idempotencyKey: string,
) {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${projectId}:${idempotencyKey}`}, 0))`,
  );
}

async function findIdempotentVersion(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  projectId: string,
  idempotencyKey: string,
) {
  const [record] = await transaction
    .select({
      sourceDocumentId: sourceDocuments.id,
      kind: sourceDocuments.kind,
      title: sourceDocuments.title,
      sourceAttribution: sourceDocuments.sourceAttribution,
      sourceObservedAt: sourceDocuments.sourceObservedAt,
      contentHash: documentVersions.contentHash,
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
        eq(documentVersions.projectId, projectId),
        eq(documentVersions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return record;
}

async function getEvidenceSourceInScope(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  projectId: string,
  sourceDocumentId: string,
) {
  const records = await transaction
    .select(evidenceSelection)
    .from(sourceDocuments)
    .innerJoin(
      documentVersions,
      and(
        eq(documentVersions.sourceDocumentId, sourceDocuments.id),
        eq(documentVersions.projectId, sourceDocuments.projectId),
        eq(documentVersions.workspaceId, sourceDocuments.workspaceId),
      ),
    )
    .where(
      and(
        eq(sourceDocuments.id, sourceDocumentId),
        eq(sourceDocuments.projectId, projectId),
      ),
    )
    .orderBy(asc(documentVersions.versionNumber));
  const [source] = groupEvidence(records);
  if (!source) {
    throw new EvidenceNotFoundError();
  }
  return source;
}

async function recordEvidenceAudit(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  actor: { workspaceId: string; identityId: string },
  version: typeof documentVersions.$inferSelect,
  sourceCreated: boolean,
) {
  await transaction.insert(auditEvents).values({
    workspaceId: actor.workspaceId,
    projectId: version.projectId,
    origin: "human",
    actorUserId: version.createdByUserId,
    actorIdentityId: actor.identityId,
    eventType: "evidence.version_created",
    targetType: "document_version",
    targetId: version.id,
    requestCorrelationId: randomUUID(),
    metadata: {
      sourceDocumentId: version.sourceDocumentId,
      versionNumber: version.versionNumber,
      contentHash: version.contentHash,
      byteSize: version.byteSize,
      captureMethod: "pasted_text",
      sourceCreated,
    },
  });
}

function groupEvidence(records: EvidenceRow[]) {
  const sources = new Map<string, EvidenceSourceRecord>();
  for (const record of records) {
    if (record.kind !== "agreement" && record.kind !== "instruction") {
      continue;
    }
    if (record.content === null) {
      continue;
    }
    const source = sources.get(record.sourceDocumentId) ?? {
      id: record.sourceDocumentId,
      projectId: record.projectId,
      workspaceId: record.workspaceId,
      kind: record.kind,
      title: record.title,
      sourceAttribution: record.sourceAttribution,
      sourceObservedAt: record.sourceObservedAt,
      createdAt: record.sourceCreatedAt,
      versions: [],
    };
    source.versions.push({
      id: record.versionId,
      versionNumber: record.versionNumber,
      content: record.content,
      contentHash: record.contentHash,
      byteSize: record.byteSize,
      capturedAt: record.capturedAt,
      createdAt: record.versionCreatedAt,
      createdByUserId: record.createdByUserId,
    });
    sources.set(record.sourceDocumentId, source);
  }
  return [...sources.values()];
}

function mapStorageError(error: unknown) {
  if (
    error instanceof EvidenceValidationError ||
    error instanceof EvidenceNotFoundError ||
    error instanceof EvidenceConflictError ||
    error instanceof EvidenceStorageError
  ) {
    return error;
  }
  return new EvidenceStorageError({ cause: error });
}
