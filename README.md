# How to Test Necra

Necra helps freelancers, agencies, contractors, and clients answer a difficult question without losing the source material: what was originally agreed, what was requested later, and what still needs an explicit human decision?

The product preserves exact agreement and instruction versions, creates a durable Agreement Reality Check from selected versions, and keeps automated output separate from human authority. The verified baseline covers tasks T001 through T011: Clocked processing and findings have passed the recorded narrow fictional-evidence verification, an authorized person can deliberately approve or reject one exact persisted check, and Decision Replay renders the resulting persisted history without generating missing activity.

## Judge access status

There is currently **no verified live deployment or judge account**. Do not infer a URL from the GitHub remote or share reusable credentials in this file. Until a dedicated evaluation environment is deployed and tested, judges can reproduce the verified workflow locally with a disposable PostgreSQL database.

### What you need

- Node.js 24.18.x and npm 11.16 or later within the range in `package.json`.
- PostgreSQL with an empty, non-production database.
- A local `.env.local` created from `.env.example`.
- Chrome for the browser test suite.

Use fictional, non-sensitive agreement text for evaluation. Never point the application or its test suites at production data.

### Local evaluation walkthrough

1. Install the pinned dependencies and create local configuration:

   ```powershell
   npm.cmd ci
   Copy-Item .env.example .env.local
   ```

2. In `.env.local`, set `DATABASE_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, `BETTER_AUTH_URL=http://localhost:3000`, and `AUTH_ALLOW_SIGN_UP=true`. Do not commit the file.
3. Drizzle reads `DATABASE_URL` from the process environment. Apply migrations with the same non-production URL used in `.env.local`, clear the temporary shell value, and start the application (Next.js loads `.env.local`):

   ```powershell
   $env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
   npm.cmd run db:migrate
   Remove-Item Env:DATABASE_URL
   npm.cmd run dev
   ```

4. Open `http://localhost:3000/sign-up`, create a local test account, and sign in. Signup is intentionally disabled unless `AUTH_ALLOW_SIGN_UP=true`.
5. Create a private workspace and project from the Projects screen.
6. Open the project and add an original agreement as pasted text. Add later instructions as a second source. The text is genuinely saved to PostgreSQL; it is not a demo response.
7. Add a new version to either source, reload the page, and inspect the version history. The original version must remain present with its own version number and server-calculated hash.
8. In Agreement Reality Check, select an exact agreement version and instruction version. Confirm the displayed versions and hash prefixes, then create the check.
9. Reload the project. The created check should remain visible with a truthful persisted state. Without configured server credentials it remains unsent. With an authorized Clocked configuration, deliberately confirm processing; completion still does not create an approval.
10. For a completed check, inspect the exact agreement and instruction versions, persisted findings, verified passages, and any explicit evidence-unavailable state.
11. Sign in as an active owner or collaborator whose project membership has explicitly been granted `can_decide`. Open the decision dialog; neither outcome is preselected. Choose approve or reject, review the exact check and versions, confirm deliberately, and submit.
12. Reload the project. The decision must remain visible with the authenticated decision-maker, trusted time, outcome, rationale when supplied, exact source versions, and any supersession link. A replacement appends a record instead of rewriting the earlier decision.
13. In Decisions & Decision Replay, inspect the chronological persisted source, request, check, provider, review, decision, and audit links. Open an exact source version, confirm provider and human origins remain distinct, and verify missing audit/evidence links are displayed as gaps rather than generated activity.

### What is not yet available

- A judge-access deployment and securely distributed judge account.
- Independent per-finding correction and dismissal controls.
- PDF, DOCX, image, OCR, or file-upload ingestion.

Do not try to evaluate unavailable steps by editing the database or bypassing authentication. A Clocked result is not a human decision, and creating or completing a check never records approval.

### Expected results

- Authentication and every protected read/write are enforced on the server.
- Saved text survives navigation and reload.
- Revisions append versions instead of overwriting history.
- A check snapshots the selected version identifiers and hashes.
- Cross-project access returns a non-disclosing failure.
- Provider output, missing evidence, human review confirmation, and explicit decisions remain visibly distinct.
- Only a deliberate request by an authenticated active member with `can_decide` creates a decision.
- Duplicate retries return the same durable record; concurrent or stale attempts do not overwrite history.

### Troubleshooting

