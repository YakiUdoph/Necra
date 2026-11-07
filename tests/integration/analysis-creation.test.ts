import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  AnalysisConflictError,
  AnalysisNotFoundError,
  AnalysisStaleTransitionError,
  createAnalysisForActor,
  listAnalysesForActor,
  transitionAnalysisForWorker,
} from "../../src/server/analysis/analysis-service";
import { AnalysisValidationError } from "../../src/server/analysis/validation";
import { processAnalysisForActor } from "../../src/server/analysis/processing-service";
import {
  createDecisionForActor,
  DecisionConflictError,
  DecisionNotFoundError,
  DecisionStorageError,
} from "../../src/server/decisions/decision-service";
import { DecisionValidationError } from "../../src/server/decisions/validation";
import * as schema from "../../src/server/db/schema";
import { createEvidenceSourceForActor } from "../../src/server/evidence/evidence-service";
import { requestClockedCompare } from "../../src/server/integrations/clocked/adapter";
import {
  getDecisionReplayForActor,
  ReplayNotFoundError,
} from "../../src/server/replay/decision-replay-service";
import { getSafeTestDatabaseAdminUrl } from "../helpers/test-database";

const adminDatabaseUrl = getSafeTestDatabaseAdminUrl();
const databaseName = `necra_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = new Pool({ connectionString: adminDatabaseUrl, max: 1 });
const databaseUrl = new URL(adminDatabaseUrl);
databaseUrl.pathname = `/${databaseName}`;
let pool: Pool;
let databaseCreated = false;

async function applyMigration(client: PoolClient, filename: string) {
  const migration = await readFile(resolve("migrations", filename), "utf8");
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean))
    await client.query(statement);
}

async function seedActor(label: string, role = "manager") {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  await pool.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
    userId,
    `${label}-${userId}@example.test`,
  ]);
  await pool.query(
    `INSERT INTO auth_accounts (id, account_id, provider_id, user_id) VALUES ($1, $2, 'credential', $3)`,
    [randomUUID(), `${label}-${userId}`, userId],
  );
  await pool.query(`INSERT INTO workspaces (id, name) VALUES ($1, $2)`, [
    workspaceId,
    `TEST ONLY ${label}`,
  ]);
  await pool.query(
    `INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES ($1, $2, 'administrator')`,
    [workspaceId, userId],
  );
  await pool.query(
    `INSERT INTO projects (id, workspace_id, name, created_by_user_id) VALUES ($1, $2, $3, $4)`,
    [projectId, workspaceId, `TEST ONLY ${label}`, userId],
  );
  await pool.query(
    `INSERT INTO project_memberships (project_id, workspace_id, user_id, role, can_decide) VALUES ($1, $2, $3, $4, false)`,
    [projectId, workspaceId, userId, role],
  );
  return { userId, workspaceId, projectId };
}

async function seedEvidence(
  database: ReturnType<typeof drizzle<typeof schema>>,
  actor: Awaited<ReturnType<typeof seedActor>>,
) {
  const agreement = await createEvidenceSourceForActor(
    database,
    actor.userId,
    actor.projectId,
    {
      format: "pasted_text",
      kind: "agreement",
      title: "Signed scope",
      content: "Scope: design only. Fee: €4,000.",
      idempotencyKey: randomUUID(),
    },
  );
  const instruction = await createEvidenceSourceForActor(
    database,
    actor.userId,
    actor.projectId,
    {
      format: "pasted_text",
      kind: "instruction",
      title: "Dashboard request",
      content: "Please add a dashboard.",
      idempotencyKey: randomUUID(),
    },
  );
  const agreementVersion = agreement.versions[0];
  const instructionVersion = instruction.versions[0];
  if (!agreementVersion || !instructionVersion) {
    throw new Error("Test evidence version was not created");
  }
  return {
    agreement: { ...agreementVersion, documentId: agreement.id },
    instruction: { ...instructionVersion, documentId: instruction.id },
  };
}

function clockedResponse(agreementVersionId: string, includeEvidence = true) {
  const alias = `agreement-version:${agreementVersionId}`;
  return {
    model: "clocked-test-model",
    instructions_used: "default",
    grounded: 0.2,
    ungrounded: 0.8,
    verdict: "not_stated",
    threshold: 0.5,
    claims: [
      {
        claim: "Please add a dashboard.",
        kind: "claim",
        counted: true,
        weight: 1,
        supported: 0.05,
        contradicted: 0.05,
        not_stated: 0.89,
        not_a_claim: 0.01,
        verdict: "not_stated",
        sources: { [alias]: 1 },
        source: null,
        evidence: includeEvidence
          ? {
              document: alias,
              quote: "Scope: design only.",
              start: 0,
              end: 19,
              confidence: 0.9,
            }
          : undefined,
      },
    ],
    documents: [{ id: alias, share: 1, share_of_answer: 0.2, claims: [0] }],
    unsupported_claims: [0],
    not_claims: [],
    weakest_claim: { index: 0, supported: 0.05 },
  };
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  pool = new Pool({ connectionString: databaseUrl.toString(), max: 12 });
  const client = await pool.connect();
  try {
    for (const file of [
      "0000_lovely_marvel_apes.sql",
      "0001_omniscient_black_widow.sql",
      "0002_dapper_masked_marvel.sql",
      "0003_fancy_kingpin.sql",
      "0004_material_morgan_stark.sql",
      "0005_aberrant_invisible_woman.sql",
    ])
      await applyMigration(client, file);
  } finally {
    client.release();
  }
});

async function completeCheck(
  database: ReturnType<typeof drizzle<typeof schema>>,
  actor: Awaited<ReturnType<typeof seedActor>>,
  includeEvidence = true,
) {
  const evidence = await seedEvidence(database, actor);
  const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
    agreementVersionId: evidence.agreement.id,
    instructionVersionId: evidence.instruction.id,
    idempotencyKey: randomUUID(),
  });
  await processAnalysisForActor(database, actor.userId, actor.projectId, run.id, {
    apiKey: "TEST_ONLY_CLOCKED_KEY",
    baseUrl: "https://clocked.rezolve.ai/clocked",
    fetchImplementation: async () =>
      new Response(
        JSON.stringify(clockedResponse(evidence.agreement.id, includeEvidence)),
        { status: 200 },
      ),
  });
  return { run, evidence };
}

async function addProjectMember(
  actor: Awaited<ReturnType<typeof seedActor>>,
  options: {
    role?: "manager" | "reviewer" | "participant";
    canDecide?: boolean;
    projectStatus?: "active" | "suspended";
    workspaceStatus?: "active" | "suspended";
  } = {},
) {
  const userId = randomUUID();
  await pool.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
    userId,
    `member-${userId}@example.test`,
  ]);
  await pool.query(
    `INSERT INTO auth_accounts (id, account_id, provider_id, user_id) VALUES ($1,$2,'credential',$3)`,
    [randomUUID(), userId, userId],
  );
  await pool.query(
    `INSERT INTO workspace_memberships (workspace_id,user_id,role,status) VALUES ($1,$2,'member',$3)`,
    [actor.workspaceId, userId, options.workspaceStatus ?? "active"],
  );
  await pool.query(
    `INSERT INTO project_memberships (project_id,workspace_id,user_id,role,can_decide,status)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      actor.projectId,
      actor.workspaceId,
      userId,
      options.role ?? "reviewer",
      options.canDecide ?? true,
      options.projectStatus ?? "active",
    ],
  );
  return userId;
}

