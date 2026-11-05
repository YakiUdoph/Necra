# Necra Progress

## Current state

Phase 0 governance and T001–T007 are complete. The repository now contains a strict TypeScript Next.js application, an accessible responsive product shell, real PostgreSQL-backed authentication, default-deny project authorization, immutable text evidence, a reviewed Clocked contract, and authorized durable Agreement Reality Check creation. Clocked is not integrated.

Authenticated users can deliberately create a private workspace/project, but signup alone grants no access to an existing workspace. Exact pasted agreement and later-instruction text can be saved, retrieved, and revised without overwriting history. Owners/collaborators can confirm exact ready versions and create an idempotent check that remains visible after reload. File ingestion/extraction, Clocked calls, automated findings, the explicit decision workflow, and Decision Replay remain unimplemented. Evidence and check creation never create approval.

## Implemented functionality

- Next.js App Router shell that explains Necra without presenting future features as operational.
- Accessible semantic navigation, skip link, visible focus treatment, responsive layouts, reduced-motion handling, and 44px minimum interactive targets.
- Agreement Reality Check version selection, exact hash/version confirmation, durable created-status list, and honest Clocked-not-connected notice; Decision Replay remains planned.
- Route-level loading and recoverable error states.
- `GET /api/health`, returning only `{"status":"ok","service":"necra-web"}` with `Cache-Control: no-store`; it does not diagnose or claim external service connectivity.
- Server-only Zod validation boundaries for required authentication settings and optional private storage/Clocked settings.
- Tailwind CSS 4 CSS-first configuration backed by the design tokens in `DESIGN.md`.
- Biome linting/formatting, strict TypeScript checking, Vitest unit testing, production build scripts, and a pinned npm lockfile.
- Test-only fixture directory isolated under `tests/fixtures/`.
- Drizzle-typed PostgreSQL records for users/authenticated identities, workspaces, projects and memberships, source documents and immutable versions, change requests, analysis runs, findings/evidence references, append-only reviews/decisions, and append-only audit events.
- Version-controlled initial migration with composite tenant/project foreign keys, uniqueness/check constraints, indexes, immutable-input protections, append-only triggers, source-kind checks, and citation-to-analysis-input checks.
- Disposable-database Vitest integration suite plus a database-native `psql` suite. Test data is explicitly test-only and does not load through production code.
- Better Auth credential signup/sign-in, database-backed opaque sessions, logout/revocation, eight-hour expiry, secure production cookies, explicit CSRF/origin checks, and atomic mapping to authenticated audit identities.
- Production environment validation rejects a configured `BETTER_AUTH_URL` that does not use HTTPS.
- Server-verified project lists/details and direct APIs that join active workspace and project membership, return non-disclosing not-found responses, and never accept the actor from the client.
- Owner/collaborator/viewer policy mapped to the persisted manager/reviewer/participant roles, with explicit `can_decide`, audited role changes, and last-owner protection.
- Accessible responsive sign-in, optional sign-up, sign-out, project creation, authorized project, evidence-entry, and immutable-history views. Future comparison/approval features remain honestly labeled unimplemented.
- Playwright coverage through installed Chrome for login, logout, expiry, invalid sessions, direct API denial, cross-project access, membership revocation, and spoof attempts.
- Authenticated desktop and mobile product navigation organized around Projects, Agreements, Changes, Agreement Reality Check, and Decisions & Replay, with real server-authorized context and honest unavailable states.
- Reusable page header, status, notice, empty-state, button, field, comparison-empty, loading, and error patterns with visible focus, text-plus-color status communication, 44px targets, and reduced-motion handling.
- Automated axe coverage on authentication and authorized project screens plus responsive/keyboard browser checks. No production-facing fixture content or nonfunctional action controls were added.
- Authenticated project creation that transactionally creates a private workspace, active owner memberships, the project, and a human-origin audit event without granting decision authority.
- Text-only agreement and later-instruction ingestion with strict JSON/Unicode/size validation, optional known provenance, exact non-normalized content, server-calculated SHA-256, server-generated identifiers/version numbers/timestamps, project-scoped retry keys, and audit metadata that excludes source content.
- PostgreSQL-private source storage, transaction/advisory-lock concurrency control, immutable source/version triggers, authorized reads/writes, expandable exact-content history, and revisions that always append a new version.
- Reviewed Clocked Compare and Verify/Grounding text contracts with strict Zod request/response schemas, official recorded-response contract fixtures, Unicode code-point/UTF-16 offset conversion helpers, and a provider note that separates documented behavior, live unauthenticated observations, and unresolved privacy/operational terms.
- Authorized Reality Check creation from exact ready agreement/instruction versions with strict input rejection, project-scoped idempotency, concurrency serialization, automatic change-request linkage, human-origin audit metadata, and non-disclosing tenant/role denial.
- Forward migration 0003 with immutable document/version/hash snapshots, stable provider idempotency UUID and Grounding payload hash, queued/processing/failure/reconciliation timestamps, four-attempt bound, optimistic lifecycle revisions, legal database transitions, and a completion guard requiring validated real provider metadata.
- Server-only worker transition service for start, unknown outcome, safe failure, and bounded retry. No browser route processes work, no Clocked request is sent, and no fake finding/result exists.

## Development stack verified on 2026-10-27