- If signup is unavailable, confirm `AUTH_ALLOW_SIGN_UP=true` and restart the development server.
- If protected pages fail, verify that PostgreSQL is reachable and that `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are set.
- If a migration or disposable-database test fails, confirm the database role has the permissions described below and is not connected to production.
- On Windows systems that block PowerShell script shims, use `npm.cmd` as shown in these examples.
- Managed Playwright browser downloads are not required; the verified suite uses installed Chrome.

## What is implemented

- Better Auth credential sessions backed by PostgreSQL, with server-side project authorization and origin/CSRF checks.
- Private project creation with active workspace and project memberships.
- Exact pasted-text agreements and later instructions, optional provenance, immutable versions, server-calculated SHA-256 hashes, and persisted history.
- Authorized, idempotent Agreement Reality Check creation from exact ready versions, with durable processing states and safe retry metadata.
- A reviewed Clocked contract, server-only Compare and Verify/Grounding transport, strict runtime schemas, exact quotation checks, clearly isolated mocked/documentation fixtures, and a dated authenticated fictional-evidence live verification. This is not approval, accuracy proof, or production-sensitive-data readiness.
- Evidence-integrity-checked findings that show exact persisted source passages or an honest unsupported/missing-evidence state.
- Deliberate authorized approve/reject decisions bound to one immutable Reality Check, agreement version, instruction version, and provider-result identity. Actor, database time, authority snapshot, rationale, review confirmation, audit event, idempotency, and append-only supersession are persisted transactionally.
- Authorized Decision Replay over genuine persisted source, request, check, provider-finding, human-review, decision, and audit records, with deterministic chronology, exact evidence links, explicit gaps, and visible supersession.

The current status and real test history live in [PROGRESS.md](PROGRESS.md). Planned work and acceptance criteria live in [TASKS.md](TASKS.md).

## How the application is structured

Necra is one Next.js App Router application. Route handlers and server modules enforce authentication, project scope, validation, and state transitions. PostgreSQL is the source of truth; Drizzle provides the typed schema and query layer. Database constraints and triggers protect immutable evidence and append-only history where application checks alone would be too weak.

Key documentation:

- [PRD.md](PRD.md) explains the users, complete workflow, and release criteria.
- [ARCHITECTURE.md](ARCHITECTURE.md) defines system boundaries and the persisted model.
- [DESIGN.md](DESIGN.md) defines language, interaction, accessibility, and visual behavior.
- [RULES.md](RULES.md) contains engineering and evidence-integrity rules.
- [docs/decisions](docs/decisions) records why major technical choices were made.
- [Clocked provider contract](docs/providers/clocked-contract.md) separates documented behavior from verified Necra behavior.

## Environment configuration

Copy `.env.example` to `.env.local` and provide only the values needed for the workflow you are running.

- `DATABASE_URL`: PostgreSQL connection used by migrations, authentication, and protected application queries.
- `BETTER_AUTH_SECRET`: server-only secret with at least 32 random characters.
- `BETTER_AUTH_URL`: exact application origin. Production configuration requires HTTPS.
- `AUTH_ALLOW_SIGN_UP`: `false` by default; enable only for an intentional local or isolated evaluation environment.
- `CLOCKED_API_KEY`: server-only Clocked credential. Its presence does not by itself prove the integration works.
- `CLOCKED_BASE_URL`: validated Clocked base URL.
- `CLOCKED_MAX_CONCURRENT_GLOBAL` and `CLOCKED_MAX_ATTEMPTS_GLOBAL_24H`: database-coordinated ceilings for the entire deployed Clocked account.
- `CLOCKED_MAX_CONCURRENT_PER_WORKSPACE` and `CLOCKED_MAX_ATTEMPTS_PER_WORKSPACE_24H`: tenant ceilings that must not exceed the global limits.
- `PRIVATE_STORAGE_*`: reserved and currently unused. No object-storage provider is connected.

All `.env*` files except `.env.example` are ignored. Never prefix credentials with `NEXT_PUBLIC_`. `GET /api/health` reports only process health; it does not claim PostgreSQL or Clocked is healthy.

## Database migrations

Set `DATABASE_URL` only for the intended non-production database, then apply committed forward migrations:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
npm.cmd run db:migrate
Remove-Item Env:DATABASE_URL
```

Use `npm.cmd run db:generate` only after an intentional schema change, review the generated SQL and snapshot, and never edit an applied migration. `npm.cmd run db:check` checks migration consistency. The migration 0000 down script is limited to disposable empty-database verification.

