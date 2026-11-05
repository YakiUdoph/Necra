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
import * as schema from "../../src/server/db/schema";
import { createEvidenceSourceForActor } from "../../src/server/evidence/evidence-service";

const adminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminDatabaseUrl) throw new Error("TEST_DATABASE_ADMIN_URL is required.");
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
  return { agreement: agreementVersion, instruction: instructionVersion };
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
    ])
      await applyMigration(client, file);
  } finally {
    client.release();
  }
});
afterAll(async () => {
  if (pool) await pool.end();
  if (databaseCreated)
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminPool.end();
});

describe("T007 real PostgreSQL Reality Check creation", () => {
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
});