- Node.js 24.18.0 LTS; npm 11.16.0; Corepack 0.35.0.
- Next.js 16.4.3; React and React DOM 19.3.1; TypeScript 7.0.2.
- Tailwind CSS and `@tailwindcss/postcss` 4.3.3; PostCSS 8.5.31.
- Biome 2.6.3; Vitest 5.0.5; Zod 4.6.7; `server-only` 0.0.1.
- Drizzle ORM 0.45.4; Drizzle Kit 0.31.11; `pg` and `@types/pg` 8.23.1.
- Better Auth and its Drizzle adapter 1.7.15; Playwright Test 1.64.1.
- Git 2.47.1.windows.1 with repository-level tooling available. No commit or remote operation was performed.

The initial partial scaffold selected ESLint 10 and `eslint-config-next` 16.4.3. npm reported incompatible peer ranges in the Next lint plugin chain, including TypeScript support below 6.1. The final foundation uses the current Next.js-supported Biome path instead and `npm ls --depth=0` reports the intended direct dependency set without an invalid-package error.

## Files created or modified for T001

- Application: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/styles.css`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/api/health/route.ts`.
- Server configuration: `src/server/env.ts`, `src/server/env-schema.ts`, `.env.example`.
- Tests: `tests/unit/env-schema.test.ts`, `tests/unit/health-route.test.ts`, `tests/fixtures/README.md`, `vitest.config.mts`.
- Tooling: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `biome.json`, `.gitignore`, `.nvmrc`.
- Documentation: `README.md`, `ARCHITECTURE.md`, `docs/decisions/0001-development-foundation.md`, `TASKS.md`, `PROGRESS.md`.
- Replaced the partial scaffold's `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, and `vitest.config.ts` with the compatible Biome configuration and ESM Vitest configuration described above.

## Files created or modified for T002

- Persistence: `src/server/db/schema.ts`, `src/server/db/client.ts`, `drizzle.config.ts`, `drizzle.migrate.config.ts`.
- Migration: `migrations/0000_lovely_marvel_apes.sql`, Drizzle journal/snapshot under `migrations/meta/`, and disposable-test-only rollback `migrations/rollback/0000_lovely_marvel_apes.down.sql`.
- Tests: `tests/integration/schema.test.ts`, `tests/integration/schema.sql`, `tests/integration/run-schema-tests.sh`, `vitest.integration.config.mts`.
- Tooling/dependencies: `package.json`, `package-lock.json`, `.env.example`.
- Documentation: `README.md`, `ARCHITECTURE.md`, `docs/decisions/0002-postgresql-drizzle-persistence.md`, `TASKS.md`, `PROGRESS.md`.

## Files created or modified for T003

- Authentication: `src/server/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, sign-in/sign-up/sign-out components and routes, and `proxy.ts`.
- Authorization: `src/server/authorization/`, protected project pages, project read API, and audited membership-change API.
- Persistence: Better Auth tables/user fields in `src/server/db/schema.ts`; migration `migrations/0001_omniscient_black_widow.sql` and its Drizzle snapshot.
- Tests: policy/environment/CSRF unit tests, `tests/integration/auth-authorization.test.ts`, and `tests/e2e/` with Playwright configuration.
- Documentation: `README.md`, `ARCHITECTURE.md`, `docs/decisions/0003-better-auth-and-project-authorization.md`, `TASKS.md`, and `PROGRESS.md`.

## Files created or modified for T004

- Product interface: `src/components/product/app-shell.tsx`, `src/components/product/comparison-empty.tsx`, `src/components/ui/primitives.tsx`, `src/app/projects/page.tsx`, `src/app/projects/[projectId]/page.tsx`, and `src/app/styles.css`.
- Authentication and state presentation: `src/components/auth/sign-in-form.tsx`, `src/components/auth/sign-up-form.tsx`, `src/components/auth/sign-out-button.tsx`, `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx`, `src/app/loading.tsx`, and `src/app/error.tsx`.
- Verification: `tests/unit/ui-primitives.test.tsx`, `tests/e2e/authentication.spec.ts`, `package.json`, and `package-lock.json`.
- Documentation: `DESIGN.md`, `README.md`, `TASKS.md`, and `PROGRESS.md`.

## Files created or modified for T005

- Evidence and project services: `src/server/evidence/validation.ts`, `src/server/evidence/evidence-service.ts`, `src/server/http/bounded-json.ts`, and `src/server/projects/project-service.ts`.
- Protected routes and interface: `src/app/api/projects/route.ts`, project-scoped evidence routes, project/evidence forms and history components, project pages, and evidence styles.
- Persistence: T005 fields and constraints in `src/server/db/schema.ts`; migration `migrations/0002_dapper_masked_marvel.sql`, its Drizzle snapshot/journal entry, and a source-identity immutability trigger.
- Verification: evidence/bounded-JSON unit tests, real PostgreSQL evidence integration tests, expanded authentication/authorization coverage, and the installed-Chrome disposable-database workflow.
- Documentation: `docs/decisions/0004-text-evidence-ingestion.md`, `ARCHITECTURE.md`, `DESIGN.md`, `README.md`, `TASKS.md`, and `PROGRESS.md`.

## T005 verification actually executed on 2026-11-05

- `npm.cmd run check`: the final run passed strict typecheck, Biome lint over 87 files, 7 unit files/32 tests, formatting, and the Next.js 16.4.3 production build for all routes.
- `npm.cmd run db:check`: the sandboxed run failed with the previously observed Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`.
- `npm.cmd run test:integration`: the first attempt found a stale test-only database/role, failed PostgreSQL authentication, and skipped all 13 then-defined tests. Only `necra_test_t005_e2e` and its test role were removed. A clean rerun passed 3 files/13 tests. After adding an explicit invalid-input/no-persistence assertion, the final real PostgreSQL run passed 3 files/14 tests in 11.63 seconds and removed its disposable databases/role.
- PostgreSQL coverage includes migration apply from empty state; project-scoped agreement/instruction creation and retrieval; trusted exact-content hashes; provenance; idempotent retries and conflicting-key rejection; concurrent revision numbering; historical preservation; database-trigger immutability; invalid-input rejection with no inserted source; cross-project/viewer/revoked-membership denial; and safe database-unavailable failure.
- `npm.cmd run test:e2e`: the first installed-Chrome attempt failed before signup when WSL shut down during browser startup and PostgreSQL became unreachable; it was not treated as a pass. The clean rerun kept the local test service active and passed 1 Chromium test in 1.1 minutes (51.9-second test body), then removed the disposable database and role.
- Browser coverage includes real signup/sign-in, in-app private project creation, agreement and later-instruction entry, immutable revision creation, persisted history after reload, authenticated API reads, forged-origin and actor-spoof denial, cross-project denial, revoked-membership denial, session expiry, logout, invalid cookies, WCAG-tagged axe scans, keyboard operation, and 390px overflow review.
- `.next/static` contained none of the test secret/password values or `DATABASE_URL`, `PRIVATE_STORAGE_SECRET_ACCESS_KEY`, and `CLOCKED_API_KEY` markers. `git diff --check` passed apart from informational LF-to-CRLF working-tree warnings.
- `npm.cmd audit --omit=dev`: the sandboxed registry request failed. The approved registry run reported four moderate findings in Drizzle Kit's legacy `@esbuild-kit`/esbuild development chain and proposed an incompatible forced downgrade to Drizzle Kit 0.18.1; no forced fix was applied.
- No PDF, DOCX, image, OCR, object-storage, download, archive, or malware-scanning path exists, so safe-file/extraction checks are not applicable to T005's pasted-text-only boundary.

