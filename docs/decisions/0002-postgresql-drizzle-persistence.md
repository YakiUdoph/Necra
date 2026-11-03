# ADR 0002: PostgreSQL and Drizzle persistence foundation

- Status: Accepted for T002
- Date: 2026-11-02

## Context

Necra needs typed persistence and version-controlled migrations for tenant-scoped projects, immutable evidence versions, exact analysis inputs, human decisions, and an auditable history. These guarantees must live in PostgreSQL where practical rather than depending on browser filtering or TypeScript types alone.

## Decision

- Use PostgreSQL as the primary relational database.
- Use Drizzle ORM 0.45.4 as the only typed query/schema layer, `pg` 8.23.1 as the Node.js driver, and Drizzle Kit 0.31.11 for code-first migration generation and consistency checks.
- Keep the typed schema in `src/server/db/schema.ts`; keep database access behind the server-only factory in `src/server/db/client.ts`.
- Commit generated SQL and Drizzle snapshots under `migrations/`. Do not use `drizzle-kit push` for shared environments.
- Supplement generated SQL with reviewed PostgreSQL triggers for protections the typed schema cannot express: immutable versions, append-only historical rows, immutable analysis inputs, input-version evidence association, and source-kind validation.
- Treat applied migrations as immutable. Shared environments move forward with a new migration. The sidecar down script for migration 0000 exists only to validate rollback on a disposable empty T002 database; it is not authorization to roll back a populated environment without a reviewed data/back-up plan.
- Require a transaction in later domain services when a state change, decision, and audit event must commit together.

## Enforced guarantees

- Composite foreign keys carry project and workspace scope through every project-owned relationship, preventing cross-project or cross-tenant references.
- Source versions have unique positive sequence numbers, lowercase SHA-256-shaped hashes, and reject update/delete operations. A revision is another row.
- Change requests and analysis runs have project-scoped idempotency keys. Analysis runs retain exact agreement and instruction versions, and those input identifiers cannot be changed.
- Evidence references belong to a finding and analysis run, may cite only that run's two inputs, preserve optional exact quoted text and offsets, and cannot put quotation text on a missing-evidence reference.
- Decisions require a user, an authenticated identity belonging to that user, project linkage at the referential level, a change request, and an agreement version in the same project. One root and a single linear successor per decision prevent ambiguous concurrent histories. Decisions are append-only.
- Audit events distinguish human/system/external origin, require an authenticated identity for human origin, use database timestamps by default, and reject update/delete operations.

## Application-layer obligations and limitations

- Foreign keys are not authorization. T003 must default-deny reads/writes and scope every query to the verified actor. PostgreSQL row-level security was not introduced before the authentication/hosting model is selected.
- The database cannot infer current decision authority from `can_decide` through a declarative foreign key. T003/T010 must verify active membership, role, and authority in the same transaction.
- Change-request lifecycle transitions and analysis status transitions still require server-side state machines. A status value never creates a decision.
- The schema validates citation association and offset shape, but T005 must verify that quoted text exactly matches stored extracted content before insert.
- Hash format is enforced; trusted hash calculation and original-object preservation belong to T005.
- Generic audit targets cannot all have foreign keys. Domain transactions must write the event only after validating the real target.
- Database owners and sufficiently privileged operators can disable triggers or change rows. These records provide application-level auditability, not tamper-proof evidence.
- Retention, legal hold, deletion, backup, restore, and data-residency policies remain undecided. Restrictive foreign keys intentionally prevent casual cascading deletion.

## Migration and test policy

- Generate migrations with `npm run db:generate`; review SQL and snapshots; validate history with `npm run db:check`.
- Apply with `DATABASE_URL` set and `npm run db:migrate`. Never point local/test commands at production data.
- `npm run test:integration` requires `TEST_DATABASE_ADMIN_URL` for a PostgreSQL administrative database and creates a uniquely prefixed disposable database.
- `tests/integration/run-schema-tests.sh` provides the same real-database verification through local `psql`, including apply, invariants, rollback, and cleanup.

## Official references reviewed

Accessed 2026-11-02:

- Drizzle PostgreSQL setup and supported drivers: https://orm.drizzle.team/docs/get-started/postgresql-new
- Drizzle migration approaches: https://orm.drizzle.team/docs/migrations
- Drizzle Kit generation and versioned SQL: https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle indexes and composite constraints: https://orm.drizzle.team/docs/indexes-constraints
- Drizzle migration consistency checking: https://orm.drizzle.team/docs/kit-overview
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL trigger behavior: https://www.postgresql.org/docs/current/sql-createtrigger.html

## Verification evidence

On 2026-11-02, the migration and invariant suite passed against PostgreSQL 14.24 in a uniquely named disposable database. The suite applied migration 0000 from empty state, exercised foreign keys, tenant separation, version/input immutability, evidence association, decision actor/history/idempotency rules, and audit persistence, then applied the down script, verified zero remaining public tables, and dropped the database.

`npm audit --omit=dev` reported zero runtime vulnerabilities. The full audit reported four moderate development-only findings through Drizzle Kit's deprecated `@esbuild-kit` dependency. npm offers only a forced downgrade to Drizzle Kit 0.18.1. Do not expose Drizzle development tooling or Studio to untrusted networks; reassess when Drizzle publishes a compatible fixed stable release.