const decisionInput = (overrides: Record<string, unknown> = {}) => ({
  outcome: "approved",
  rationale: "TEST ONLY explicit project decision",
  idempotencyKey: randomUUID(),
  supersedesDecisionId: null,
  confirmReviewedExactRecord: true,
  ...overrides,
});

describe("T010 real PostgreSQL human decisions", () => {
  it("records authorized approval and rejection with trusted actors and exact contexts", async () => {
    const database = drizzle(pool, { schema });
    for (const outcome of ["approved", "rejected"] as const) {
      const actor = await seedActor(`decision-${outcome}`);
      await pool.query(
        `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
        [actor.projectId, actor.userId],
      );
      const { run, evidence } = await completeCheck(database, actor, false);
      const result = await createDecisionForActor(
        database,
        actor.userId,
        actor.projectId,
        run.id,
        decisionInput({ outcome }),
      );
      expect(result.created).toBe(true);
      expect(result.decision).toMatchObject({
        actorUserId: actor.userId,
        analysisRunId: run.id,
        changeRequestId: run.changeRequestId,
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        outcome,
      });
      const stored = await pool.query(
        `SELECT d.*, cr.status,
                (SELECT count(*)::int FROM review_actions ra WHERE ra.analysis_run_id=d.analysis_run_id) AS reviews,
                (SELECT count(*)::int FROM audit_events ae WHERE ae.target_id=d.id AND ae.event_type='decision.recorded') AS audits
         FROM decisions d JOIN change_requests cr ON cr.id=d.change_request_id WHERE d.id=$1`,
        [result.decision.id],
      );
      expect(stored.rows[0]).toMatchObject({
        analysis_run_id: run.id,
        agreement_version_id: evidence.agreement.id,
        instruction_version_id: evidence.instruction.id,
        actor_user_id: actor.userId,
        outcome,
        status: outcome,
        reviews: 1,
        audits: 1,
      });
      expect(stored.rows[0].decided_at).toBeInstanceOf(Date);
    }
  });

  it("denies outsiders, revoked memberships, missing can_decide, and role-only authority", async () => {
    const actor = await seedActor("decision-authz");
    const outsider = await seedActor("decision-outsider");
    const database = drizzle(pool, { schema });
    const { run } = await completeCheck(database, actor);
    const noPermission = await addProjectMember(actor, { canDecide: false });
    const roleOnly = await addProjectMember(actor, {
      role: "participant",
      canDecide: true,
    });
    const revoked = await addProjectMember(actor, { projectStatus: "suspended" });
    const expiredWorkspace = await addProjectMember(actor, {
      workspaceStatus: "suspended",
    });
    for (const userId of [
      outsider.userId,
      noPermission,
      roleOnly,
      revoked,
      expiredWorkspace,
    ]) {
      await expect(
        createDecisionForActor(
          database,
          userId,
          actor.projectId,
          run.id,
          decisionInput(),
        ),
      ).rejects.toBeInstanceOf(DecisionNotFoundError);
    }
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM decisions WHERE project_id=$1`,
          [actor.projectId],
        )
      ).rows[0].count,
    ).toBe(0);
  });

  it("prevents cross-project decisions and rejects client actor spoofing", async () => {
    const actor = await seedActor("decision-scope-a");
    const other = await seedActor("decision-scope-b");
    const database = drizzle(pool, { schema });
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    const { run } = await completeCheck(database, other);
    await expect(
      createDecisionForActor(
        database,
        actor.userId,
        actor.projectId,
        run.id,
        decisionInput(),
      ),
    ).rejects.toBeInstanceOf(DecisionNotFoundError);
    await expect(
      createDecisionForActor(
        database,
        actor.userId,
        actor.projectId,
        randomUUID(),
        decisionInput({ actorUserId: other.userId }),
      ),
    ).rejects.toBeInstanceOf(DecisionValidationError);
  });

  it("deduplicates identical retries and serializes simultaneous attempts", async () => {
    const actor = await seedActor("decision-concurrency");
    const database = drizzle(pool, { schema });
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    const { run } = await completeCheck(database, actor);
    const input = decisionInput();
    const [first, retry] = await Promise.all([
      createDecisionForActor(database, actor.userId, actor.projectId, run.id, input),
      createDecisionForActor(database, actor.userId, actor.projectId, run.id, input),
    ]);
    expect(first.decision.id).toBe(retry.decision.id);
    expect([first.created, retry.created].sort()).toEqual([false, true]);
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM decisions WHERE analysis_run_id=$1`,
          [run.id],
        )
      ).rows[0].count,
    ).toBe(1);

    const actor2 = await seedActor("decision-race");
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor2.projectId, actor2.userId],
    );
    const { run: run2 } = await completeCheck(database, actor2);
    const race = await Promise.allSettled([
      createDecisionForActor(
        database,
        actor2.userId,
        actor2.projectId,
        run2.id,
        decisionInput({ outcome: "approved" }),
      ),
      createDecisionForActor(
        database,
        actor2.userId,
        actor2.projectId,
        run2.id,
        decisionInput({ outcome: "rejected" }),
      ),
    ]);
    expect(race.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = race.find((result) => result.status === "rejected");
    expect(rejection?.status === "rejected" ? rejection.reason : null).toBeInstanceOf(
      DecisionConflictError,
    );

    const secondDecisionMaker = await addProjectMember(actor2);
    const { run: run3 } = await completeCheck(database, actor2);
    const crossActorRace = await Promise.allSettled([
      createDecisionForActor(
        database,
        actor2.userId,
        actor2.projectId,
        run3.id,
        decisionInput({ outcome: "approved" }),
      ),
      createDecisionForActor(
        database,
        secondDecisionMaker,
        actor2.projectId,
        run3.id,
        decisionInput({ outcome: "rejected" }),
      ),
    ]);
    expect(crossActorRace.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    const crossActorRejection = crossActorRace.find(
      (result) => result.status === "rejected",
    );
    expect(
      crossActorRejection?.status === "rejected" ? crossActorRejection.reason : null,
    ).toBeInstanceOf(DecisionConflictError);
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM decisions WHERE analysis_run_id=$1`,
          [run3.id],
        )
      ).rows[0].count,
    ).toBe(1);
  });

  it("preserves append-only supersession and reloads the durable change record", async () => {
    const actor = await seedActor("decision-supersession");
    const database = drizzle(pool, { schema });
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    const { run } = await completeCheck(database, actor, false);
    const first = await createDecisionForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      decisionInput({ outcome: "approved" }),
    );
    const replacement = await createDecisionForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      decisionInput({
        outcome: "rejected",
        rationale: "TEST ONLY revised decision",
        supersedesDecisionId: first.decision.id,
      }),
    );
    expect(replacement.decision.supersedesDecisionId).toBe(first.decision.id);
    const [reloaded] = await listAnalysesForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(reloaded?.decisions).toHaveLength(2);
    expect(reloaded?.decisions[0]).toMatchObject({
      id: first.decision.id,
      outcome: "approved",
      isCurrent: false,
    });
    expect(reloaded?.decisions[1]).toMatchObject({
      id: replacement.decision.id,
      outcome: "rejected",
      isCurrent: true,
      supersedesDecisionId: first.decision.id,
    });
    expect(reloaded?.reviewActions).toHaveLength(2);
    await expect(
      pool.query(`UPDATE decisions SET rationale='rewrite' WHERE id=$1`, [
        first.decision.id,
      ]),
    ).rejects.toThrow();
    await expect(
      createDecisionForActor(
        database,
        actor.userId,
        actor.projectId,
        run.id,
        decisionInput({ supersedesDecisionId: first.decision.id }),
      ),
    ).rejects.toBeInstanceOf(DecisionConflictError);
  });

  it("rolls back the decision, review, request status, and audit when persistence fails", async () => {
    const actor = await seedActor("decision-rollback");
    const database = drizzle(pool, { schema });
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    const { run } = await completeCheck(database, actor);
    await pool.query(`
      CREATE FUNCTION necra_test_fail_decision_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.event_type = 'decision.recorded' THEN
          RAISE EXCEPTION 'TEST ONLY forced audit failure';
        END IF;
        RETURN NEW;
      END $$
    `);
    await pool.query(`
      CREATE TRIGGER necra_test_fail_decision_audit
      BEFORE INSERT ON audit_events
      FOR EACH ROW EXECUTE FUNCTION necra_test_fail_decision_audit()
    `);
    try {
      await expect(
        createDecisionForActor(
          database,
          actor.userId,
          actor.projectId,
          run.id,
          decisionInput(),
        ),
      ).rejects.toBeInstanceOf(DecisionStorageError);
    } finally {
      await pool.query(`DROP TRIGGER necra_test_fail_decision_audit ON audit_events`);
      await pool.query(`DROP FUNCTION necra_test_fail_decision_audit()`);
    }
    const state = await pool.query(
      `SELECT cr.status,
              (SELECT count(*)::int FROM decisions d WHERE d.analysis_run_id=$1) AS decisions,
              (SELECT count(*)::int FROM review_actions ra WHERE ra.analysis_run_id=$1) AS reviews
       FROM change_requests cr JOIN analysis_runs ar ON ar.change_request_id=cr.id WHERE ar.id=$1`,
      [run.id],
    );
    expect(state.rows[0]).toMatchObject({
      status: "requested",
      decisions: 0,
      reviews: 0,
    });
  });
});