## Files created or modified for T006

- Contract specification: `docs/providers/clocked-contract.md` and the Clocked section of `ARCHITECTURE.md`.
- Internal contract: `src/server/integrations/clocked/contract.ts`, containing text-only request/response schemas and offset conversion helpers but no HTTP client or credential access.
- Test-only official documentation captures: `tests/fixtures/clocked/` and `tests/unit/clocked-contract.test.ts`.
- Status documentation: `README.md`, `TASKS.md`, and `PROGRESS.md`.

## Files created or modified for T007

- Analysis domain/API: `src/server/analysis/` and `src/app/api/projects/[projectId]/checks/route.ts`.
- Interface: `src/components/analysis/` and the authorized project page.
- Persistence: `src/server/db/schema.ts`, forward migration `0003_fancy_kingpin.sql`, and its Drizzle metadata.
- Verification: analysis state/mapping unit tests, real PostgreSQL creation/authorization/concurrency/lifecycle tests, and the expanded authenticated Chromium workflow.
- Documentation: `README.md`, `ARCHITECTURE.md`, `docs/providers/clocked-contract.md`, `TASKS.md`, and `PROGRESS.md`.

## T007 verification actually executed on 2026-11-05

- The first integration command without `TEST_DATABASE_ADMIN_URL` failed before running tests and was not counted. The first configured PostgreSQL run then exposed a non-portable migration backfill dependency on `pgcrypto.digest`; no application test ran in affected suites. The backfill was changed to use built-in PostgreSQL functions only.
- The clean real PostgreSQL rerun passed 4 files/19 tests. Coverage includes exact snapshot/hash persistence, sequential and concurrent idempotency, conflicting-key rejection, missing/cross-project/wrong-kind/inactive/read-only denial, unsupported input, audit linkage, immutable inputs, legal lifecycle transitions, unknown-outcome reconciliation, stale-worker protection, bounded retry metadata, and refusal to complete without validated provider metadata.
- `npm.cmd run test:e2e` passed 1 installed-Chromium test in 1.3 minutes against a disposable database. It created exact evidence versions, selected and confirmed them, created a Reality Check, observed the honest Clocked-not-connected/no-approval status after reload, and repeated unauthenticated, cross-project, forged-origin, revoked-membership, accessibility, keyboard, and responsive checks.
- Final audit rerun: `npm.cmd run check` passed strict typecheck, Biome lint/format over 103 files, 9 unit files/39 tests, and the Next.js 16.4.3 production build. The sandboxed `npm.cmd run db:check` hit the known Windows `uv_os_get_passwd ... ENOMEM`; its approved unrestricted rerun passed with `Everything's fine`.
- Final audit database setup attempts without `TEST_DATABASE_ADMIN_URL`, through unstable WSL localhost forwarding, and without a persistent WSL process failed or skipped tests and were not counted. With WSL kept active and a short-lived test-only role, `npm.cmd run test:integration` passed all 4 files/19 tests in 33.49 seconds; the role was removed afterward.
- The first final-audit browser run failed during the pre-authentication axe scan because navigation destroyed its execution context and was not counted. A fresh disposable-database rerun passed the single installed-Chromium workflow in 1.5 minutes; the test role was removed afterward.
- Tracked private-key/cloud-token pattern scanning found no matches. `.next/static` contained no configured secret values, database/storage/Clocked markers, or browser-test credentials; Better Auth vendor code still contains literal `BETTER_AUTH_SECRET` and `AUTH_SECRET` identifiers, not environment values. `git diff --check` reported only informational LF-to-CRLF working-tree warnings.
- No Clocked credential was read and no provider request was sent. No fake response or finding was persisted.

