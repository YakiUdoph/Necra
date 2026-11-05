import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  changeProjectMembershipForActor,
  ResourceNotFoundError,
} from "../../src/server/authorization/membership-change";
import { findProjectForUser } from "../../src/server/authorization/project-query";
import * as schema from "../../src/server/db/schema";

const adminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL;

if (!adminDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_ADMIN_URL is required. Integration tests only run against a disposable PostgreSQL database.",
  );
}

const databaseName = `necra_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = new Pool({ connectionString: adminDatabaseUrl, max: 1 });
const databaseUrl = new URL(adminDatabaseUrl);
databaseUrl.pathname = `/${databaseName}`;

let pool: Pool;
let databaseCreated = false;

async function applyMigration(client: PoolClient, filename: string) {
  const migration = await readFile(resolve("migrations", filename), "utf8");
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await client.query(statement);
  }
}

function cookieFrom(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Expected authentication response to set a session cookie");
  }
  const match = setCookie.match(/(?:^|,\s*)([^;,]*session_token[^=]*)=([^;]+)/i);
  if (!match?.[1] || !match[2]) {
    throw new Error("Expected a Better Auth session token cookie");
  }
  return `${match[1]}=${match[2]}`;
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  pool = new Pool({ connectionString: databaseUrl.toString(), max: 4 });
  const client = await pool.connect();
  try {
    await applyMigration(client, "0000_lovely_marvel_apes.sql");
    await applyMigration(client, "0001_omniscient_black_widow.sql");
    await applyMigration(client, "0002_dapper_masked_marvel.sql");
    await applyMigration(client, "0003_fancy_kingpin.sql");
  } finally {
    client.release();
  }
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
  if (databaseCreated && /^necra_test_[0-9a-f]{32}$/.test(databaseName)) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  }
  await adminPool.end();
});

describe("T003 database-backed authentication and authorization", () => {
  it("verifies sessions, scopes projects, enforces authority, and invalidates logout", async () => {
    const db = drizzle(pool, { schema });
    const auth = betterAuth({
      baseURL: "http://localhost:3000",
      secret: "test-only-auth-secret-with-at-least-32-characters",
      database: drizzleAdapter(db, {
        provider: "pg",
        transaction: true,
        schema: {
          user: schema.users,
          session: schema.authSessions,
          account: schema.authAccounts,
          verification: schema.authVerifications,
        },
      }),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12,
        autoSignIn: false,
      },
      session: { expiresIn: 60 * 60, cookieCache: { enabled: false } },
      advanced: {
        database: { generateId: "uuid" },
        disableOriginCheck: false,
        disableCSRFCheck: false,
      },
      trustedOrigins: ["http://localhost:3000"],
      telemetry: { enabled: false },
    });

    const unauthenticated = await auth.api.getSession({ headers: new Headers() });
    expect(unauthenticated).toBeNull();
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie: "better-auth.session_token=invalid" }),
      }),
    ).toBeNull();

    const users = [
      { name: "TEST ONLY Owner", email: "owner@example.test" },
      { name: "TEST ONLY Collaborator", email: "collaborator@example.test" },
      { name: "TEST ONLY Viewer", email: "viewer@example.test" },
    ];
    for (const user of users) {
      const response = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({ ...user, password: "test-only-password-123" }),
        }),
      );
      expect(response.status).toBe(200);
    }

    const signInResponse = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({
          email: users[0]?.email,
          password: "test-only-password-123",
        }),
      }),
    );
    expect(signInResponse.status).toBe(200);
    const cookie = cookieFrom(signInResponse);
    const rejectedOrigin = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: { cookie, origin: "https://attacker.test" },
      }),
    );
    expect(rejectedOrigin.status).toBe(403);
    const authenticated = await auth.api.getSession({
      headers: new Headers({ cookie, "x-user-id": randomUUID() }),
    });
    expect(authenticated?.user.email).toBe(users[0]?.email);

    const rows = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users ORDER BY email`,
    );
    const byEmail = new Map(rows.rows.map((row) => [row.email, row.id]));
    const ownerId = byEmail.get("owner@example.test");
    const collaboratorId = byEmail.get("collaborator@example.test");
    const viewerId = byEmail.get("viewer@example.test");
    if (!ownerId || !collaboratorId || !viewerId) {
      throw new Error("Test-only authenticated users were not persisted");
    }

    const identityCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM authenticated_identities
       WHERE provider = 'credential'`,
    );
    expect(identityCount.rows[0]?.count).toBe("3");

    const workspaceId = randomUUID();
    const projectId = randomUUID();
    const otherWorkspaceId = randomUUID();
    const otherProjectId = randomUUID();
    await pool.query(
      `INSERT INTO workspaces (id, name) VALUES ($1, 'TEST ONLY Workspace'), ($2, 'TEST ONLY Other Workspace')`,
      [workspaceId, otherWorkspaceId],
    );
    await pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $3, 'administrator'), ($1, $4, 'member'), ($1, $5, 'member'),
              ($2, $4, 'administrator')`,
      [workspaceId, otherWorkspaceId, ownerId, collaboratorId, viewerId],
    );
    await pool.query(
      `INSERT INTO projects (id, workspace_id, name, created_by_user_id)
       VALUES ($1, $2, 'TEST ONLY Authorized Project', $3),
              ($4, $5, 'TEST ONLY Other Project', $6)`,
      [projectId, workspaceId, ownerId, otherProjectId, otherWorkspaceId, collaboratorId],
    );
    await pool.query(
      `INSERT INTO project_memberships
         (project_id, workspace_id, user_id, role, can_decide)
       VALUES ($1, $2, $3, 'manager', true),
              ($1, $2, $4, 'reviewer', false),
              ($1, $2, $5, 'participant', true),
              ($6, $7, $4, 'manager', true)`,
      [
        projectId,
        workspaceId,
        ownerId,
        collaboratorId,
        viewerId,
        otherProjectId,
        otherWorkspaceId,
      ],
    );

    expect(
      await findProjectForUser(db, ownerId, projectId, "project:read"),
    ).toMatchObject({ id: projectId, role: "owner", canDecide: true });
    expect(
      await findProjectForUser(db, ownerId, otherProjectId, "project:read"),
    ).toBeNull();
    expect(
      await findProjectForUser(db, collaboratorId, projectId, "decision:create"),
    ).toBeNull();
    expect(
      await findProjectForUser(db, viewerId, projectId, "decision:create"),
    ).toBeNull();

    await changeProjectMembershipForActor(db, ownerId, projectId, collaboratorId, {
      role: "reviewer",
      canDecide: true,
      status: "active",
    });
    expect(
      await findProjectForUser(db, collaboratorId, projectId, "decision:create"),
    ).toMatchObject({ role: "collaborator", canDecide: true });

    const audit = await pool.query<{
      actor_user_id: string;
      event_type: string;
      target_id: string;
    }>(
      `SELECT actor_user_id, event_type, target_id
       FROM audit_events WHERE project_id = $1`,
      [projectId],
    );
    expect(audit.rows).toEqual([
      {
        actor_user_id: ownerId,
        event_type: "project_membership.changed",
        target_id: collaboratorId,
      },
    ]);

    await expect(
      changeProjectMembershipForActor(db, collaboratorId, projectId, viewerId, {
        role: "reviewer",
        canDecide: true,
        status: "active",
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    await pool.query(
      `UPDATE project_memberships SET status = 'suspended'
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, collaboratorId],
    );
    expect(
      await findProjectForUser(db, collaboratorId, projectId, "project:read"),
    ).toBeNull();

    const logoutResponse = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: { cookie, origin: "http://localhost:3000" },
      }),
    );
    expect(logoutResponse.status).toBe(200);
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();

    const secondSignIn = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({
          email: users[0]?.email,
          password: "test-only-password-123",
        }),
      }),
    );
    const expiringCookie = cookieFrom(secondSignIn);
    await pool.query(
      `UPDATE auth_sessions SET expires_at = now() - interval '1 minute'
       WHERE user_id = $1`,
      [ownerId],
    );
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie: expiringCookie }) }),
    ).toBeNull();
  }, 60_000);
});