describe("T011 real PostgreSQL Decision Replay", () => {
  it("projects persisted records in deterministic order with evidence and audit links", async () => {
    const actor = await seedActor("replay-ledger");
    const database = drizzle(pool, { schema });
    await pool.query(
      `UPDATE project_memberships SET can_decide=true WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    const { run, evidence } = await completeCheck(database, actor);
    const first = await createDecisionForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      decisionInput({ outcome: "approved" }),
    );
    const replacement = await createDecisionForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      decisionInput({
        outcome: "rejected",
        supersedesDecisionId: first.decision.id,
      }),
    );

    const replay = await getDecisionReplayForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(replay.projectId).toBe(actor.projectId);
    expect(replay.events.map((event) => event.kind)).toEqual([
      "evidence_version",
      "evidence_version",
      "change_request",
      "analysis",
      "provider_result",
      "review",
      "decision",
      "review",
      "decision",
    ]);
    const eventTimes = replay.events.map((event) => event.occurredAt.getTime());
    expect(eventTimes).toEqual([...eventTimes].sort((left, right) => left - right));

    const agreementEvent = replay.events.find(
      (event) => event.kind === "evidence_version" && event.id === evidence.agreement.id,
    );
    expect(agreementEvent).toMatchObject({
      kind: "evidence_version",
      content: expect.stringContaining("Scope: design only."),
      contentHash: evidence.agreement.contentHash,
      origin: "human",
      audit: { relation: "direct" },
    });
    const providerEvent = replay.events.find((event) => event.kind === "provider_result");
    expect(providerEvent).toMatchObject({
      kind: "provider_result",
      analysisRunId: run.id,
      origin: "external",
      audit: { relation: "linked" },
      findings: [
        {
          claim: "Please add a dashboard.",
          evidence: {
            state: "verified",
            documentVersionId: evidence.agreement.id,
            quote: "Scope: design only.",
          },
        },
      ],
    });
    const requestEvent = replay.events.find((event) => event.kind === "change_request");
    expect(requestEvent).toMatchObject({
      id: run.changeRequestId,
      audit: null,
    });
    const decisionsInReplay = replay.events.filter((event) => event.kind === "decision");
    expect(decisionsInReplay).toEqual([
      expect.objectContaining({
        id: first.decision.id,
        isCurrent: false,
        supersedesDecisionId: null,
      }),
      expect.objectContaining({
        id: replacement.decision.id,
        isCurrent: true,
        supersedesDecisionId: first.decision.id,
      }),
    ]);
  });

  it("allows active readers but denies cross-project and inactive membership access", async () => {
    const actor = await seedActor("replay-authz");
    const outsider = await seedActor("replay-outsider");
    const database = drizzle(pool, { schema });
    await seedEvidence(database, actor);
    const viewerId = await addProjectMember(actor, {
      role: "participant",
      canDecide: false,
    });

    await expect(
      getDecisionReplayForActor(database, viewerId, actor.projectId),
    ).resolves.toMatchObject({ projectId: actor.projectId });
    await expect(
      getDecisionReplayForActor(database, outsider.userId, actor.projectId),
    ).rejects.toBeInstanceOf(ReplayNotFoundError);
    await pool.query(
      `UPDATE project_memberships SET status='suspended' WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, viewerId],
    );
    await expect(
      getDecisionReplayForActor(database, viewerId, actor.projectId),
    ).rejects.toBeInstanceOf(ReplayNotFoundError);
  });

  it("keeps replay inputs append-only instead of accepting historical rewrites", async () => {
    const actor = await seedActor("replay-tamper");
    const database = drizzle(pool, { schema });
    const { run } = await completeCheck(database, actor);
    const audit = await pool.query<{ id: string }>(
      `SELECT id FROM audit_events WHERE project_id=$1 AND target_id=$2
       AND event_type='analysis.provider_result_validated'`,
      [actor.projectId, run.id],
    );
    const auditId = audit.rows[0]?.id;
    if (!auditId) throw new Error("Test provider audit event was not created");
    await expect(
      pool.query(`UPDATE audit_events SET event_type='rewritten' WHERE id=$1`, [auditId]),
    ).rejects.toThrow();
    await expect(
      pool.query(`DELETE FROM audit_events WHERE id=$1`, [auditId]),
    ).rejects.toThrow();
    const replay = await getDecisionReplayForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(
      replay.events.find((event) => event.kind === "provider_result")?.audit?.id,
    ).toBe(auditId);
  });
});
afterAll(async () => {
  if (pool) await pool.end();
  if (databaseCreated) await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe("T007/T008 real PostgreSQL Reality Check lifecycle", () => {
  it("creates a pending durable snapshot and retrieves it after a fresh query", async () => {
    const actor = await seedActor("create");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const created = await createAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
      },
    );
    expect(created).toMatchObject({
      status: "pending",
      agreementVersionId: evidence.agreement.id,
      agreementContentHash: evidence.agreement.contentHash,
      instructionVersionId: evidence.instruction.id,
      instructionContentHash: evidence.instruction.contentHash,
      createdByUserId: actor.userId,
      lifecycleRevision: 0,
    });
    expect(await listAnalysesForActor(database, actor.userId, actor.projectId)).toEqual([
      created,
    ]);
    const stored = await pool.query(
      `SELECT provider_idempotency_key, provider_request_hash, provider, completed_at FROM analysis_runs WHERE id = $1`,
      [created.id],
    );
    expect(stored.rows[0]).toMatchObject({ provider: null, completed_at: null });
    expect(stored.rows[0].provider_idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored.rows[0].provider_request_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deduplicates sequential and concurrent retries but rejects conflicting key reuse", async () => {
    const actor = await seedActor("retry");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const key = randomUUID();
    const input = {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: key,
    };
    const [first, second] = await Promise.all([
      createAnalysisForActor(database, actor.userId, actor.projectId, input),
      createAnalysisForActor(database, actor.userId, actor.projectId, input),
    ]);
    expect(second.id).toBe(first.id);
    const otherInstruction = await createEvidenceSourceForActor(
      database,
      actor.userId,
      actor.projectId,
      {
        format: "pasted_text",
        kind: "instruction",
        title: "Other",
        content: "A different request",
        idempotencyKey: randomUUID(),
      },
    );
    const otherInstructionVersion = otherInstruction.versions[0];
    if (!otherInstructionVersion) throw new Error("Test instruction was not created");
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        ...input,
        instructionVersionId: otherInstructionVersion.id,
      }),
    ).rejects.toBeInstanceOf(AnalysisConflictError);
  });

  it("rejects missing, cross-project, wrong-kind, identical, and unsupported inputs", async () => {
    const actor = await seedActor("validation");
    const other = await seedActor("other");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const otherEvidence = await seedEvidence(database, other);
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: randomUUID(),
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: otherEvidence.instruction.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: evidence.instruction.id,
        instructionVersionId: evidence.agreement.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.agreement.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(AnalysisValidationError);
    await expect(
      createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
        threshold: 0.2,
      }),
    ).rejects.toBeInstanceOf(AnalysisValidationError);
  });

  it("rejects unauthorized, inactive, and read-only actors without leaking records", async () => {
    const actor = await seedActor("owner");
    const outsider = await seedActor("outsider");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const input = {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    };
    await expect(
      createAnalysisForActor(database, outsider.userId, actor.projectId, input),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    const viewerId = randomUUID();
    await pool.query(`INSERT INTO users (id) VALUES ($1)`, [viewerId]);
    await pool.query(
      `INSERT INTO auth_accounts (id, account_id, provider_id, user_id) VALUES ($1,$2,'credential',$3)`,
      [randomUUID(), viewerId, viewerId],
    );
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id,user_id,role) VALUES ($1,$2,'member')`,
      [actor.workspaceId, viewerId],
    );
    await pool.query(
      `INSERT INTO project_memberships (project_id,workspace_id,user_id,role,can_decide) VALUES ($1,$2,$3,'participant',false)`,
      [actor.projectId, actor.workspaceId, viewerId],
    );
    await expect(
      createAnalysisForActor(database, viewerId, actor.projectId, input),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    const created = await createAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      input,
    );
    expect((await listAnalysesForActor(database, viewerId, actor.projectId))[0]?.id).toBe(
      created.id,
    );
    await pool.query(
      `UPDATE project_memberships SET status='suspended' WHERE project_id=$1 AND user_id=$2`,
      [actor.projectId, actor.userId],
    );
    await expect(
      listAnalysesForActor(database, actor.userId, actor.projectId),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
  });

  it("enforces immutable snapshots, validated completion, legal transitions, and stale-worker revisions", async () => {
    const actor = await seedActor("state");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    await expect(
      pool.query(`UPDATE analysis_runs SET agreement_content_hash=$1 WHERE id=$2`, [
        "0".repeat(64),
        run.id,
      ]),
    ).rejects.toThrow();
    await expect(
      pool.query(
        `UPDATE analysis_runs SET status='completed', lifecycle_revision=1 WHERE id=$1`,
        [run.id],
      ),
    ).rejects.toThrow();
    await transitionAnalysisForWorker(database, run.id, 0, { type: "start" });
    await expect(
      transitionAnalysisForWorker(database, run.id, 0, {
        type: "fail",
        code: "provider_unavailable",
      }),
    ).rejects.toBeInstanceOf(AnalysisStaleTransitionError);
    await transitionAnalysisForWorker(database, run.id, 1, {
      type: "outcome_unknown",
    });
    await transitionAnalysisForWorker(database, run.id, 2, { type: "start" });
    await transitionAnalysisForWorker(database, run.id, 3, {
      type: "fail",
      code: "provider_unavailable",
    });
    const retried = await transitionAnalysisForWorker(database, run.id, 4, {
      type: "retry",
    });
    expect(retried.attemptNumber).toBe(2);
    const state = await pool.query(
      `SELECT status, completed_at, reconciliation_required_at FROM analysis_runs WHERE id=$1`,
      [run.id],
    );
    expect(state.rows[0].status).toBe("pending");
    expect(state.rows[0].completed_at).toBeNull();
    expect(state.rows[0].reconciliation_required_at).not.toBeNull();
  });

  it("persists one validated provider result and exact evidence without creating a decision", async () => {
    const actor = await seedActor("provider-success");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    let sentIdempotencyKey: string | null = null;
    const result = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async (_url, init) => {
          sentIdempotencyKey = new Headers(init?.headers).get("idempotency-key");
          return new Response(JSON.stringify(clockedResponse(evidence.agreement.id)), {
            status: 200,
            headers: { "X-Clocked-Credits": "7" },
          });
        },
      },
    );
    expect(result).toEqual({ status: "completed", claimCount: 1 });
    const stored = await pool.query(
      `SELECT ar.status, ar.provider_idempotency_key, apr.transport_metadata,
              pcr.verdict, pcr.evidence_quote, pcr.evidence_start_offset,
              pcr.evidence_end_offset
       FROM analysis_runs ar
       JOIN analysis_provider_results apr ON apr.analysis_run_id = ar.id
       JOIN provider_claim_results pcr ON pcr.analysis_run_id = ar.id
       WHERE ar.id = $1`,
      [run.id],
    );
    expect(stored.rows[0]).toMatchObject({
      status: "completed",
      verdict: "not_stated",
      evidence_quote: "Scope: design only.",
      evidence_start_offset: 0,
      evidence_end_offset: 19,
      transport_metadata: { credits: 7 },
    });
    expect(sentIdempotencyKey).toBe(stored.rows[0].provider_idempotency_key);
    const [persistedRead] = await listAnalysesForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(persistedRead?.providerOrigin).toMatchObject({
      provider: "clocked",
      model: "clocked-test-model",
    });
    expect(persistedRead?.agreementSource).toMatchObject({
      documentId: evidence.agreement.documentId,
      versionId: evidence.agreement.id,
      versionNumber: 1,
      contentHash: evidence.agreement.contentHash,
      content: evidence.agreement.content,
    });
    expect(persistedRead?.instructionSource).toMatchObject({
      documentId: evidence.instruction.documentId,
      versionId: evidence.instruction.id,
      content: evidence.instruction.content,
    });
    expect(persistedRead?.findings[0]).toMatchObject({
      claim: "Please add a dashboard.",
      verdict: "not_stated",
      category: "missing_evidence",
      reviewState: "unresolved",
      evidence: {
        state: "verified",
        documentId: evidence.agreement.documentId,
        documentVersionId: evidence.agreement.id,
        quote: "Scope: design only.",
        startOffset: 0,
        endOffset: 19,
      },
    });
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM decisions WHERE project_id=$1`,
          [actor.projectId],
        )
      ).rows[0].count,
    ).toBe(0);
    await expect(
      processAnalysisForActor(database, actor.userId, actor.projectId, run.id, {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async () => {
          throw new Error("must not be called");
        },
      }),
    ).rejects.toMatchObject({
      reason: "already_completed",
    });
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM analysis_provider_results WHERE analysis_run_id=$1`,
          [run.id],
        )
      ).rows[0].count,
    ).toBe(1);
  });

  it("enforces a persisted workspace Clocked attempt budget before calling the provider", async () => {
    const actor = await seedActor("provider-budget");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const firstRun = await createAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
      },
    );
    await processAnalysisForActor(database, actor.userId, actor.projectId, firstRun.id, {
      apiKey: "TEST_ONLY_CLOCKED_KEY",
      baseUrl: "https://clocked.rezolve.ai/clocked",
      maxAttemptsPerWorkspace24h: 1,
      fetchImplementation: async () =>
        new Response(JSON.stringify(clockedResponse(evidence.agreement.id)), {
          status: 200,
        }),
    });
    const secondRun = await createAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
      },
    );
    let providerCalled = false;
    await expect(
      processAnalysisForActor(database, actor.userId, actor.projectId, secondRun.id, {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        maxAttemptsPerWorkspace24h: 1,
        fetchImplementation: async () => {
          providerCalled = true;
          return new Response("{}", { status: 200 });
        },
      }),
    ).rejects.toMatchObject({ reason: "workspace_attempt_budget" });
    expect(providerCalled).toBe(false);
    const state = await pool.query(`SELECT status FROM analysis_runs WHERE id=$1`, [
      secondRun.id,
    ]);
    expect(state.rows[0].status).toBe("pending");
  });

  it("enforces a deployment-wide Clocked budget across separate workspaces", async () => {
    const existingUsage = await pool.query(
      `SELECT coalesce(sum(attempt_number), 0)::int AS attempts
       FROM analysis_runs
       WHERE last_attempt_at > now() - interval '24 hours'`,
    );
    const globalCeiling = existingUsage.rows[0].attempts + 1;
    const database = drizzle(pool, { schema });
    const firstActor = await seedActor("provider-global-budget-first");
    const firstEvidence = await seedEvidence(database, firstActor);
    const firstRun = await createAnalysisForActor(
      database,
      firstActor.userId,
      firstActor.projectId,
      {
        agreementVersionId: firstEvidence.agreement.id,
        instructionVersionId: firstEvidence.instruction.id,
        idempotencyKey: randomUUID(),
      },
    );
    await processAnalysisForActor(
      database,
      firstActor.userId,
      firstActor.projectId,
      firstRun.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        maxAttemptsGlobal24h: globalCeiling,
        fetchImplementation: async () =>
          new Response(JSON.stringify(clockedResponse(firstEvidence.agreement.id)), {
            status: 200,
          }),
      },
    );

    const secondActor = await seedActor("provider-global-budget-second");
    const secondEvidence = await seedEvidence(database, secondActor);
    const secondRun = await createAnalysisForActor(
      database,
      secondActor.userId,
      secondActor.projectId,
      {
        agreementVersionId: secondEvidence.agreement.id,
        instructionVersionId: secondEvidence.instruction.id,
        idempotencyKey: randomUUID(),
      },
    );
    let providerCalled = false;
    await expect(
      processAnalysisForActor(
        database,
        secondActor.userId,
        secondActor.projectId,
        secondRun.id,
        {
          apiKey: "TEST_ONLY_CLOCKED_KEY",
          baseUrl: "https://clocked.rezolve.ai/clocked",
          maxAttemptsGlobal24h: globalCeiling,
          fetchImplementation: async () => {
            providerCalled = true;
            return new Response("{}", { status: 200 });
          },
        },
      ),
    ).rejects.toMatchObject({ reason: "global_attempt_budget" });
    expect(providerCalled).toBe(false);
  });

  it("counts a retry as a new Clocked attempt before transport", async () => {
    const existingUsage = await pool.query(
      `SELECT coalesce(sum(attempt_number), 0)::int AS attempts
       FROM analysis_runs
       WHERE last_attempt_at > now() - interval '24 hours'`,
    );
    const globalCeiling = existingUsage.rows[0].attempts + 1;
    const actor = await seedActor("provider-retry-budget");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    await processAnalysisForActor(database, actor.userId, actor.projectId, run.id, {
      apiKey: "TEST_ONLY_CLOCKED_KEY",
      baseUrl: "https://clocked.rezolve.ai/clocked",
      maxAttemptsGlobal24h: globalCeiling,
      fetchImplementation: async () => new Response("unavailable", { status: 503 }),
    });
    await pool.query(
      `UPDATE analysis_runs SET last_attempt_at = now() - interval '2 seconds' WHERE id=$1`,
      [run.id],
    );
    let providerCalled = false;
    await expect(
      processAnalysisForActor(database, actor.userId, actor.projectId, run.id, {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        maxAttemptsGlobal24h: globalCeiling,
        fetchImplementation: async () => {
          providerCalled = true;
          return new Response("{}", { status: 200 });
        },
      }),
    ).rejects.toMatchObject({ reason: "global_attempt_budget" });
    expect(providerCalled).toBe(false);
  });

  it("presents a completed zero-reference claim without inventing a citation", async () => {
    const actor = await seedActor("provider-no-evidence");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    const result = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async () =>
          new Response(JSON.stringify(clockedResponse(evidence.agreement.id, false)), {
            status: 200,
          }),
      },
    );
    expect(result).toEqual({ status: "completed", claimCount: 1 });

    const [persistedRead] = await listAnalysesForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(persistedRead?.findings[0]).toMatchObject({
      claim: "Please add a dashboard.",
      verdict: "not_stated",
      category: "missing_evidence",
      reviewState: "unresolved",
      evidence: { state: "unavailable" },
    });
    expect(persistedRead?.findings[0]?.evidence).not.toHaveProperty("quote");
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM decisions WHERE project_id=$1`,
          [actor.projectId],
        )
      ).rows[0].count,
    ).toBe(0);
  });

  it("preserves the provider request identity through an unknown outcome and retry", async () => {
    const actor = await seedActor("provider-unknown");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    const keys: string[] = [];
    const first = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async (_url, init) => {
          keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
          throw new TypeError("TEST ONLY network interruption");
        },
      },
    );
    expect(first.status).toBe("reconciliation_required");
    const second = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async (_url, init) => {
          keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
          return new Response(JSON.stringify(clockedResponse(evidence.agreement.id)), {
            status: 200,
          });
        },
      },
    );
    expect(second.status).toBe("completed");
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    const state = await pool.query(
      `SELECT status, attempt_number, reconciliation_required_at FROM analysis_runs WHERE id=$1`,
      [run.id],
    );
    expect(state.rows[0]).toMatchObject({ status: "completed", attempt_number: 1 });
    expect(state.rows[0].reconciliation_required_at).not.toBeNull();
  });

  it("rejects unauthorized processing and malformed provider success without partial results", async () => {
    const actor = await seedActor("provider-invalid");
    const outsider = await seedActor("provider-outsider");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    let called = false;
    await expect(
      processAnalysisForActor(database, outsider.userId, actor.projectId, run.id, {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async () => {
          called = true;
          return new Response("{}", { status: 200 });
        },
      }),
    ).rejects.toBeInstanceOf(AnalysisNotFoundError);
    expect(called).toBe(false);
    const result = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async () => new Response("{}", { status: 200 }),
      },
    );
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "invalid_provider_response",
    });
    expect(
      (
        await pool.query(
          `SELECT count(*)::int AS count FROM analysis_provider_results WHERE analysis_run_id=$1`,
          [run.id],
        )
      ).rows[0].count,
    ).toBe(0);
  });

  it("recovers a stale running claim through reconciliation with the same provider key", async () => {
    const actor = await seedActor("provider-stale");
    const database = drizzle(pool, { schema });
    const evidence = await seedEvidence(database, actor);
    const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
      agreementVersionId: evidence.agreement.id,
      instructionVersionId: evidence.instruction.id,
      idempotencyKey: randomUUID(),
    });
    await transitionAnalysisForWorker(database, run.id, 0, { type: "start" });
    await pool.query(
      `UPDATE analysis_runs SET last_attempt_at = now() - interval '10 minutes' WHERE id=$1`,
      [run.id],
    );
    const original = await pool.query(
      `SELECT provider_idempotency_key FROM analysis_runs WHERE id=$1`,
      [run.id],
    );
    let observedKey: string | null = null;
    const result = await processAnalysisForActor(
      database,
      actor.userId,
      actor.projectId,
      run.id,
      {
        apiKey: "TEST_ONLY_CLOCKED_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        fetchImplementation: async (_url, init) => {
          observedKey = new Headers(init?.headers).get("idempotency-key");
          return new Response(JSON.stringify(clockedResponse(evidence.agreement.id)), {
            status: 200,
          });
        },
      },
    );
    expect(result.status).toBe("completed");
    expect(observedKey).toBe(original.rows[0].provider_idempotency_key);
    const state = await pool.query(
      `SELECT status, attempt_number, reconciliation_required_at FROM analysis_runs WHERE id=$1`,
      [run.id],
    );
    expect(state.rows[0]).toMatchObject({ status: "completed", attempt_number: 1 });
    expect(state.rows[0].reconciliation_required_at).not.toBeNull();
  });

  it.skipIf(process.env.CLOCKED_LIVE_TEST !== "true" || !process.env.CLOCKED_API_KEY)(
    "[LIVE CLOCKED] processes persisted evidence with Grounding and accepts Compare",
    async () => {
      const apiKey = process.env.CLOCKED_API_KEY;
      if (!apiKey) throw new Error("CLOCKED_API_KEY is required for the live test");
      const actor = await seedActor("clocked-live");
      const database = drizzle(pool, { schema });
      const evidence = await seedEvidence(database, actor);
      const run = await createAnalysisForActor(database, actor.userId, actor.projectId, {
        agreementVersionId: evidence.agreement.id,
        instructionVersionId: evidence.instruction.id,
        idempotencyKey: randomUUID(),
      });
      const grounding = await processAnalysisForActor(
        database,
        actor.userId,
        actor.projectId,
        run.id,
        {
          apiKey,
          baseUrl: "https://clocked.rezolve.ai/clocked",
        },
      );
      if (grounding.status !== "completed") {
        throw new Error(
          `Live Clocked Grounding failed with ${grounding.failureCode ?? grounding.status}`,
        );
      }
      const persisted = await pool.query(
        `SELECT ar.status,
                (SELECT count(*)::int FROM change_requests cr WHERE cr.id=ar.change_request_id) AS change_requests,
                (SELECT count(*)::int FROM analysis_provider_results apr WHERE apr.analysis_run_id=ar.id) AS provider_results,
                (SELECT count(*)::int FROM provider_claim_results pcr WHERE pcr.analysis_run_id=ar.id) AS provider_claims,
                (SELECT count(*)::int FROM decisions d WHERE d.project_id=ar.project_id) AS decisions,
                apr.model, apr.response_hash, apr.transport_metadata
         FROM analysis_runs ar
         JOIN analysis_provider_results apr ON apr.analysis_run_id=ar.id
         WHERE ar.id=$1`,
        [run.id],
      );
      expect(persisted.rows[0]).toMatchObject({
        status: "completed",
        change_requests: 1,
        provider_results: 1,
        provider_claims: grounding.claimCount,
        decisions: 0,
      });
      const liveClaims = await pool.query(
        `SELECT evidence_document_version_id, evidence_quote,
                evidence_start_offset, evidence_end_offset
         FROM provider_claim_results
         WHERE analysis_run_id=$1
         ORDER BY claim_index`,
        [run.id],
      );
      let evidenceReferenceCount = 0;
      for (const claim of liveClaims.rows) {
        if (claim.evidence_quote === null) {
          expect(claim).toMatchObject({
            evidence_document_version_id: null,
            evidence_start_offset: null,
            evidence_end_offset: null,
          });
          continue;
        }
        evidenceReferenceCount += 1;
        expect(claim.evidence_document_version_id).toBe(evidence.agreement.id);
        expect(
          evidence.agreement.content.slice(
            claim.evidence_start_offset,
            claim.evidence_end_offset,
          ),
        ).toBe(claim.evidence_quote);
      }

      const compare = await requestClockedCompare({
        apiKey,
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: randomUUID(),
        request: {
          documents: [
            { id: "agreement", text: evidence.agreement.content },
            { id: "instruction", text: evidence.instruction.content },
          ],
          evidence: "all",
        },
      });
      expect(compare.result.model.length).toBeGreaterThan(0);
      expect(compare.responseHash).toMatch(/^[0-9a-f]{64}$/);
      console.info(
        "LIVE_CLOCKED_RESULT",
        JSON.stringify({
          analysisId: run.id,
          grounding: {
            status: grounding.status,
            model: persisted.rows[0].model,
            responseHash: persisted.rows[0].response_hash,
            claimCount: grounding.claimCount,
            evidenceReferenceCount,
            transportMetadata: persisted.rows[0].transport_metadata,
          },
          compare: {
            model: compare.result.model,
            responseHash: compare.responseHash,
            transportMetadata: compare.transportMetadata,
          },
        }),
      );
    },
    180_000,
  );
});