## T006 verification actually executed on 2026-11-05

- Reviewed the official Compare, Grounding, Authentication, Responses/source-position, Errors/retries, Limits/usage, Security/data-handling, security overview, and Pricing pages. The normal browsing service could not access or index the site; approved direct read-only HTTPS retrieval succeeded. Sources and access date are recorded in the provider note.
- Confirmed from official documentation: HTTPS base URL; Bearer account-key authentication; required JSON and UUID idempotency headers; Compare/Grounding methods, paths, text request/response fields, defaults and limits; code-point offsets; error categories; 110-second gateway allowance; bounded retry rules; plan concurrency; credit/cost headers; and documented response/data retention behavior.
- No `CLOCKED_API_KEY` was configured. No authenticated inference, success response, model latency, credit debit, cost, accuracy, or application integration was observed.
- Credential-free cURL POSTs with fictional text and UUID request keys observed live HTTP 401 responses: Compare returned `{"error":"Use a Clocked account API key."}` in 1.481014 seconds; Grounding returned the same body in 0.950096 seconds. Neither returned model/credit/cost values. These are transport observations, not playground or Necra integration tests.
- `npm.cmd run check`: the first run passed typecheck, lint, and 8 unit files/36 tests, then failed only because Biome required formatting in the new provider note and contract type aliases. `npm.cmd run format` changed those two files. The final full run passed typecheck, lint over 93 files, 8 unit files/36 tests, format check, and the Next.js 16.4.3 production build.
- Contract tests validated Clocked's two complete official recorded text responses as explicitly labeled test-only fixtures, enforced documented text request boundaries, and verified Unicode code-point slicing/conversion for an astral character. Fixtures are never runtime fallbacks or represented as Necra responses.

## T004 verification actually executed on 2026-11-03

- `npm.cmd run check`: passed before final documentation. The first post-documentation run passed typecheck, lint, and 5 unit files/19 tests, then failed because Biome required multiline formatting for one JSX span. After applying that exact formatting, the complete final run passed strict typecheck, Biome lint, 5 unit files/19 tests, formatting, and the Next.js 16.4.3 production build for all routes.
- Local preview and browser inspection: `/` returned HTTP 200 with HTML. Installed Chrome reported zero horizontal overflow at 320, 390, 768, and 1280 CSS pixels; the skip link received first keyboard focus. A 390px full-page screenshot was inspected locally and was not adopted as a visual-regression baseline.
- Ad-hoc WCAG-tagged axe scan of the 390px public shell: the first harness invocation failed because the page was not created from an explicit Playwright browser context. The corrected invocation passed with zero violations.
- Contrast calculation for the corrected unavailable-navigation text against its surface measured 4.963:1. Status and interactive-state colors remain paired with text or another non-color cue.
- `npm.cmd run test:e2e`: the final run passed 1 installed-Chrome test in 1.2 minutes against migrations applied to the disposable `necra_test_t003_e2e` database. It covered real signup/sign-in, authorized project presentation, axe scans, keyboard/mobile navigation, 390px overflow, cross-project/actor-spoof/forged-origin denial, membership revocation, session expiry, keyboard sign-out, logout invalidation, and invalid cookies. The ephemeral database and `necra_t004_runner` role were removed afterward.
- Static `.next/static` scan found none of the browser-test secret/email values or the `DATABASE_URL`, `PRIVATE_STORAGE_SECRET_ACCESS_KEY`, and `CLOCKED_API_KEY` markers. Better Auth's vendor client code still contains the literal `BETTER_AUTH_SECRET` identifier, as previously documented, but no configured secret value.
- Browser-suite setup failures were retained rather than reported as passes: two attempts used PowerShell APIs unavailable on this host; two found the local preview still occupying port 3000; one lost WSL localhost forwarding during migration; and one complete browser attempt hit a Next.js development-overlay pointer interception at final sign-out. Keeping WSL active and testing keyboard activation produced the final passing run.

## Verification actually executed on 2026-10-27

- `node --version`, `npm.cmd --version`, `corepack --version`, `git --version`: reported the versions listed above.
- `npm.cmd ci`: clean install from `package-lock.json` passed; 80 packages installed, 81 audited, zero vulnerabilities reported by npm. The first sandboxed attempt produced no useful output and was interrupted; the approved network/filesystem run passed.
- `npm.cmd run check`: passed after the clean install.
  - `npm run typecheck`: passed with no TypeScript errors.
  - `npm run lint`: passed; Biome checked 26 files with no fixes or warnings.
  - `npm run test`: passed 2 files and 5 tests.
  - `npm run format:check`: passed; Biome checked 26 files with no fixes.
  - `npm run build`: passed with Next.js 16.4.3; `/` prerendered statically and `/api/health` built as a dynamic route.