## Tests and quality checks

The local quality gate is:

```powershell
npm.cmd run check
```

It runs strict type checking, linting, unit tests, formatting checks, and the production build. Individual commands are also available:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run format:check
npm.cmd run build
npm.cmd run db:check
```

The integration and browser suites need a PostgreSQL administrative connection capable of creating and dropping uniquely named disposable test databases:

```powershell
$env:TEST_DATABASE_ADMIN_URL = "postgresql://necra_runner_test:PASSWORD@127.0.0.1:5432/postgres"
npm.cmd run test:integration
npm.cmd run test:e2e
Remove-Item Env:TEST_DATABASE_ADMIN_URL
```

The harness rejects non-loopback hosts, ports other than 5432, databases other than the empty `postgres` admin database, missing passwords, and role names outside `necra_*_test`; managed databases are additionally restricted to `necra_test_*`. Never point these commands at production. On Unix with local PostgreSQL tooling, `bash tests/integration/run-schema-tests.sh` runs the database-native migration and invariant suite.

### Opt-in live Clocked verification

The live tests are disabled by default. They passed with fictional evidence on 2026-11-06; future verification still requires deliberate configuration in the local process environment or an approved secret runner—never in source, chat, screenshots, or committed `.env` files:

- `CLOCKED_API_KEY`: an authorized Clocked account API key.
- `CLOCKED_LIVE_TEST=true`: explicit opt-in to requests that can consume credits.
- `TEST_DATABASE_ADMIN_URL`: the disposable PostgreSQL administrative connection described above.

With all three configured, `npm.cmd run test:integration` exercises the real Compare and Verify/Grounding endpoints using fictional evidence persisted in a disposable database. `npm.cmd run test:e2e` exercises the authenticated browser-to-Grounding workflow and verifies persisted results. A configured key is not a pass: both commands must complete successfully, and the redacted observed result must be recorded in `PROGRESS.md` before T008 can be marked complete.

## Current limitations

- There is no verified hosted application, managed database, judge-access process, or production authentication environment.
- Public signup is disabled by default. Email verification, password reset, MFA, invitations, OAuth, and SSO are not implemented.
- Evidence ingestion accepts pasted Unicode text only, up to 256 KiB per version. File storage, extraction, malware scanning, and user deletion are unavailable.
- PostgreSQL row-level security is not enabled; the application server and database operators remain privileged boundaries.
- A production retention/deletion policy, monitoring, backup/restore exercise, and deployment runbook remain outstanding.
- Drizzle Kit's legacy development dependency chain has recorded moderate audit findings; see [PROGRESS.md](PROGRESS.md) for the exact result and mitigation.

## Competition submission checklist

Unchecked items are blockers or remain unverified. This list does not invent competition rules; the competition name, official rules, and deadline have not been provided in the repository.

- [ ] Official competition and eligibility requirements verified from the organizer's source.
- [ ] Official submission fields, repository rules, judging access requirements, and deadline verified.
- [ ] GitHub repository confirmed public and reviewed for secrets and confidential files. A remote exists, but public accessibility has not been verified.
- [x] Local commit history exists and completed-task commits match the recorded task sequence; no remote publication was performed during this review.
- [ ] Working deployment using isolated non-production data.
- [ ] Real judge account/access instructions tested exactly as they will be distributed.
- [x] Real authenticated Clocked integration verified end to end with fictional, non-sensitive evidence for the narrow recorded T008 path.
- [x] Complete Agreement Reality Check and explicit decision workflow verified end to end with controlled, visibly test-only persisted evidence; per-finding correction/dismissal remains deferred.
- [x] Decision Replay verified using genuine persisted records only.
- [x] Evidence versioning, hashing, immutability, tenant isolation, and authorization were tested locally against real PostgreSQL.
- [x] Responsive, keyboard, and automated accessibility checks passed for the completed screens; manual full-workflow screen-reader review remains outstanding.
- [ ] Demo video recorded from a verified evaluation environment.
- [x] README explains the product, verified workflow, setup, and current limitations without claiming production readiness.
- [x] Known limitations and blockers are documented.
- [ ] Final submission reviewed and confirmed before the official deadline.

## Before changing the repository

Read [AGENTS.md](AGENTS.md) and the six documents it references in order. They define the product's evidence rules, security boundaries, task order, and verified state.
