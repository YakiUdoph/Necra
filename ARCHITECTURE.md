# Necra Architecture

## Status

The T001 application foundation uses the choices recorded in `docs/decisions/0001-development-foundation.md`. T002 established the PostgreSQL/Drizzle persistence foundation in `docs/decisions/0002-postgresql-drizzle-persistence.md`. T003 established Better Auth and project authorization in `docs/decisions/0003-better-auth-and-project-authorization.md`. Other product infrastructure remains proposed until its owning task verifies it. External details explicitly marked **Unverified** must not be implemented by assumption.

## Proposed stack

- Web application: Next.js App Router with React and strict TypeScript.
- Styling: Tailwind CSS with CSS-first design tokens and locally maintained component primitives; avoid a theme that dictates generic dashboard styling.
- Server boundary: Next.js server modules and route handlers. Protected data access is server-only.
- Primary database: PostgreSQL with transactional, version-controlled SQL migrations; Drizzle ORM is the typed schema/query layer and `pg` is the Node.js driver. No hosted database vendor is selected or connected.
- Object storage: private, S3-compatible managed storage for original source files; exact provider is not selected.
- Execution model: begin with bounded server requests and persisted truthful states. Add background jobs or a queue only if measured document or provider behavior demonstrates the requirement and a later ADR approves it.
- Authentication: Better Auth 1.7.15 with PostgreSQL-backed credential accounts and opaque, revocable sessions through the Drizzle adapter.
- Testing: Vitest for unit and driver-based database integration tests; a database-native PostgreSQL suite independently validates migration apply/rollback and core constraints; Playwright drives installed Chrome for authenticated browser flows.
- Deployment: one Next.js Node.js application initially. Managed PostgreSQL, authentication, and private object storage require later external configuration. Vendors remain undecided and no hosted service is connected.

Selections must be based on current official documentation, security posture, team constraints, and deployment compatibility. Package names and versions must not be guessed into integration code.

## Repository structure

```text
/
├─ AGENTS.md, PRD.md, ARCHITECTURE.md, DESIGN.md, RULES.md
├─ TASKS.md, PROGRESS.md
├─ src/
│  ├─ app/                 # routes, layouts, server-rendered UI
│  ├─ components/          # accessible product primitives and composed UI
│  ├─ features/            # engagement, evidence, checks, review, audit
│  ├─ server/
│  │  ├─ auth/             # session resolution and authorization policies
│  │  ├─ db/               # schema, queries, transactions
│  │  ├─ evidence/         # ingestion, hashing, extraction, citations
│  │  ├─ integrations/     # external adapters, including Clocked
│  │  └─ observability/    # structured redacted telemetry
│  └─ styles/              # tokens and global styles
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ contract/
│  ├─ e2e/
│  └─ fixtures/            # unmistakably test-only data
├─ migrations/
└─ docs/                   # decisions, runbooks, research, provider notes
```

Directories are created only when their first task needs them.

## Architectural boundaries

```text
Browser → server UI/API → authorization policy → domain service → database/object store
                                                    ↓
                                         bounded Clocked adapter call
```

- The browser is untrusted. It may improve navigation but cannot grant access, choose the authoritative actor, or finalize a state transition.
- Route handlers validate syntax and resolve the authenticated actor. Domain services enforce membership, role, resource ownership, valid state transitions, and idempotency.
- Database access, object-store credentials, provider credentials, raw provider responses, and source extraction run on the server.
- External providers never write domain state directly. Adapters validate their output; domain services decide how it is stored and represented.
- Provider calls use explicit timeouts and persisted truthful states. If real measurements later show that a request cannot safely complete within platform limits, a dedicated task must introduce the simplest durable execution mechanism; T001 adds none.

## Signature experience projections

