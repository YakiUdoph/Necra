import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "../../src/server/db/schema";
import {
  createEvidenceSourceForActor,
  createEvidenceVersionForActor,
  EvidenceConflictError,
  EvidenceNotFoundError,
  EvidenceStorageError,
  listEvidenceSourcesForActor,
} from "../../src/server/evidence/evidence-service";
import {
  EvidenceValidationError,
  hashEvidenceContent,
} from "../../src/server/evidence/validation";

const adminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminDatabaseUrl) {
  throw new Error("TEST_DATABASE_ADMIN_URL is required for disposable database tests.");
}

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
    .filter(Boolean)) {
    await client.query(statement);
  }
}

async function seedActor(label: string) {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  await pool.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
    userId,
    `${label}-${userId}@example.test`,
  ]);
  await pool.query(
    `INSERT INTO auth_accounts (id, account_id, provider_id, user_id)
     VALUES ($1, $2, 'credential', $3)`,
    [randomUUID(), `${label}-${userId}`, userId],
  );
  await pool.query(`INSERT INTO workspaces (id, name) VALUES ($1, $2)`, [
    workspaceId,
    `TEST ONLY ${label} workspace`,
  ]);
  await pool.query(
    `INSERT INTO workspace_memberships (workspace_id, user_id, role)
     VALUES ($1, $2, 'administrator')`,
    [workspaceId, userId],
  );
  await pool.query(
    `INSERT INTO projects (id, workspace_id, name, created_by_user_id)
     VALUES ($1, $2, $3, $4)`,
    [projectId, workspaceId, `TEST ONLY ${label} project`, userId],
  );
  await pool.query(
    `INSERT INTO project_memberships
       (project_id, workspace_id, user_id, role, can_decide)
     VALUES ($1, $2, $3, 'manager', false)`,
    [projectId, workspaceId, userId],
  );
  return { userId, workspaceId, projectId };
}

beforeAll(async () => {
  if (!/^necra_test_[0-9a-f]{32}$/.test(databaseName)) {
    throw new Error("Unsafe disposable database name");
  }
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  pool = new Pool({ connectionString: databaseUrl.toString(), max: 12 });
  const client = await pool.connect();
  try {
    await applyMigration(client, "0000_lovely_marvel_apes.sql");
    await applyMigration(client, "0001_omniscient_black_widow.sql");
    await applyMigration(client, "0002_dapper_masked_marvel.sql");
  } finally {
    client.release();
  }
});

afterAll(async () => {
  if (pool) await pool.end();
  if (databaseCreated && /^necra_test_[0-9a-f]{32}$/.test(databaseName)) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  }
  await adminPool.end();
});