- `npm.cmd run dev`: started successfully at `http://localhost:3000` and reported ready in 1742ms.
- Local HTTP smoke checks with `curl.exe`: `/` returned HTTP 200 and `text/html; charset=utf-8`; `/api/health` returned HTTP 200, `Cache-Control: no-store`, and the expected minimal JSON body. Dev logs recorded both successful requests.
- Browser-static secret marker scan with `rg`: no occurrence of `DATABASE_URL`, `AUTH_SECRET`, `PRIVATE_STORAGE_SECRET_ACCESS_KEY`, `CLOCKED_API_KEY`, or test-only credential values was found under `.next/static`.
- React/component review: the shell keeps static work in Server Components, limits client code to the required error boundary, uses stable list keys and semantic landmarks, and introduces no client data waterfall or external request.

## T002 verification actually executed on 2026-11-02

- `npm view` registry checks reported current pinned versions: Drizzle ORM 0.45.4, Drizzle Kit 0.31.11, `pg` 8.23.1, and `@types/pg` 8.23.1.
- `npm run db:generate`: generated the initial migration and Drizzle snapshot from the typed schema. The sandboxed invocation failed with `uv_os_get_passwd ... ENOMEM`; the approved unrestricted invocation passed.
- `npm run db:check`: passed with “Everything's fine”; the sandboxed invocation had the same user-lookup failure and the approved unrestricted invocation passed.
- `npm run check`: passed after final implementation and documentation changes.
  - `npm run typecheck`: passed with no TypeScript errors.
  - `npm run lint`: passed; Biome checked 35 files with no fixes required.
  - `npm run test`: passed 2 files and 5 unit tests.
  - `npm run format:check`: passed; Biome checked 35 files with no fixes required.
  - `npm run build`: passed; Next.js compiled, typechecked, prerendered `/`, and built dynamic `/api/health`.
- A separate final `npm run build` also passed and printed the complete route summary.
- `tests/integration/run-schema-tests.sh` against PostgreSQL 14.24 in Ubuntu WSL: passed. It created a uniquely prefixed disposable database, applied migration 0000 from empty state, exercised eight invariant groups, applied the rollback, verified zero remaining public tables, and dropped the database.
- Covered database behaviors: invalid foreign keys, duplicate memberships, tenant/project separation, citations limited to exact analysis inputs, valid missing-evidence references without invented quotes, immutable document versions and analysis inputs, required authenticated decision actors, invalid decision references, one linear append-only decision history, audit persistence/append-only behavior, and source revisions as new versions.
- `npm audit --omit=dev`: passed with zero runtime vulnerabilities. Full `npm audit` reported four moderate development-only findings inherited through Drizzle Kit's deprecated `@esbuild-kit`/esbuild dependency; npm's proposed fix is a breaking forced downgrade to Drizzle Kit 0.18.1 and was not applied.
- A Windows Vitest database run failed first with `ECONNREFUSED 127.0.0.1:5432`, then a sandboxed WSL-address attempt failed with `EACCES`, and the unrestricted WSL-address attempt failed with `ECONNREFUSED` because host TCP policy blocks Windows-to-WSL PostgreSQL. These failures were not recorded as passing. The same migration/invariant/rollback behavior was then verified successfully through PostgreSQL's local WSL socket using the database-native suite.

## T003 verification actually executed on 2026-11-02

- Official Next.js and Better Auth documentation was reviewed before selecting Better Auth 1.7.15. Its adapter peer range supports Drizzle 0.45.4, so T002's persistence layer was retained.
- `npm run db:generate`: generated migration 0001 and its snapshot. Two sandboxed attempts failed with `uv_os_get_passwd ... ENOMEM`; the approved unrestricted run passed.
- `npm run db:check`: passed with “Everything's fine.” The sandboxed attempt had the same Windows user-lookup failure; the unrestricted run passed.
- `npm run test:integration` against PostgreSQL 14.24 in Ubuntu WSL through localhost forwarding: passed 2 files and 9 tests. The suite applied migrations 0000 and 0001 to disposable databases and drove Better Auth's real HTTP handler and Drizzle authorization queries.
- Integration coverage passed for unauthenticated/invalid/expired sessions, credential signup/sign-in, CSRF rejection, stable identity mapping, cross-project denial, viewer restrictions, explicit `can_decide`, suspended membership, vertical escalation denial, audited role changes, logout revocation, and all eight T002 schema groups.
- The first sandboxed driver run failed with `EACCES`. Direct access to the WSL address still failed with `ECONNREFUSED`. After PostgreSQL was temporarily configured for the dedicated test role, WSL was kept active, and Windows used WSL localhost forwarding, the application-to-PostgreSQL driver tests passed. No hosted or production database connection is claimed.
- `npm run test:e2e`: passed 1 Chromium test using installed Chrome and a disposable PostgreSQL database. It exercised browser signup/sign-in, valid protected access, unauthenticated direct API access, cross-project and spoof attempts, revoked membership, forged mutation origin, expiry, logout invalidation, and invalid cookies. An initial run failed because the Playwright/Next origins differed; the origins were corrected and the final run passed.
- Playwright's managed-browser download failed because `cdn.playwright.dev` could not resolve. The suite uses the installed system Chrome channel instead; this fallback passed.
- `npm audit --omit=dev` and full `npm audit` reported four moderate findings in Drizzle Kit's legacy esbuild toolchain. Better Auth declares Drizzle Kit as an optional peer, so npm includes the existing toolchain in the production dependency graph even though Necra does not import or expose it at runtime. npm's proposed forced fix downgrades Drizzle Kit incompatibly and was not applied.
- Final typecheck, lint, unit tests, formatting check, production build, repeat browser run after teardown hardening, and static secret scan are recorded below after execution.