- **Agreement Reality Check** is the review workflow over exact `SourceVersion`, `AgreementCheck`, `ComparisonRun`, `Finding`, `FindingCitation`, `ReviewAction`, and `Decision` records. Provider output cannot write a decision.
- **Decision Replay** is a deterministic, authorized read model over genuine persisted source-version, request, check, review, decision, and audit records. It may group or format records for comprehension, but it does not generate, infer, or backfill timeline events.

## Persisted data model

T002 migration `0000_lovely_marvel_apes.sql` implements the following records. Every project-owned record carries both `project_id` and `workspace_id`; composite foreign keys prevent a relationship from crossing either boundary.

- **User:** privacy-minimal internal principal. **AuthenticatedIdentity** maps an external provider/subject pair to one user without storing provider credentials.
- **Workspace:** top-level tenant.
- **WorkspaceMembership:** user, workspace, role, status, timestamps.
- **Project:** workspace-owned client engagement. **ProjectMembership** requires workspace membership and stores role, status, and a decision-authority flag for later authorization policy.
- **SourceDocument:** logical agreement, instruction, attachment, or manually entered evidence item.
- **DocumentVersion:** immutable source revision with positive sequence, SHA-256-shaped content hash, storage reference, media metadata, capture/processing metadata, creator, and database timestamp. Replacement creates a new row.
- **ChangeRequest:** later-instruction version, explicit lifecycle state (`requested`, `under_review`, `approved`, `rejected`, `unresolved`, or `completed`), creator, and project-scoped idempotency key. Its state does not itself create a decision.
- **AnalysisRun:** exact agreement and instruction versions, matching change request, lifecycle state, attempt/provider metadata, creator, and project-scoped idempotency key. Input and creation identifiers are immutable while operational status may advance.
- **Finding:** run-bound provider/model assertion, category, normalized explanation, uncertainty, and lifecycle status.
- **EvidenceReference:** finding/run, one of the run's exact input versions, relationship type, optional authentic quoted text, paired character offsets when available, and structured locator. Missing evidence carries no manufactured quotation.
- **ReviewAction:** append-only human annotation/correction/dismissal tied to a finding or check.
- **Decision:** append-only explicit outcome tied to a change request and agreement version, authenticated actor identity, authority snapshot, rationale, database/trusted-server time, idempotency key, and optional same-context predecessor. Unique constraints keep each history linear.
- **AuditEvent:** append-only actor/origin, event type, target, UTC timestamp, request correlation ID, and non-sensitive structured metadata.

Generated SQL adds triggers that reject update/delete operations on immutable versions, findings, evidence references, reviews, decisions, and audit events; protect analysis input columns; validate agreement/instruction source kinds; and keep citations on analyzed inputs. Restrictive deletion is intentional pending a retention policy. Raw source text and provider payloads must not be copied into general audit logs.

These protections do not replace authorization, state-transition services, citation-to-content validation, or transactional decision-plus-audit writes. Database owners can bypass triggers, so the audit history is application-auditable rather than tamper-proof. Extracted content/passages, original object storage, provider raw payload storage, and retention/deletion workflows belong to later tasks and are not fabricated in T002.

## Authentication and authorization

Authentication verifies identity; authorization is evaluated separately for every operation.

- Use secure, HTTP-only, same-site cookies and provider-recommended session rotation/revocation.
- Resolve user identity only from the verified server session, never a submitted user ID.
- Centralize policies for workspace membership, engagement access, source access, check creation/review, and decision authority.
- Default deny. Scope every query by tenant and resource; avoid fetch-then-check patterns that can leak existence.
- Validate role changes and decision permissions server-side and audit them.
- Signed object access must be short-lived, purpose-scoped, and issued only after authorization.
- Automated integration tests must attempt horizontal and vertical privilege escalation.

T003 maps `manager`/`reviewer`/`participant` to owner/collaborator/viewer. Both workspace and project memberships must be active. Owners manage membership; owners and collaborators may write; viewers read only. `can_decide` is additionally required for owners or collaborators, while viewers can never decide. Authenticated account creation alone grants no project access. Details and limitations are recorded in ADR 0003.

