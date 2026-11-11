import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { requireVerifiedSession } from "../authorization/session";
import { getDatabase, type Database } from "../db/client";
import { analysisCompareResults, analysisRuns } from "../db/schema";
import { serverEnvironment } from "../env";
import {
  ClockedAdapterError,
  requestClockedCompare,
} from "../integrations/clocked/adapter";
import {
  sliceUnicodeCodePoints,
  unicodeCodePointOffsetToUtf16,
  type ClockedCompareTextResponse,
} from "../integrations/clocked/contract";
import {
  AnalysisNotFoundError,
  getReadyVersion,
  requireProjectActor,
} from "./analysis-service";
import { verifyContentHash } from "./clocked-result";
import { requireProcessingAuthorization } from "./processing-authorization";

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const MAX_COMPARE_PER_WORKSPACE_24H = 10;
const MAX_COMPARE_GLOBAL_24H = 100;

export class CompareUnavailableError extends Error {}
export class CompareAlreadyStartedError extends Error {}
export class CompareBudgetError extends Error {}
export class CompareEvidenceError extends Error {}

type CompareRecord = typeof analysisCompareResults.$inferSelect;

function verifyPassage(
  passage: { document: string; quote: string; start: number; end: number },
  sources: Record<string, string>,
) {
  const source = sources[passage.document];
  if (
    source === undefined ||
    passage.end > Array.from(source).length ||
    passage.start > passage.end
  ) {
    throw new CompareEvidenceError("Compare returned an invalid source location");
  }
  if (sliceUnicodeCodePoints(source, passage.start, passage.end) !== passage.quote) {
    throw new CompareEvidenceError("Compare quote does not match saved source");
  }
  // The offsets are code points; conversion is checked for exact JS rendering.
  const start = unicodeCodePointOffsetToUtf16(source, passage.start);
  const end = unicodeCodePointOffsetToUtf16(source, passage.end);
  if (source.slice(start, end) !== passage.quote)
    throw new CompareEvidenceError("Invalid UTF-16 quote range");
}

export function validateCompareEvidence(
  result: ClockedCompareTextResponse,
  sources: Record<string, string>,
) {
  const aliases = Object.keys(sources);
  if (
    result.evidence !== "all" ||
    result.documents.length !== aliases.length ||
    new Set(result.documents.map((d) => d.id)).size !== aliases.length ||
    result.documents.some((d) => !aliases.includes(d.id))
  ) {
    throw new CompareEvidenceError("Compare document identity mismatch");
  }
  if (
    result.pairs.length > 1 ||
    result.pairs.some(
      (pair) =>
        pair.a === pair.b || !aliases.includes(pair.a) || !aliases.includes(pair.b),
    )
  ) {
    throw new CompareEvidenceError("Compare pair identity mismatch");
  }
  for (const pair of result.pairs) {
    for (const finding of [...pair.duplicates, ...pair.conflicts]) {
      verifyPassage(finding.a, sources);
      verifyPassage(finding.b, sources);
      if (finding.a.document !== pair.a || finding.b.document !== pair.b) {
        throw new CompareEvidenceError("Compare finding is not linked to its pair");
      }
    }
  }
  for (const indices of [
    result.duplicates,
    result.overlaps,
    result.conflicts,
    result.related_pairs,
  ]) {
    if (indices.some((i) => i >= result.pairs.length))
      throw new CompareEvidenceError("Compare pair index invalid");
  }
  for (const doc of result.documents) {
    if (
      [...doc.duplicates, ...doc.overlaps, ...doc.conflicts].some(
        (id) => !aliases.includes(id) || id === doc.id,
      )
    ) {
      throw new CompareEvidenceError("Compare document cross-reference invalid");
    }
  }
}

export async function listCompareForActor(
  database: Database,
  actorId: string,
  projectId: string,
): Promise<CompareRecord[]> {
  return database.transaction(async (tx) => {
    await requireProjectActor(tx, actorId, projectId, false);
    return tx
      .select()
      .from(analysisCompareResults)
      .where(eq(analysisCompareResults.projectId, projectId));
  });
}

export async function runCompare(
  projectId: string,
  analysisId: string,
  authorization: unknown,
) {
  const session = await requireVerifiedSession();
  requireProcessingAuthorization(authorization);
  if (!serverEnvironment.CLOCKED_API_KEY)
    throw new CompareUnavailableError("Clocked is not configured");
  return runCompareForActor(getDatabase(), session.user.id, projectId, analysisId, {
    apiKey: serverEnvironment.CLOCKED_API_KEY,
    baseUrl: serverEnvironment.CLOCKED_BASE_URL,
  });
}