## T003 re-verification actually executed on 2026-11-02

- Re-read all seven governance documents in order, inspected T002's typed schema, migrations, composite tenant constraints, immutable/append-only triggers, driver tests, and database-native tests, then compared the implementation with T003's acceptance criteria.
- Rechecked current official Next.js authentication/proxy guidance and Better Auth Next.js, Drizzle, session, and security guidance. Better Auth remains a maintained, compatible choice that keeps credential hashing and session handling out of Necra code while using the existing PostgreSQL/Drizzle architecture.
- `npm.cmd run check`: passed after one corrected test-expectation failure. Typecheck and lint passed; 4 unit files and 14 tests passed; formatting passed; the Next.js 16.4.3 production build passed for all routes.
- The final repeat of `npm.cmd run check` also passed after Biome was configured to ignore Git-ignored Playwright output. A preceding `npm.cmd run format:check` failed only because it scanned generated `test-results/.last-run.json`; no production source was reformatted to hide the failure.
- `npm.cmd run db:check`: the sandboxed run failed with the documented `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`.
- `tests/integration/run-schema-tests.sh` through WSL PostgreSQL 14: the first two invocations failed because the selected WSL operating-system users had no matching PostgreSQL roles. The run under PostgreSQL's local service account passed migration apply, T002 invariants, rollback, and cleanup in a uniquely named disposable database.
- `npm.cmd run test:integration`: passed 2 files and 9 tests against real PostgreSQL over the Windows application/driver path. A short-lived local test role and credential were removed after the run. The wrapper's first random-byte API call failed and left a test-only zeroed byte buffer; the credential was still ephemeral, and later browser runs used the corrected cryptographic generator API.
- `npm.cmd run test:e2e`: an initial attempt correctly failed because a stale test-only database was owned by an earlier test role; only the verified `necra_test_t003_e2e` database was removed. The first clean rerun hit a transient Next.js development-stream error during sign-in. A second fresh disposable-database run passed 1 Chromium test in 57.8 seconds, including real signup/sign-in, valid access, unauthenticated/invalid/expired direct API denial, cross-project and actor-spoof denial, revoked membership, forged origin, logout invalidation, and invalid-cookie protected-page denial. The temporary role and database were removed.
- Static review confirmed protected pages and direct routes resolve the actor from Better Auth's verified database session, join active workspace and project memberships, return non-disclosing misses, and require explicit `can_decide` for eligible owner/collaborator roles. No T002 immutable evidence or audit constraint was weakened.
- `npm.cmd view better-auth version` and `npm.cmd view @better-auth/drizzle-adapter version` both reported 1.7.15. A value-based scan found none of the test credential values in `.next/static`. A broader preliminary scan did find Better Auth's literal `BETTER_AUTH_SECRET` identifier in vendor client code; it did not contain the environment value.
- `npm.cmd audit --omit=dev`: the sandboxed advisory request failed; the approved registry run reported four moderate findings in Drizzle Kit's legacy esbuild development chain and proposed an incompatible forced downgrade. No forced fix was applied.

An early `npm.cmd run format` attempt failed because Biome's Tailwind directive parser was not enabled and an old lint preset field was deprecated. The configuration was migrated, Tailwind parsing was enabled, and the recorded final checks passed. During the dev smoke test, Next.js attempted to append generated agent guidance to `AGENTS.md`; `agentRules: false` was set and the project governance file was restored.

## Security decisions

- Credential-bearing names have no `NEXT_PUBLIC_` prefix and are read only by `src/server/env.ts`, which imports `server-only`.
- `.env.example` contains placeholders only. All other `.env*` files are ignored.
- External settings remain optional because their services are not used in T001; the application neither probes nor claims them as connected.
- The health endpoint reveals no credentials, dependency status, host details, timestamps, or source data.
- Basic response headers disable MIME sniffing, restrict referrer detail, and deny camera, microphone, and geolocation permissions.
- No production data, fabricated evidence, fictional activity, provider response, approval, finding, review, or decision is present.
- Project-owned relationships use composite project/workspace foreign keys; IDs alone cannot create cross-tenant references.
- Historical evidence, findings, evidence references, reviews, decisions, and audit records use restrictive foreign keys and database triggers rather than client conventions for immutability/append-only behavior.
- Decision rows require both a user and matching authenticated identity. Messages, uploads, statuses, findings, and analysis completion have no path or trigger that creates a decision.
- Database audit records are explicitly not described as tamper-proof; privileged database operators can bypass application-level protections.
- Better Auth owns password hashing and credential verification; Necra stores no custom password algorithm and never fabricates a session.
- Sessions remain database-backed with cookie caching disabled, so expiry/revocation is checked against PostgreSQL on each verified request. Production cookies are secure, HTTP-only, and same-site through Better Auth.
- Authentication and authorization are separate: an account has no project access until both workspace and project memberships are active. The verified session is the only actor source.
- Protected reads join tenant/resource membership in the query. Cross-project, suspended, and underprivileged records share a not-found response after authentication.
- Better Auth origin/CSRF checks are explicitly enabled even in tests. Necra mutation APIs additionally require the exact configured origin and reject cross-site Fetch Metadata.
- Membership role/status/decision-authority changes and their human audit event commit atomically. The last active owner cannot be removed.
- Pasted-text evidence is private PostgreSQL data. Every read and write resolves the verified session, active workspace/project memberships, and project permission on the server; direct-object misses do not disclose protected existence.
- Evidence requests reject unknown fields, unsupported formats, malformed JSON/UTF-8, null bytes, unpaired surrogates, whitespace-only content, and content over 256 KiB. The server ignores client hash/version authority by not accepting those fields.
- Exact evidence text is absent from audit metadata and routine application logs. React renders stored text as escaped text, and no public evidence/download endpoint exists.

