import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getSafeTestDatabaseAdminUrl } from "../helpers/test-database";

const adminDatabaseUrl = getSafeTestDatabaseAdminUrl();

const databaseName = `necra_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = new Pool({ connectionString: adminDatabaseUrl, max: 1 });
const databaseUrl = new URL(adminDatabaseUrl);
databaseUrl.pathname = `/${databaseName}`;

let pool: Pool;
let databaseCreated = false;

async function applyMigration(client: PoolClient) {
  const migration = await readFile(
    resolve("migrations/0000_lovely_marvel_apes.sql"),
    "utf8",
  );
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  await client.query("BEGIN");
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function seedProject(client: PoolClient, label: string) {
  const userId = randomUUID();
  const identityId = randomUUID();
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const agreementDocumentId = randomUUID();
  const agreementVersionId = randomUUID();
  const instructionDocumentId = randomUUID();
  const instructionVersionId = randomUUID();
  const changeRequestId = randomUUID();
  const analysisRunId = randomUUID();
  const findingId = randomUUID();

  await client.query(`INSERT INTO users (id) VALUES ($1)`, [userId]);
  await client.query(
    `INSERT INTO authenticated_identities (id, user_id, provider, provider_subject)
     VALUES ($1, $2, 'test-provider', $3)`,
    [identityId, userId, `${label}-${userId}`],
  );
  await client.query(`INSERT INTO workspaces (id, name) VALUES ($1, $2)`, [
    workspaceId,
    `${label} workspace`,
  ]);
  await client.query(
    `INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES ($1, $2, 'administrator')`,
    [workspaceId, userId],
  );
  await client.query(
    `INSERT INTO projects (id, workspace_id, name, created_by_user_id) VALUES ($1, $2, $3, $4)`,
    [projectId, workspaceId, `${label} project`, userId],
  );
  await client.query(
    `INSERT INTO project_memberships (project_id, workspace_id, user_id, role, can_decide)
     VALUES ($1, $2, $3, 'manager', true)`,
    [projectId, workspaceId, userId],
  );
  await client.query(
    `INSERT INTO source_documents
       (id, project_id, workspace_id, kind, title, created_by_user_id)
     VALUES ($1, $2, $3, 'agreement', $4, $5), ($6, $2, $3, 'instruction', $7, $5)`,
    [
      agreementDocumentId,
      projectId,
      workspaceId,
      `${label} agreement`,
      userId,
      instructionDocumentId,
      `${label} instructions`,
    ],
  );
  await client.query(
    `INSERT INTO document_versions
       (id, source_document_id, project_id, workspace_id, version_number, content_hash, media_type,
        byte_size, processing_status, created_by_user_id)
     VALUES
       ($1, $2, $3, $4, 1, $5, 'text/plain', 10, 'ready', $6),
       ($7, $8, $3, $4, 1, $9, 'text/plain', 12, 'ready', $6)`,
    [
      agreementVersionId,
      agreementDocumentId,
      projectId,
      workspaceId,
      "a".repeat(64),
      userId,
      instructionVersionId,
      instructionDocumentId,
      "b".repeat(64),
    ],
  );
  await client.query(
    `INSERT INTO change_requests
       (id, project_id, workspace_id, instruction_version_id, title, idempotency_key, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      changeRequestId,
      projectId,
      workspaceId,
      instructionVersionId,
      `${label} request`,
      `${label}-request`,
      userId,
    ],
  );
  await client.query(
    `INSERT INTO analysis_runs
       (id, project_id, workspace_id, change_request_id, agreement_version_id,
        instruction_version_id, idempotency_key, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      analysisRunId,
      projectId,
      workspaceId,
      changeRequestId,
      agreementVersionId,
      instructionVersionId,
      `${label}-analysis`,
      userId,
    ],
  );
  await client.query(
    `INSERT INTO findings (id, analysis_run_id, project_id, workspace_id, category, explanation)
     VALUES ($1, $2, $3, $4, 'potential_change', 'Test-only finding')`,
    [findingId, analysisRunId, projectId, workspaceId],
  );

  return {
    userId,
    identityId,
    workspaceId,
    projectId,
    agreementDocumentId,
    agreementVersionId,
    instructionDocumentId,
    instructionVersionId,
    changeRequestId,
    analysisRunId,
    findingId,
  };
}

async function expectDatabaseError(
  action: Promise<unknown>,
  expectedCode: string | string[],
) {
  try {
    await action;
    throw new Error("Expected PostgreSQL to reject the operation");
  } catch (error) {
    const code = (error as { code?: string }).code;
    expect(Array.isArray(expectedCode) ? expectedCode : [expectedCode]).toContain(code);
  }
}

beforeAll(async () => {
  if (!/^necra_test_[0-9a-f]{32}$/.test(databaseName)) {
    throw new Error("Refusing to create a database without the disposable test prefix");
  }
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  pool = new Pool({ connectionString: databaseUrl.toString(), max: 4 });
  const client = await pool.connect();
  try {
    await applyMigration(client);
  } finally {
    client.release();
  }
});

afterAll(async () => {
  if (pool) {
    const rollback = await readFile(
      resolve("migrations/rollback/0000_lovely_marvel_apes.down.sql"),
      "utf8",
    );
    await pool.query(rollback);
    const remaining = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    expect(remaining.rows[0]?.count).toBe("0");
    await pool.end();
  }
  if (databaseCreated && /^necra_test_[0-9a-f]{32}$/.test(databaseName)) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  }
  await adminPool.end();
});

describe("T002 PostgreSQL schema", () => {
  it("applies the migration to an empty disposable database", async () => {
    const result = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'decisions'`,
    );
    expect(result.rows).toEqual([{ table_name: "decisions" }]);
  });

  it("rejects invalid foreign keys and duplicate memberships", async () => {
    const client = await pool.connect();
    try {
      const first = await seedProject(client, `fk-${randomUUID()}`);
      await expectDatabaseError(
        client.query(
          `INSERT INTO source_documents
             (project_id, workspace_id, kind, title, created_by_user_id)
           VALUES ($1, $2, 'manual', 'Invalid project', $3)`,
          [randomUUID(), first.workspaceId, first.userId],
        ),
        "23503",
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO project_memberships
             (project_id, workspace_id, user_id, role)
           VALUES ($1, $2, $3, 'participant')`,
          [first.projectId, first.workspaceId, first.userId],
        ),
        "23505",
      );
    } finally {
      client.release();
    }
  });

  it("prevents cross-project and non-input evidence references", async () => {
    const client = await pool.connect();
    try {
      const first = await seedProject(client, `evidence-a-${randomUUID()}`);
      const second = await seedProject(client, `evidence-b-${randomUUID()}`);
      await expectDatabaseError(
        client.query(
          `INSERT INTO evidence_references
             (finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship, quoted_text)
           VALUES ($1, $2, $3, $4, $5, 'supports', 'Exact quote')`,
          [
            first.findingId,
            first.analysisRunId,
            second.agreementVersionId,
            first.projectId,
            first.workspaceId,
          ],
        ),
        ["23503", "23514"],
      );

      const extraDocumentId = randomUUID();
      const extraVersionId = randomUUID();
      await client.query(
        `INSERT INTO source_documents
           (id, project_id, workspace_id, kind, title, created_by_user_id)
         VALUES ($1, $2, $3, 'attachment', 'Extra source', $4)`,
        [extraDocumentId, first.projectId, first.workspaceId, first.userId],
      );
      await client.query(
        `INSERT INTO document_versions
           (id, source_document_id, project_id, workspace_id, version_number, content_hash,
            media_type, byte_size, processing_status, created_by_user_id)
         VALUES ($1, $2, $3, $4, 1, $5, 'text/plain', 2, 'ready', $6)`,
        [
          extraVersionId,
          extraDocumentId,
          first.projectId,
          first.workspaceId,
          "c".repeat(64),
          first.userId,
        ],
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO evidence_references
             (finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship)
           VALUES ($1, $2, $3, $4, $5, 'context')`,
          [
            first.findingId,
            first.analysisRunId,
            extraVersionId,
            first.projectId,
            first.workspaceId,
          ],
        ),
        "23514",
      );
    } finally {
      client.release();
    }
  });

  it("accepts exact input citations and does not require manufactured quotation text", async () => {
    const client = await pool.connect();
    try {
      const record = await seedProject(client, `citation-${randomUUID()}`);
      await client.query(
        `INSERT INTO evidence_references
           (finding_id, analysis_run_id, document_version_id, project_id, workspace_id,
            relationship, quoted_text, start_offset, end_offset)
         VALUES ($1, $2, $3, $4, $5, 'supports', 'Exact quote', 4, 15)`,
        [
          record.findingId,
          record.analysisRunId,
          record.agreementVersionId,
          record.projectId,
          record.workspaceId,
        ],
      );
      await client.query(
        `INSERT INTO evidence_references
           (finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship)
         VALUES ($1, $2, $3, $4, $5, 'missing')`,
        [
          record.findingId,
          record.analysisRunId,
          record.instructionVersionId,
          record.projectId,
          record.workspaceId,
        ],
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO evidence_references
             (finding_id, analysis_run_id, document_version_id, project_id, workspace_id,
              relationship, quoted_text)
           VALUES ($1, $2, $3, $4, $5, 'missing', 'Invented quote')`,
          [
            record.findingId,
            record.analysisRunId,
            record.instructionVersionId,
            record.projectId,
            record.workspaceId,
          ],
        ),
        "23514",
      );
    } finally {
      client.release();
    }
  });

  it("keeps document versions and analysis inputs immutable", async () => {
    const client = await pool.connect();
    try {
      const record = await seedProject(client, `immutable-${randomUUID()}`);
      await expectDatabaseError(
        client.query(`UPDATE document_versions SET byte_size = 99 WHERE id = $1`, [
          record.agreementVersionId,
        ]),
        "55000",
      );
      await expectDatabaseError(
        client.query(`DELETE FROM document_versions WHERE id = $1`, [
          record.agreementVersionId,
        ]),
        "55000",
      );
      await expectDatabaseError(
        client.query(`UPDATE analysis_runs SET agreement_version_id = $1 WHERE id = $2`, [
          record.instructionVersionId,
          record.analysisRunId,
        ]),
        "55000",
      );
      await client.query(`UPDATE analysis_runs SET status = 'running' WHERE id = $1`, [
        record.analysisRunId,
      ]);
    } finally {
      client.release();
    }
  });

  it("requires a valid authenticated decision actor and valid project references", async () => {
    const client = await pool.connect();
    try {
      const first = await seedProject(client, `decision-a-${randomUUID()}`);
      const second = await seedProject(client, `decision-b-${randomUUID()}`);
      await expectDatabaseError(
        client.query(
          `INSERT INTO decisions
             (change_request_id, agreement_version_id, project_id, workspace_id, outcome,
              authority_snapshot, idempotency_key)
           VALUES ($1, $2, $3, $4, 'approved', '{}', 'missing-actor')`,
          [
            first.changeRequestId,
            first.agreementVersionId,
            first.projectId,
            first.workspaceId,
          ],
        ),
        "23502",
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO decisions
             (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id,
              actor_identity_id, outcome, authority_snapshot, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, 'approved', '{}', 'cross-project')`,
          [
            first.changeRequestId,
            second.agreementVersionId,
            first.projectId,
            first.workspaceId,
            first.userId,
            first.identityId,
          ],
        ),
        ["23503", "23514"],
      );
    } finally {
      client.release();
    }
  });

  it("preserves a linear append-only decision history and rejects conflicts", async () => {
    const client = await pool.connect();
    try {
      const record = await seedProject(client, `history-${randomUUID()}`);
      const rootDecisionId = randomUUID();
      const successorDecisionId = randomUUID();
      const values = [
        record.changeRequestId,
        record.agreementVersionId,
        record.projectId,
        record.workspaceId,
        record.userId,
        record.identityId,
      ];
      await client.query(
        `INSERT INTO decisions
           (id, change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id,
            actor_identity_id, outcome, authority_snapshot, idempotency_key)
         VALUES ($7, $1, $2, $3, $4, $5, $6, 'approved', '{"role":"manager"}', 'decision-root')`,
        [...values, rootDecisionId],
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO decisions
             (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id,
              actor_identity_id, outcome, authority_snapshot, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, 'rejected', '{}', 'conflicting-root')`,
          values,
        ),
        "23505",
      );
      await client.query(
        `INSERT INTO decisions
           (id, change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id,
            actor_identity_id, outcome, authority_snapshot, idempotency_key, supersedes_decision_id)
         VALUES ($7, $1, $2, $3, $4, $5, $6, 'rejected', '{"role":"manager"}', 'decision-successor', $8)`,
        [...values, successorDecisionId, rootDecisionId],
      );
      await expectDatabaseError(
        client.query(`UPDATE decisions SET rationale = 'rewrite' WHERE id = $1`, [
          rootDecisionId,
        ]),
        "55000",
      );
      await expectDatabaseError(
        client.query(
          `INSERT INTO decisions
             (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id,
              actor_identity_id, outcome, authority_snapshot, idempotency_key, supersedes_decision_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'unresolved', '{}', 'second-successor', $7)`,
          [...values, rootDecisionId],
        ),
        "23505",
      );
    } finally {
      client.release();
    }
  });

  it("persists audit events and prevents rewriting or deletion", async () => {
    const client = await pool.connect();
    try {
      const record = await seedProject(client, `audit-${randomUUID()}`);
      const auditId = randomUUID();
      await client.query(
        `INSERT INTO audit_events
           (id, workspace_id, project_id, origin, actor_user_id, actor_identity_id,
            event_type, target_type, target_id)
         VALUES ($1, $2, $3, 'human', $4, $5, 'change_request.created', 'change_request', $6)`,
        [
          auditId,
          record.workspaceId,
          record.projectId,
          record.userId,
          record.identityId,
          record.changeRequestId,
        ],
      );
      const persisted = await client.query<{ event_type: string }>(
        `SELECT event_type FROM audit_events WHERE id = $1`,
        [auditId],
      );
      expect(persisted.rows[0]?.event_type).toBe("change_request.created");
      await expectDatabaseError(
        client.query(`UPDATE audit_events SET event_type = 'rewritten' WHERE id = $1`, [
          auditId,
        ]),
        "55000",
      );
      await expectDatabaseError(
        client.query(`DELETE FROM audit_events WHERE id = $1`, [auditId]),
        "55000",
      );
    } finally {
      client.release();
    }
  });
});