## Evidence integrity

- Preserve the original uploaded bytes in private storage and calculate a cryptographic content hash during trusted ingestion.
- Create a new `SourceVersion` for every replacement; never edit a version referenced by a check.
- Preserve exact cited text and the most precise authentic locator available. Clearly state when page/author/received-time metadata is unavailable.
- Treat extraction as derived content with its own method, version, and status. A manual correction becomes separately attributed derived content or a new source version; it does not rewrite the original.
- Snapshot version identifiers when a check is created. Later document uploads do not alter an existing check.
- Keep machine/provider output, human review, and explicit decisions in separate records.
- Use UTC internally and retain source-reported timestamps and timezone/precision separately when available.

Malware scanning, accepted formats, maximum size, hash algorithm, OCR service, and retention/deletion rules are **Unverified** and must be decided before production ingestion.

## Clocked integration

Create a narrow server-only adapter after reviewing official Clocked documentation. Domain code should depend on an internal capability interface, not provider payloads. The supplied documented base URL is `https://clocked.rezolve.ai/clocked`, with relevant `POST /compare` and `POST /grounding` paths; request/response schemas and authorization behavior remain unverified and are not implemented in T001.

Required implementation sequence:

1. Locate and archive links to the applicable official documentation and record document/version dates.
2. Verify base URL, authentication, Compare and Verify endpoint behavior, schemas, limits, errors, timeouts, data handling, and idempotency guidance.
3. Define internal request/response types without erasing uncertainty or evidence locators.
4. Add recorded, redacted contract fixtures sourced in compliance with provider terms; fixtures remain test-only.
5. Validate all live responses at runtime and retain failures as failures.
6. Run an authorized test against the real service in a non-production environment, recording date, request correlation, redacted result, and observed limitations.

Current truth: the Clocked playground has produced real Compare and Verify responses. Necra's own adapter, credentials, requests, response validation, and end-to-end integration do not exist and are unverified.

Apart from the supplied base URL and endpoint paths, Clocked authentication, exact schemas, Compare/Grounding semantics, rate limits, retry/idempotency behavior, SDK availability, costs, service-level guarantees, and data-retention terms are all **Unverified**. Do not invent them.

## Error handling

Use typed error categories with a safe user message, internal correlation ID, retry guidance, and cause retained server-side:

- validation/input error — identify the field and how to fix it;
- authentication/authorization error — do not reveal protected resource existence;
- evidence unavailable or incomplete — identify what is missing without calling it contradictory;
- extraction failure — preserve source, expose retry/replace/manual options as applicable;
- provider timeout/unavailable/rate-limited — retain pending/failed truthfully and use bounded retries;
- malformed provider response — quarantine the response, show no invented findings, and allow a safe retry;
- conflict/invalid transition — return current state and allowed next actions;
- internal error — generic user message plus correlation ID, with redacted structured logs.

Operations must be idempotent where required and retries must be bounded and permitted by the provider. Do not add a dead-letter queue until a durable worker exists and the failure mode demonstrates the need. Decisions are never automatically retried in a way that can duplicate them.

## Deployment approach

- Separate local, preview, staging, and production environments with distinct data and credentials.
- Use migrations in CI/CD with reviewed rollback/forward-fix procedures and backups before risky changes.
- Pull secrets from the deployment platform's secret manager; never commit or expose them to preview clients.
- Restrict previews containing evidence and prevent production data from populating development/test.
- Gate production release on unit, integration, contract, end-to-end, accessibility, migration, and secret-scanning checks appropriate to the change.
- Monitor availability, provider latency/errors, failed operations, and audit anomalies using redacted metadata.
- Validate backup restoration, retention/deletion processes, and a production smoke test before claiming readiness.

Hosting, database, storage, authentication, observability, email, domain, region/data residency, and disaster-recovery targets are **Unverified**. No external product service is connected in T001.