## Known issues and unverified assumptions

- Automated axe coverage now exercises authentication and authorized project screens. A visual-regression baseline was not adopted, and manual screen-reader testing remains outstanding for the complete product workflows in later tasks.
- Object storage, file extraction/OCR, durable queue infrastructure, observability, hosting/database vendor, regions, and retention/deletion policy remain undecided. T005–T007 deliberately need none of those providers for persisted text and queued records.
- Email verification, password reset, MFA, invitations, OAuth/SSO, administrator provisioning UI, and distributed authentication rate limiting are not implemented. Public signup remains disabled by default.
- `PRIVATE_STORAGE_*` remains an inert boundary placeholder, not a provider commitment.
- Clocked's playground has produced real Compare and Verify responses. T006 separately established documented text schemas and credential-free 401 transport observations, but Necra still has no HTTP adapter, configured credential, authenticated success, observed credit use, or end-to-end result. Working integration remains unverified pending T008.
- T005 supports only pasted Unicode text, limited to 256 KiB per version and 300 KiB per JSON request. PDF, DOCX, images, OCR, file upload, object storage, malware scanning, downloads, and user deletion remain unsupported; the initial decision vocabulary remains undecided.
- Git has the truthful T004 baseline commit `1d24d0b`, audited T005 commit `72ccd27`, and audited T006 commit `a173788`. T007 changes remain uncommitted; no remote or publication action was performed.
- Database constraints do not authorize reads by themselves. T003 server queries now enforce active membership/role/`can_decide`; T010 must repeat that check inside the future decision transaction.
- Evidence references enforce correct version association and offset shape. T005 now preserves exact text, but the future citation-write service must still verify quote/offset equality before insertion.
- T005 calculates SHA-256 server-side over exact, non-normalized UTF-8 content. The hash establishes content identity/integrity only, not the truth of the source. Uploaded original-byte preservation remains deferred because uploads are unsupported.
- Drizzle Kit's legacy dependency chain has four moderate npm audit findings. Better Auth's optional peer causes npm to include that toolchain in the production audit graph even though application runtime code does not import it. Do not expose Drizzle development tooling or Studio to untrusted networks; reassess on a compatible upstream fix.
- PostgreSQL row-level security is not enabled; the application server and database operators remain privileged boundaries.
- No durable worker/queue is selected. T007 persists guarded `pending` work and exposes server-only transition functions; T008 must attach server-side execution rather than treating the browser as a worker.
- T007's deterministic Grounding request mapping validates against the official schema but has not been sent with credentials. Success shape, model, latency, credits, cost, and actual replay behavior remain unverified.
- No hosted database or production authentication environment has been configured or verified.
- One clean browser attempt encountered a transient Next.js development-stream error during sign-in; the immediately following fresh-database run passed. This remains a local test-flakiness risk rather than evidence of production readiness.

## Current blockers

- None for T001–T007.
- T008 authenticated live verification requires an authorized `CLOCKED_API_KEY` and fictional non-sensitive test evidence. Sensitive production use additionally requires resolution of processing region, subprocessors, contractual terms/DPA, deletion guarantees, access controls, incident handling, and operational-log retention.

## Next task

T008 — Implement the server-only Clocked adapter against T006's contract and T007's immutable snapshots/idempotency metadata. Authenticated live verification remains gated on an authorized key and fictional non-sensitive evidence.

## Activity log

### 2026-11-05 — T007 completed

- Re-read the seven governance documents, provider note, contract code, schema, authorization/evidence services, tests, and T007 acceptance criteria; confirmed T007 was the first eligible task.
- Audited and committed T006 locally as `a173788` after checking for credentials, confidential/accidental files, and generated artifacts. Nothing was pushed.
- Implemented authorized exact-version selection, immutable document/version/hash snapshots, idempotent creation and change-request linkage, stable future provider key/payload hash, durable guarded lifecycle/reconciliation metadata, bounded server-worker retries, audit metadata, and honest persisted UI status.
- Verified unit, migration consistency, real PostgreSQL transaction/concurrency/authorization behavior, and the authenticated Chromium create/reload workflow. No Clocked call, provider result, finding, or approval was fabricated.
- Result: every T007 acceptance criterion passed. T007 is `Complete`; T008 is the exact next task.