export async function runCompareForActor(
  db: Database,
  actorId: string,
  projectId: string,
  analysisId: string,
  adapter: {
    apiKey: string;
    baseUrl: string;
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
  },
) {
  const claimed = await db.transaction(async (tx) => {
    const actor = await requireProjectActor(tx, actorId, projectId, true);
    const [run] = await tx
      .select()
      .from(analysisRuns)
      .where(and(eq(analysisRuns.id, analysisId), eq(analysisRuns.projectId, projectId)))
      .limit(1)
      .for("update", { of: analysisRuns });
    if (!run || run.workspaceId !== actor.workspaceId || run.status !== "completed")
      throw new AnalysisNotFoundError();
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('clocked-budget:global', 0))`,
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`clocked-budget:${run.workspaceId}`}, 0))`,
    );
    const [existing] = await tx
      .select({ id: analysisCompareResults.id })
      .from(analysisCompareResults)
      .where(eq(analysisCompareResults.analysisRunId, run.id))
      .limit(1);
    if (existing)
      throw new CompareAlreadyStartedError(
        "Compare already attempted; reload to see its status",
      );
    const [usage] = await tx
      .select({
        global: sql<number>`count(*) filter (where ${analysisCompareResults.createdAt} > now() - interval '24 hours')::int`,
        workspace: sql<number>`count(*) filter (where ${analysisCompareResults.workspaceId} = ${run.workspaceId} and ${analysisCompareResults.createdAt} > now() - interval '24 hours')::int`,
        running: sql<number>`count(*) filter (where ${analysisCompareResults.status} = 'running' and ${analysisCompareResults.createdAt} > now() - interval '130 seconds')::int`,
      })
      .from(analysisCompareResults);
    if (
      (usage?.global ?? 0) >= MAX_COMPARE_GLOBAL_24H ||
      (usage?.workspace ?? 0) >= MAX_COMPARE_PER_WORKSPACE_24H ||
      (usage?.running ?? 0) >= 2
    )
      throw new CompareBudgetError();
    const agreement = await getReadyVersion(
      tx,
      projectId,
      run.workspaceId,
      run.agreementVersionId,
      "agreement",
    );
    const instruction = await getReadyVersion(
      tx,
      projectId,
      run.workspaceId,
      run.instructionVersionId,
      "instruction",
    );
    verifyContentHash(agreement.content, run.agreementContentHash);
    verifyContentHash(instruction.content, run.instructionContentHash);
    const aliases = {
      [`agreement-version:${run.agreementVersionId}`]: agreement.content,
      [`instruction-version:${run.instructionVersionId}`]: instruction.content,
    };
    const request = {
      documents: Object.entries(aliases).map(([id, text]) => ({ id, text })),
      evidence: "all" as const,
    };
    if (
      request.documents.some((d) => !d.text) ||
      request.documents.reduce((n, d) => n + d.text.length, 0) > 200000
    )
      throw new CompareUnavailableError("Selected evidence exceeds Compare limits");
    const [record] = await tx
      .insert(analysisCompareResults)
      .values({
        analysisRunId: run.id,
        projectId,
        workspaceId: run.workspaceId,
        agreementVersionId: run.agreementVersionId,
        instructionVersionId: run.instructionVersionId,
        providerIdempotencyKey: randomUUID(),
        requestHash: sha256(JSON.stringify(request)),
        status: "running",
      })
      .returning();
    if (!record)
      throw new CompareUnavailableError("Unable to create Compare processing record");
    return { record, request, aliases };
  });
  let status = "completed";
  let failureCode: string | null = null;
  let response: Awaited<ReturnType<typeof requestClockedCompare>> | null = null;
  try {
    response = await requestClockedCompare({
      ...adapter,
      idempotencyKey: claimed.record.providerIdempotencyKey,
      request: claimed.request,
    });
    validateCompareEvidence(response.result, claimed.aliases);
  } catch (error) {
    status =
      error instanceof ClockedAdapterError &&
      ["timeout_unknown", "network_unknown", "conflict"].includes(error.kind)
        ? "outcome_unknown"
        : "failed";
    failureCode =
      error instanceof ClockedAdapterError
        ? error.kind
        : error instanceof CompareEvidenceError
          ? "evidence_integrity"
          : "processing_error";
    response = null;
  }
  // Authorization was verified when the Compare request was claimed.
  // Record its outcome even if the initiating user's membership later changes.
  const finalized = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(analysisCompareResults)
      .set({
        status,
        failureCode,
        model: response?.result.model ?? null,
        responseHash: response?.responseHash ?? null,
        rawResponse: response?.rawResponse ?? null,
        transportMetadata: response?.transportMetadata
          ? { ...response.transportMetadata }
          : null,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(analysisCompareResults.id, claimed.record.id),
          eq(analysisCompareResults.status, "running"),
        ),
      )
      .returning({ id: analysisCompareResults.id });

    return updated;
  });

  if (!finalized) {
    throw new CompareUnavailableError("Compare outcome could not be finalized");
  }

  return { status, failureCode };
}