describe("T005 real PostgreSQL evidence ingestion", () => {
  it("creates and retrieves agreements and later instructions with trusted hashes", async () => {
    const actor = await seedActor("create");
    const database = drizzle(pool, { schema });
    const agreementText = "Scope: research, design, and build.\nFee: €4,000.";
    const agreement = await createEvidenceSourceForActor(
      database,
      actor.userId,
      actor.projectId,
      {
        format: "pasted_text",
        kind: "agreement",
        title: "Signed statement of work",
        sourceAttribution: "Client email",
        sourceObservedAt: "2026-11-03T09:30:00-01:00",
        content: agreementText,
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
        title: "Add a reporting dashboard",
        content: "Please add a reporting dashboard to the delivery.",
        idempotencyKey: randomUUID(),
      },
    );

    expect(agreement.versions[0]).toMatchObject({
      versionNumber: 1,
      content: agreementText,
      contentHash: hashEvidenceContent(agreementText),
      byteSize: Buffer.byteLength(agreementText, "utf8"),
      createdByUserId: actor.userId,
    });
    expect(instruction.kind).toBe("instruction");
    expect(
      await listEvidenceSourcesForActor(database, actor.userId, actor.projectId),
    ).toEqual([agreement, instruction]);

    const persisted = await pool.query<{
      capture_method: string;
      media_type: string;
      processing_status: string;
      storage_object_key: string | null;
    }>(
      `SELECT capture_method, media_type, processing_status, storage_object_key
       FROM document_versions WHERE id = $1`,
      [agreement.versions[0]?.id],
    );
    expect(persisted.rows[0]).toEqual({
      capture_method: "pasted_text",
      media_type: "text/plain",
      processing_status: "ready",
      storage_object_key: null,
    });
  });

  it("deduplicates retries, rejects changed duplicate requests, and serializes revisions", async () => {
    const actor = await seedActor("versions");
    const database = drizzle(pool, { schema });
    const retryKey = randomUUID();
    const input = {
      format: "pasted_text" as const,
      kind: "agreement" as const,
      title: "Master agreement",
      content: "Original exact text",
      idempotencyKey: retryKey,
    };
    const original = await createEvidenceSourceForActor(
      database,
      actor.userId,
      actor.projectId,
      input,
    );
    const retry = await createEvidenceSourceForActor(
      database,
      actor.userId,
      actor.projectId,
      input,
    );
    expect(retry.id).toBe(original.id);
    await expect(
      createEvidenceSourceForActor(database, actor.userId, actor.projectId, {
        ...input,
        content: "Different text",
      }),
    ).rejects.toBeInstanceOf(EvidenceConflictError);

    await Promise.all([
      createEvidenceVersionForActor(
        database,
        actor.userId,
        actor.projectId,
        original.id,
        {
          format: "pasted_text",
          content: "Revision A",
          idempotencyKey: randomUUID(),
        },
      ),
      createEvidenceVersionForActor(
        database,
        actor.userId,
        actor.projectId,
        original.id,
        {
          format: "pasted_text",
          content: "Revision B",
          idempotencyKey: randomUUID(),
        },
      ),
    ]);
    const [reloaded] = await listEvidenceSourcesForActor(
      database,
      actor.userId,
      actor.projectId,
    );
    expect(reloaded?.versions.map((version) => version.versionNumber)).toEqual([1, 2, 3]);
    expect(reloaded?.versions[0]?.content).toBe("Original exact text");

    await expect(
      pool.query(`UPDATE document_versions SET content_text = 'rewrite' WHERE id = $1`, [
        original.versions[0]?.id,
      ]),
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      pool.query(`UPDATE source_documents SET title = 'rewritten' WHERE id = $1`, [
        original.id,
      ]),
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("denies cross-project access, viewers, and revoked memberships without disclosure", async () => {
    const owner = await seedActor("owner");
    const outsider = await seedActor("outsider");
    const database = drizzle(pool, { schema });
    const source = await createEvidenceSourceForActor(
      database,
      owner.userId,
      owner.projectId,
      {
        format: "pasted_text",
        kind: "agreement",
        title: "Private agreement",
        content: "Confidential exact text",
        idempotencyKey: randomUUID(),
      },
    );
    await expect(
      listEvidenceSourcesForActor(database, outsider.userId, owner.projectId),
    ).rejects.toBeInstanceOf(EvidenceNotFoundError);

    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [owner.workspaceId, outsider.userId],
    );
    await pool.query(
      `INSERT INTO project_memberships (project_id, workspace_id, user_id, role)
       VALUES ($1, $2, $3, 'participant')`,
      [owner.projectId, owner.workspaceId, outsider.userId],
    );
    await expect(
      createEvidenceVersionForActor(
        database,
        outsider.userId,
        owner.projectId,
        source.id,
        {
          format: "pasted_text",
          content: "Unauthorized rewrite",
          idempotencyKey: randomUUID(),
        },
      ),
    ).rejects.toBeInstanceOf(EvidenceNotFoundError);

    await pool.query(
      `UPDATE project_memberships SET status = 'suspended'
       WHERE project_id = $1 AND user_id = $2`,
      [owner.projectId, owner.userId],
    );
    await expect(
      listEvidenceSourcesForActor(database, owner.userId, owner.projectId),
    ).rejects.toBeInstanceOf(EvidenceNotFoundError);
  });

  it("rejects invalid input before persistence", async () => {
    const actor = await seedActor("invalid");
    const database = drizzle(pool, { schema });

    await expect(
      createEvidenceSourceForActor(database, actor.userId, actor.projectId, {
        format: "pasted_text",
        kind: "agreement",
        title: "Invalid empty agreement",
        content: "   \n",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(EvidenceValidationError);

    const persisted = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM source_documents
       WHERE project_id = $1`,
      [actor.projectId],
    );
    expect(persisted.rows[0]?.count).toBe("0");
  });

  it("returns a safe storage error when PostgreSQL is unavailable", async () => {
    const actor = await seedActor("failure");
    const deadPool = new Pool({ connectionString: databaseUrl.toString(), max: 1 });
    await deadPool.end();
    const unavailableDatabase = drizzle(deadPool, { schema });
    await expect(
      createEvidenceSourceForActor(unavailableDatabase, actor.userId, actor.projectId, {
        format: "pasted_text",
        kind: "agreement",
        title: "Will not persist",
        content: "No success may be reported.",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(EvidenceStorageError);
  });
});