### 2026-11-05 — T006 completed

- Audited and committed the completed T005 work as local commit `72ccd27` after checking staged paths, ignored generated output, credential markers, environment files, and accidental document/archive/database artifacts. Nothing was pushed or published.
- Reviewed nine official Clocked pages and recorded the documented text-mode Compare and Verify/Grounding contracts, authentication, idempotency, errors, timeouts, retries, limits, usage headers, offset semantics, and data handling without inventing undocumented behavior.
- Added strict internal contract schemas, test-only captures of Clocked's explicitly recorded documentation responses, and code-point-to-UTF-16 helpers. No HTTP adapter or credential access was added.
- Observed only live unauthenticated 401 behavior because no API key was available. Preserved the distinction between official recorded examples, credential-free transport observations, playground history, and a future authenticated Necra call.
- Result: every T006 acceptance criterion passed. T006 is `Complete`; T007 is the exact next task, and T008 remains gated on T007 plus authorized fictional live-test credentials.

### 2026-11-05 — T005 completed

- Confirmed T005 was the first eligible incomplete task and resolved its prerequisite decisions in ADR 0004 as a narrow pasted-text-only workflow: PostgreSQL-private originals, exact UTF-8 text, 256 KiB versions, no extraction, no file scanning, and restrictive no-delete retention pending a production policy.
- Implemented deliberate private project creation, authenticated agreement/instruction ingestion, exact retrieval, trusted hashes, optional known provenance, project-scoped retry safety, transaction-serialized immutable revisions, audit metadata, and responsive accessible history/error states.
- Verified unit/build quality, migration consistency, 14 real PostgreSQL integration tests, and the complete authenticated installed-Chrome persistence/reload and denial workflow. Failed setup/service attempts remain recorded in the T005 verification section.
- Result: every applicable T005 acceptance criterion passed. T005 is `Complete`; unsupported file/extraction capabilities remain explicit, and T006 was not started.

### 2026-11-03 — T004 completed

- Confirmed T004 was the first eligible incomplete task, preserved T003 session and authorization boundaries, and completed the existing partial interface foundation without starting evidence ingestion or provider work.
- Implemented the workflow-oriented responsive shell and reusable accessible primitives, corrected narrow-screen public navigation and unavailable-state contrast, and kept all future actions visibly unavailable instead of simulating success.
- Verified unit, accessibility, keyboard, responsive, production-build, real-session, and authorization behavior with installed Chrome and disposable test-only PostgreSQL data.
- Result: every T004 acceptance criterion passed. T004 is `Complete`; T005 was not started and still requires its named product/infrastructure decisions.

### 2026-11-02 — T003 re-audited

- Verified T003 against the actual T002 schema and current official authentication guidance instead of relying on the prior completion report.
- Added fail-fast production HTTPS validation and direct-API regression coverage for invalid and expired sessions.
- Re-ran unit, lint, format, build, Drizzle migration consistency, database-native constraints, real PostgreSQL driver integration, and browser authentication/authorization checks. Final runs passed; failed attempts remain recorded above.
- Result: T003 remains `Complete`; T004 was not started.

### 2026-11-02 — T003 completed

- Re-read the seven governance documents, inspected T002's actual schema, migration, tests, and constraints, and confirmed T003 was the first eligible incomplete task.
- Selected Better Auth, recorded ADR 0003, added forward migration 0001, implemented real credential sessions and server-scoped authorization, and preserved all T002 immutability/audit constraints.
- Verified the application through unit, real PostgreSQL driver, direct API, and browser flows with test-only data in disposable databases.
- Result: every T003 acceptance criterion passed. T003 is `Complete`; T004 was not started.

### 2026-11-02 — T002 completed

- Re-read the governing documents in order, inspected the actual T001 scaffold/dependencies, and confirmed T002 was the first eligible incomplete task.
- Recorded ADR 0002; selected one ORM/query layer (Drizzle) with PostgreSQL and no competing ORM.
- Implemented the typed schema, initial migration, database-only integrity triggers, migration policy, local instructions, and both driver-based and database-native integration suites.
- Verified migration apply/invariants/rollback on real PostgreSQL 14.24 with test-only data in a disposable database. No live hosted database connection is claimed.
- Result: every T002 acceptance criterion passed. T002 is `Complete`; T003 was not started.

### 2026-10-27 — T001 completed

- Reviewed all seven governing documents in the required order and found the signature workflows already present and consistent. Corrected one stale competition reference in the T001 ADR without broadening product scope.
- Reviewed current official Node.js, Next.js, TypeScript, Tailwind CSS, Biome, Vitest, Zod, and formatting/tooling guidance; recorded sources and access date in ADR 0001.
- Preserved and completed the existing partial scaffold, resolved its incompatible lint dependency choice, added missing foundation requirements, and verified the final result with the commands above.
- Result: every T001 acceptance criterion passed. T001 is `Complete`; no T002 functionality was started.

### 2026-10-26 — Phase 0 completed

- Created and consistency-reviewed the seven governance and specification documents.
- Product tests run: none; the documents were governance deliverables, not application functionality.
- Result: T000 acceptance criteria passed and T000 is `Complete`.
