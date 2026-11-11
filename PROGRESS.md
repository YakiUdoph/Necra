# Necra Progress

This file is the factual handoff for the next developer or reviewer. It records verified behavior, failed attempts, unresolved risks, and the next eligible task. Planned work belongs in `TASKS.md`; code appearing in the working tree is not treated as complete until its acceptance criteria pass.

## Current state

Phase 0 governance and T001–T011 are complete. The repository contains a strict TypeScript Next.js application, an accessible responsive product shell, PostgreSQL-backed authentication, default-deny project authorization, immutable text evidence, authorized durable Agreement Reality Check creation, a live-verified server-only Clocked adapter, an evidence-integrity-checked findings presentation, deliberate append-only human decisions, and authorized persisted-record-only Decision Replay.

The T008–T012 checkpoint published to the verified `YakiUdoph/Necra` GitHub repository has passed authenticated live Compare and Grounding verification with fictional evidence, real PostgreSQL persistence, the authorized findings projection, the authenticated browser decision route, chronological replay of genuine persisted records, and the local operational-hardening checks recorded below. This verifies the narrow tested integration, presentation, decision, replay, and local hardening paths; it is not a production-readiness claim, and sensitive production evidence remains blocked on the unresolved privacy/operational terms listed below.

Authenticated users can deliberately create a private workspace/project, but signup alone grants no access to an existing workspace. Exact pasted agreement and later-instruction text can be saved, retrieved, and revised without overwriting history. Owners/collaborators can confirm exact ready versions, create and process an idempotent check, and return after reload to inspect its persisted claims, input identities, provider origin, and only those source passages whose version, quotation, and offsets revalidate against immutable text. An active owner or collaborator with explicit `can_decide` authority can deliberately approve or reject that exact completed check and reload its durable change record. Any active project reader can inspect the tenant-scoped chronological Decision Replay, including persisted source text, evidence links, audit gaps, human/external origins, and superseded decisions. File ingestion/extraction and independent per-finding correction/dismissal controls remain unavailable. Evidence, check creation, provider output, and replay never create approval.

## Implemented functionality

- Next.js App Router shell that explains Necra without presenting future features as operational.
- Accessible semantic navigation, skip link, visible focus treatment, responsive layouts, reduced-motion handling, and 44px minimum interactive targets.
- Agreement Reality Check version selection, exact hash/version confirmation, durable lifecycle states, explicit external-processing confirmation, persisted findings with truthful citation-present/citation-absent presentation, and persisted-record-only Decision Replay.
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
- Server-only Clocked processing route and adapter with explicit external-processing confirmation, immutable input/hash revalidation, persisted request identity, bounded retries, unknown-outcome reconciliation, strict response validation, exact quote/offset checks, and transactional raw/claim result persistence. Authenticated Compare, persisted Grounding, and the authenticated browser route passed with fictional evidence on 2026-11-06; no provider result creates approval.
- Authorized Agreement Reality Check findings projection over persisted provider-claim rows. It displays exact agreement/instruction version IDs and hashes, claim text, provider/model origin, provider verdict, review category, and human-review boundary. Genuine citations show their exact quotation, immutable source identity, UTF-16 character offsets, and highlighted original-document context. Zero-reference claims show no quotation or confidence and explicitly state that missing evidence is not proof of falsehood. Invalid stored citation mappings are withheld rather than rendered.
- Explicit approve/reject decisions for completed Reality Checks. The server derives the actor from the verified session, rechecks active workspace/project membership plus `can_decide` inside the write transaction, serializes simultaneous decisions across authorized actors, binds the record to the exact check/change request/agreement/instruction/provider result, and atomically appends a human review confirmation, decision, change-request state, and audit event. Identical retries return the same record; replacements append a same-context supersession without erasing history.

## Development stack verified on 2026-10-27

- Node.js 24.18.0 LTS; npm 11.16.0; Corepack 0.35.0.
- Next.js 16.4.3; React and React DOM 19.3.1; TypeScript 7.0.2.
- Tailwind CSS and `@tailwindcss/postcss` 4.3.3; PostCSS 8.5.31.
- Biome 2.6.3; Vitest 5.0.5; Zod 4.6.7; `server-only` 0.0.1.
- Drizzle ORM 0.45.4; Drizzle Kit 0.31.11; `pg` and `@types/pg` 8.23.1.
- Better Auth and its Drizzle adapter 1.7.15; Playwright Test 1.64.1.
- Git 2.47.1.windows.1 with repository-level tooling available. On 2026-11-07, the reviewed checkpoint `bc56504` was pushed without force as the first `main` branch of the verified `YakiUdoph/Necra` repository.

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

## Files created or modified for T008

- Provider boundary: `src/server/integrations/clocked/adapter.ts`, using the reviewed Compare and Verify/Grounding contracts with server-only credentials, runtime request/response validation, bounded streamed responses, timeout/error classification, redacted errors, and transport metadata.
- Processing and evidence integrity: `src/server/analysis/processing-service.ts`, `processing-authorization.ts`, and `clocked-result.ts`, plus the guarded process route and UI confirmation.
- Persistence: migration 0004 and typed schema additions for append-only raw provider results and claim-level results linked to the exact agreement version.
- Verification: mocked adapter tests, real PostgreSQL lifecycle/persistence tests, an opt-in live Compare/Grounding integration test, and the authenticated Chromium workflow.

## Files created or modified for T009

- Findings normalization and authorized read projection: `src/server/analysis/finding-normalization.ts` and `src/server/analysis/analysis-service.ts`.
- Findings interface and states: `src/components/analysis/reality-check-list.tsx`, `src/components/analysis/process-reality-check-button.tsx`, `src/app/projects/[projectId]/page.tsx`, and `src/app/styles.css`.
- Verification: `tests/unit/finding-normalization.test.ts`, `tests/unit/reality-check-findings.test.tsx`, `tests/integration/analysis-creation.test.ts`, and `tests/e2e/authentication.spec.ts`.
- Status documentation: `TASKS.md` and `PROGRESS.md`. README's existing `How to Test` section was preserved.

## Files created or modified for T010

- Decision domain/API: `src/server/decisions/decision-service.ts`, `src/server/decisions/validation.ts`, and `src/app/api/projects/[projectId]/checks/[analysisId]/decisions/route.ts`.
- Persistence: exact analysis/instruction bindings in `src/server/db/schema.ts`; forward migration `migrations/0005_aberrant_invisible_woman.sql`; and its Drizzle snapshot/journal entry.
- Decision/change-record interface: `src/components/decisions/decision-dialog.tsx`, `src/components/analysis/reality-check-list.tsx`, `src/server/analysis/analysis-service.ts`, the authorized project page, and decision styles.
- Verification: decision validation/component tests, real-PostgreSQL authorization/idempotency/concurrency/supersession/rollback coverage in `tests/integration/analysis-creation.test.ts`, and the authenticated installed-Chrome workflow in `tests/e2e/authentication.spec.ts`.
- Status and evaluation documentation: `README.md`, `TASKS.md`, and `PROGRESS.md`.

## Files created or modified for T011

- Authorized read model: `src/server/replay/decision-replay-service.ts`, projecting tenant-scoped persisted source versions, change requests, Reality Checks, provider results/findings, review actions, decisions, and matching audit records.
- Replay interface: `src/components/replay/decision-replay.tsx`, `src/components/replay/replay-timestamp.tsx`, the authorized project page, and responsive ledger styles in `src/app/styles.css`.
- Verification: deterministic projection/component coverage in `tests/unit/decision-replay.test.tsx`, real-PostgreSQL chronology/authorization/tamper coverage in `tests/integration/analysis-creation.test.ts`, and authenticated browser chronology/evidence/keyboard/accessibility/mobile coverage in `tests/e2e/authentication.spec.ts`.
- Status and evaluation documentation: `ARCHITECTURE.md`, `README.md`, `TASKS.md`, and `PROGRESS.md`.

## T011 verification actually executed on 2026-11-07

- Re-read all seven governance documents in order, confirmed T011 was the first eligible incomplete task, inspected the accumulated uncommitted T008–T010 implementation plus the partial untracked replay files, and preserved that work without reset, clean, stash, commit, push, or publication. No export was added because T011 does not require one.
- Static review confirmed the replay is read-only and server-authorized. It derives the actor from the verified session, joins active project/workspace membership, scopes every query to the authorized project/workspace, reads genuine persisted records, revalidates provider citations against immutable source text, labels human/external origin, and uses timestamp/kind/identifier tie-breakers. A missing audit/citation is displayed as a gap rather than backfilled; superseded decisions remain visible.
- Unit/build gate: a focused replay run passed 1 file/3 tests. The first full `npm.cmd run check` correctly stopped on test-only TypeScript errors; those fixtures were narrowed without weakening types. The final gate passed strict typecheck, warning-free Biome lint and formatting over 126 files, all 15 unit files/80 tests, and the Next.js 16.4.3 production build.
- Real PostgreSQL: the first focused command stopped before database creation because `TEST_DATABASE_ADMIN_URL` was absent from the process. The environment-file rerun then reached no tests because WSL was stopped. After starting the existing test-only WSL service, 19 tests passed with one live-only skip, but the harness reported only a cleanup permission failure; three inactive guarded `necra_test_<32 hex>` databases were inspected and removed. Replay reads were changed from overlapping to sequential queries on the transaction client, eliminating the pg 9 deprecation warning. The clean focused rerun passed 19 with one live-only skip and normal cleanup. The final complete suite passed 4 files/33 tests with the same one live-only skip; zero `necra_test_*` databases remained.
- PostgreSQL replay coverage includes exact persisted source text/hash identity, validated citations, provider origin, source/change/check/result/review/decision chronology, stable ordering, audit linkage and explicit audit gaps, append-only audit tamper denial, active viewer access, outsider/cross-project/inactive-member denial, and visible same-context decision supersession without erasure.
- Installed Chrome: the first run failed before workflow entry when the known transient Next.js navigation destroyed the initial sign-up axe context; it was not counted as a pass, and its inactive disposable database was removed. The fresh rerun reported one passing Chromium test with a 1.4-minute body. It verified replay after decision reload, persisted source/provider/decision entries, provider versus human labels, UTC presentation, keyboard-opened exact source text, WCAG-tagged axe checks, and 390px no-overflow behavior alongside the existing authorization/CSRF/session checks. The wrapper again lingered after the pass, was interrupted, and the inactive disposable database was explicitly removed; clean wrapper termination is not claimed.
- `npm.cmd run db:check`: the sandboxed run hit the documented Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`. `git diff --check` passed with only informational LF-to-CRLF warnings. No Clocked request was sent; `CLOCKED_API_KEY` was empty and `CLOCKED_LIVE_TEST=false` for T011 integration/browser verification.

## T010 verification actually executed on 2026-11-06

- Re-read all seven governance documents in order, confirmed T010 was the first eligible incomplete task, accepted the user's explicit approve/reject vocabulary, inspected the current schema/authorization/T007–T009 code and accumulated uncommitted diff, and preserved all prior work without reset, clean, stash, commit, push, or publication.
- Static review confirmed that the browser submits no actor, role, workspace, source version, or provider authority. The service derives the actor from the verified session, joins active project/workspace memberships, requires an eligible owner/collaborator role plus `can_decide`, and repeats that check under a membership row lock inside the decision transaction. A Clocked result can only make a completed check eligible for review; it cannot grant authority or create a decision.
- Tightened simultaneous-decision handling with a shared transaction advisory lock for the exact Reality Check. The integration test now races two different authorized actors as well as identical retries and same-actor opposite outcomes; exactly one first decision commits and the other attempt observes a safe conflict. The migration also refuses ambiguous legacy binding instead of selecting an analysis nondeterministically and temporarily disables only the existing append-only trigger while applying an unambiguous schema backfill.
- `npm.cmd run check`: the first post-change run passed types, lint, and 14 unit files/77 tests, then failed only because Biome requested formatting in the new concurrency assertion. That file was formatted. The final gate passed strict typecheck, Biome lint/format over 122 files, all 14 unit files/77 tests, and the Next.js 16.4.3 production build including the decision route.
- Real PostgreSQL: the first command ran no tests because `TEST_DATABASE_ADMIN_URL` was not loaded. The explicit environment-file rerun then reached no tests because WSL PostgreSQL was stopped. Two further aggregate attempts were invalidated by WSL loopback shutdown or missing result summaries and were not counted. With a hidden no-op WSL keepalive, the focused analysis/decision file passed 16 tests with the one deliberate live-provider test skipped; the other three files passed 1, 5, and 8 tests. Final applicable total: 30 passed, 1 live-only skip. Every uniquely named disposable integration database was removed.
- PostgreSQL decision coverage includes authorized approval and rejection; outsiders; suspended project/workspace membership; missing `can_decide`; ineligible role despite `can_decide`; cross-project denial; strict actor-spoof rejection; exact run/agreement/instruction binding; trusted database time; review/decision/audit atomicity; identical retry deduplication; same-actor and cross-actor concurrent attempts; append-only preservation; same-context supersession; stale supersession denial; reload projection; and forced audit failure rollback of the decision, review, request status, and audit.
- Installed Chrome: the first attempt's tool wrapper detached before a result and left a local Next.js test server; only that identified server process was stopped. The immediate retry correctly failed fast because port 3000 was still occupied during diagnosis. The clean retained-session run reported one passing Chromium test with a 1.9-minute body. It created real persisted text/check records, loaded controlled and visibly test-only persisted provider findings, displayed unsupported evidence before confirmation, recorded an authorized human approval, reloaded the actor/time/exact-version change record, denied an unauthorized replacement after `can_decide` revocation, and repeated axe, keyboard, 390px overflow, cross-project, CSRF, expiry, and logout checks. The wrapper again lingered after Playwright reported the pass; it was interrupted, the known `necra_test_t005_e2e` database was verified present and explicitly removed, and port 3000 had no listener. The test-body pass is counted; clean wrapper termination is not claimed.
- `npm.cmd run db:check`: the sandboxed run hit the documented Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`. Browser-static scanning found none of the database/storage/Clocked markers or test credential values. `git diff --check` passed with only informational LF-to-CRLF working-tree warnings.
- No new live Clocked request was sent. `CLOCKED_LIVE_TEST=false` was forced for T010 database and browser verification; controlled provider rows are test-only fixtures and are not described as live results.

## T009 verification actually executed on 2026-11-06

- Re-read all seven governance documents in the required order, confirmed T009 was the first eligible task with completed T004/T005/T008 dependencies, inspected the complete T007/T008 implementation and the existing uncommitted T008/documentation work, and preserved that work without reset, clean, commit, push, or publication.
- `npm.cmd run check`: the first final run passed typecheck, lint, and 13 unit files/72 tests, then failed only because Biome required formatting in the new findings component and browser assertions. `npm.cmd run format` changed those two files. The final gate passed strict typecheck, Biome lint/format over 116 files, all 13 unit files/72 tests, and the Next.js 16.4.3 production build for every route.
- Unit coverage proves genuine citation identity, exact quotation and UTF-16 offsets; zero-reference normalization without a quote; all four review categories; invalid/mismatched citation withholding; provider-status preservation; React-escaped untrusted claim/source content; exact-version rendering; source-context disclosure; and no invented confidence or approval.
- The first integration command failed before tests because `TEST_DATABASE_ADMIN_URL` was absent. The first ignored-environment rerun reached no tests because local WSL PostgreSQL was stopped. After starting the existing hidden WSL test keepalive correctly, the T009-focused real-PostgreSQL suite passed 10 tests with the one live-only test skipped, and the full suite passed 4 files/24 tests with that same intentional skip. It covered evidence-present and evidence-absent persisted reads, exact source/version/offset mapping, provider origin, reload retrieval, tenant/role denial before provider access, malformed-result rollback, retries/reconciliation, and zero decisions. One preceding full-suite attempt passed 19 tests but lost the WSL connection in another suite; it was not counted as the final pass.
- No new live Clocked call was necessary. `CLOCKED_LIVE_TEST=false` was explicitly set for database and browser verification; all added fixtures stayed test-only and fictional.
- Installed-Chrome verification ultimately reported one passing Playwright test with a 1.2-minute body. The final state covered persisted evidence-present and zero-citation findings, exact source versions, keyboard-opened original-document context, reload persistence, failed/unconfigured processing, direct-object tenant denial, revoked membership/session denial, WCAG-tagged axe scans, and 390px overflow. Earlier attempts exposed and retained: a transient axe contrast sample during a button color transition, one stale pending-state expectation, two ambiguous text locators, and one Next.js development navigation that destroyed the initial axe execution context. The button transition was removed to prevent transient low contrast, the test now waits for network idle before axe, and exact semantic locators replaced ambiguous text matches.
- After Playwright reported the final test pass, the local wrapper again lingered while shutting down the Next.js test process and was interrupted. The explicitly guarded `necra_test_t005_e2e` disposable database was then removed by a one-use validated cleanup script, the script itself was deleted, and the WSL test keepalive was stopped. The passing browser test body is valid; clean wrapper termination remains a local harness issue.
- `npm.cmd run db:check`: the sandboxed run failed with the known Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`.

## T008 live verification completed on 2026-11-06

- Re-read the seven governance documents in order, preserved all existing uncommitted T008 work, and confirmed T008 was the first eligible incomplete task. T009 was not started.
- Inspected the existing Ubuntu 22.04 WSL PostgreSQL 14.24 service. The actual Windows Node.js path is `127.0.0.1:5432`; only default databases existed. Created the dedicated `necra_t008_test` login with `CREATEDB`, no superuser/role-admin/replication/row-security-bypass privileges, and an eight-connection limit. Its cryptographically generated credential was written only to ignored, untracked `.env.local` and never displayed.
- Added fail-closed harness validation requiring loopback PostgreSQL port 5432, the empty `postgres` admin database, a password-protected `necra_*_test` role, and existing `necra_test_*` disposable database-name guards. A Windows Node.js create/connect/drop probe passed for `necra_test_<32 hex>`. Final catalog inspection found no surviving `necra_test_*` database and no database owned by the dedicated role; the temporary hidden WSL keepalive was stopped.
- Initial live Grounding calls truthfully failed strict runtime validation. Value-free diagnostics established that live responses can return `grounded`/`ungrounded` as `null` and an optional per-claim `kinds` probability map, while the official recorded fixture uses numeric aggregates. The validator now accepts only numeric-or-null aggregates and a validated optional probability map. Transport/schema failure remains distinct from exact evidence-integrity failure.
- `node --env-file=.env.local ... vitest ... --testNamePattern "LIVE CLOCKED" --disableConsoleIntercept` passed the real redacted test using fictional agreement/instruction text. Correlation ID: `bedaee4d-4dd5-4f10-ae62-5ef9d7593382`. Grounding: model `clocked-1.0`, completed, 1 persisted claim, 0 evidence references, 0 decisions, response hash `5c14b65daaee7775472a895c886398c865dd1bb06efca149ce90935d7ea6630f`, 32.743456 model ms, 2 credits, reference cost USD `0.000398`. Compare: model `clocked-1.0`, response hash `2d8dff25076673f03d46981946c749589ae9315ec3c819608cb1c20e3ac01ac5`, 25.311232 model ms, 2 credits, reference cost USD `0.000398`. Zero evidence references is the truthful provider result for this fictional request, not fabricated missing evidence.
- The final full `test:integration` run passed 4 files/24 tests in 42.87 seconds with live opt-in enabled. It verified transactional raw/claim persistence, exact evidence checks for every returned citation, no decision creation, authorization denial before transport, malformed-response rollback, original-key reconciliation, and stale-worker recovery.
- `test:e2e` passed 1 installed-Chrome test: 1.2-minute test body and 1.7 minutes including setup/cleanup. It exercised real signup/session authorization, evidence/check creation, explicit external-processing confirmation, live Grounding through the protected route, persisted completion, tenant denial, accessibility, keyboard, responsive behavior, expiry, and logout.
- `npm.cmd run check` passed strict typecheck, Biome lint/format over 113 files, 11 unit files/64 tests, and the Next.js 16.4.3 production build. The sandboxed `db:check` hit the known Windows `uv_os_get_passwd ... ENOMEM`; the approved rerun passed with `Everything's fine`.
- Configured-value scanning passed across 114 tracked files and 17 browser-static files. `.env.local` is ignored/untracked; no configured Clocked/database secret value or tested secret marker appeared in tracked/browser-static output. `git diff --check` reported only informational LF-to-CRLF warnings.
- Failed attempts were not counted as passes: two inline Node probes were rejected by PowerShell parsing, one probe and early PostgreSQL attempts hit stopped-WSL `ECONNREFUSED`, an invalid `NODE_OPTIONS=--env-file` invocation ran no tests, one metadata command used the wrong Vitest path and ran no request, DNS produced one reconciliation-required outcome, and pre-fix authenticated responses were correctly rejected until the observed nullable aggregate/claim-kinds shape was narrowly validated.

## T008 verification attempted on 2026-11-05

- Re-read the seven governance documents, T008 acceptance criteria, provider note, T007 mapping/state machine, current uncommitted implementation, migrations, UI, and tests. Direct official Grounding documentation retrieval confirmed the endpoint, request limits, optional evidence, claim verdicts, and response fields; the normal browser service could not access the page, while approved read-only HTTPS retrieval succeeded.
- Deterministic mocked tests passed for exact Grounding and Compare URLs/headers/payloads, runtime request rejection before transport, 401/402/409/422/429/503 classification, redacted provider errors, timeout/network unknown outcomes, malformed and oversized responses, Unicode code-point conversion, alias/quote validation, response-index integrity, and explicit external-processing confirmation. These tests are not live Clocked evidence.
- The first two PostgreSQL integration commands failed before any test because Windows localhost forwarding to WSL returned `ECONNREFUSED`. The first keepalive command exited due incorrect argument quoting and a third attempt failed the same way. With a corrected hidden WSL keepalive and a short-lived test-only role, the final `npm.cmd run test:integration` passed 4 files/23 tests; the one explicitly gated live Clocked test was skipped, for 24 total tests.
- The integration suite covers one transactional provider result, exact evidence offsets, no decision creation, unauthorized processing denial before transport, malformed-success rollback with no partial result, original-key retry after unknown outcomes, and stale-running reconciliation. The opt-in live test remains skipped unless both `CLOCKED_LIVE_TEST=true` and `CLOCKED_API_KEY` are deliberately configured.
- `npm.cmd run test:e2e` passed 1 installed-Chromium test in 1.1 minutes against a disposable PostgreSQL database with Clocked deliberately unconfigured. It verified real authentication, persisted evidence/check creation, the honest unavailable state, direct process-route failure without a key, tenant denial, accessibility, keyboard, and responsive behavior. It is not a live Clocked pass.
- The first `npm.cmd run check` attempt exposed one unused import and three formatting changes; unit tests still passed. After those exact corrections, the final gate passed strict typecheck, Biome lint/format over 111 files, 10 unit files/57 tests, and the Next.js 16.4.3 production build. The sandboxed Drizzle check hit the known Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`.
- Tracked credential-pattern scanning found no key-like values. `.next/static` contained no `CLOCKED_API_KEY`, mocked Clocked key, or local test-role password marker. `git diff --check` reported only informational LF-to-CRLF working-tree warnings.
- The sandboxed `npm.cmd audit --omit=dev` could not reach the advisory endpoint. The approved registry run reported the same four moderate findings in Drizzle Kit's legacy esbuild development chain and proposed an incompatible forced downgrade; no forced fix was applied. The short-lived PostgreSQL role and WSL test keepalive were removed after verification.
- Live verification did not run: neither the process environment nor ignored local environment files contained a `CLOCKED_API_KEY`. No authenticated provider response, credit use, cost, latency, Compare result, Grounding result, or live persistence is claimed. T008 is `Blocked` at the live gate.

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
- Clocked's playground history remains separate evidence. Necra's T008 server-only adapter passed authenticated Compare, persisted Grounding, and authenticated browser verification with fictional evidence on 2026-11-06. This narrow success does not resolve production-sensitive data handling, residency, contractual, deletion, or operational-log questions.
- T005 supports only pasted Unicode text, limited to 256 KiB per version and 300 KiB per JSON request. PDF, DOCX, images, OCR, file upload, object storage, malware scanning, downloads, and user deletion remain unsupported. T010's approved initial decision vocabulary is exactly approve/reject.
- Git has the truthful T004 baseline commit `1d24d0b`, audited T005 commit `72ccd27`, audited T006 commit `a173788`, T007 commit `849ced5`, and reviewed T008–T012 checkpoint `bc56504`. The checkpoint was pushed without force to the previously empty, verified `YakiUdoph/Necra` repository on 2026-11-07; T012 remains in progress.
- Database constraints do not authorize reads by themselves. T010 repeats the active membership, eligible role, and `can_decide` check under a membership row lock inside every decision transaction and derives the actor only from the verified session.
- Evidence references enforce correct version association and offset shape. T005 now preserves exact text, but the future citation-write service must still verify quote/offset equality before insertion.
- T005 calculates SHA-256 server-side over exact, non-normalized UTF-8 content. The hash establishes content identity/integrity only, not the truth of the source. Uploaded original-byte preservation remains deferred because uploads are unsupported.
- Drizzle Kit's legacy dependency chain has four moderate npm audit findings. Better Auth's optional peer causes npm to include that toolchain in the production audit graph even though application runtime code does not import it. Do not expose Drizzle development tooling or Studio to untrusted networks; reassess on a compatible upstream fix.
- PostgreSQL row-level security is not enabled; the application server and database operators remain privileged boundaries.
- No durable worker/queue is selected. T008 executes through a bounded server request with persisted recovery states; broader workload measurements may still justify later durable orchestration.
- The authenticated live run observed `clocked-1.0`, response hashes, latency, credits, and reference cost for one fictional case only. Accuracy, calibration, sustained latency, concurrency, and model stability remain unverified.
- No hosted database or production authentication environment has been configured or verified.
- One clean browser attempt encountered a transient Next.js development-stream error during sign-in; the immediately following fresh-database run passed. This remains a local test-flakiness risk rather than evidence of production readiness.
- The Playwright wrapper can linger after the browser test body reports a pass while shutting down the Next.js development server. T010 and T011 required manual wrapper interruption and separately verified cleanup; CI should treat clean harness termination as outstanding hardening rather than infer it from the test-body pass.
- T010 records an append-only `confirmed` review action with each deliberate decision and preserves provider findings unchanged. Independent per-finding notes, corrections, and dismissals are not exposed yet; adding those controls must remain separate from decision authority.

## Current blockers

- None for T001–T011.
- Judge evaluation is blocked by the absence of a verified deployment, a tested judge-access process, and safely distributed judge credentials.
- Official competition eligibility, submission requirements, repository-publicity rules, and the deadline cannot be verified because the competition has not been identified in repository documentation.
- Sensitive production Clocked use remains blocked pending resolution of processing region, subprocessors, contractual terms/DPA, deletion guarantees, access controls, incident handling, and operational-log retention. T008's fictional non-sensitive live gate is complete.

## Next task

T012 — Harden, operate, and verify the initial release — is the exact next product task. It depends on completed T001–T011. This does not authorize a production-readiness claim: retention/deletion policy, monitoring, backup restoration, deployment, production authentication, staging smoke coverage, and other T012 gates remain outstanding. In parallel, competition submission cannot be called judge-ready until the organizer, deadline, deployment, and access process are known and tested.

## Activity log

### 2026-11-07 — Safe Git checkpoint and first GitHub push

- Re-read the seven governance documents and the complete attached T012 playbook, inspected the working tree, all untracked files, `.gitignore`, migrations 0000–0005, accumulated T008–T012 changes, local history, configured remote, and live remote branch/tag state without resetting, cleaning, stashing, rewriting, or discarding work.
- Verified `origin` resolves to the public `YakiUdoph/Necra` repository. GitHub reported no default branch, heads, or tags, so the first push of local `main` was non-destructive and required no merge, force, or history deletion.
- Secret review covered the proposed worktree, exact staged paths, and all four pre-checkpoint commits. No private-key, cloud-token, GitHub-token, payment-key, Clocked-key, configured environment-secret, personal-email, database-file, or generated browser/build artifact was committed. The only database-URL pattern matches were documented `USER:PASSWORD` placeholders and explicit `test-only-password` unit fixtures. `.env.local`, `.next`, `test-results`, `playwright-report`, and `*.tsbuildinfo` remained ignored and unstaged. `gitleaks`, `trufflehog`, and `detect-secrets` were unavailable.
- The final `npm.cmd run check` passed strict typecheck, warning-free lint, 15 unit files/80 tests, formatting, and the production build. The sandboxed migration check hit the documented Windows `uv_os_get_passwd ... ENOMEM`; the approved unrestricted rerun passed with `Everything's fine`.
- Reviewed the exact staged 61-file text/source checkpoint: 13,513 insertions and 211 deletions, no binary files, prohibited paths, or blobs over 1 MiB. Created `bc56504` (`feat: verify agreement review and replay workflow`) and pushed it without force as new branch `origin/main`. This is a source checkpoint only; no deployment was started.

### 2026-11-07 — T012 provider-credit hardening attempt

- Re-read the seven governance documents in order, confirmed T012 as the first eligible incomplete task, and preserved the accumulated uncommitted T008–T011 work.
- Confirmed a high-severity deployment-wide credit-exhaustion gap: the existing database-coordinated ceilings were scoped only per workspace, while authenticated users can create separate private workspaces. Also confirmed that retry admission did not add the new call to the projected 24-hour usage.
- Added ordered deployment-wide and per-workspace PostgreSQL advisory locks, configurable global concurrency/24-hour ceilings, conservative retry accounting, safe 429 responses, environment documentation, and real-database regression cases for cross-workspace exhaustion and retry accounting.
- Local verification passed: the final `npm.cmd run check` completed strict typecheck, lint, 15 files/80 unit tests, formatting, and the production build. `npm.cmd run db:check` passed outside the sandbox after the known Windows `uv_os_get_passwd ... ENOMEM` sandbox failure. `git diff --check`, tracked secret-candidate scanning, and built-browser marker scanning passed; `gitleaks` is unavailable. The npm production audit still reports four moderate advisories in Drizzle Kit's development-only legacy esbuild chain and offers only a breaking forced downgrade.
- The first two real-PostgreSQL attempts failed because WSL deactivated PostgreSQL while Windows tests still held TCP connections; the failed output exposed only short-lived test-role passwords, and both roles were dropped immediately. With a bounded hidden WSL keepalive, the targeted file passed 22 applicable tests with one live-only skip, then the complete suite passed 36 applicable tests across four files with one live-only skip. All disposable roles/databases were removed.
- The first browser attempt failed before workflow entry because the new CSP blocked development-only Turbopack `eval`; production never received `unsafe-eval`, and non-production now does. The next attempt completed the workflow but exposed a hydration race in the mobile native-menu assertion. After waiting for hydration and pressing Enter on the summary locator, the authenticated Chrome test body passed in 1.7 minutes and the wrapper exited cleanly in 2.1 minutes, including persistence, decision, replay, tenant denial, axe, keyboard, and mobile checks. No Clocked request was sent.
- T012 remains `In progress`. Deployment, backup/restore execution, production smoke testing, and mandatory live deployed acceptance remain blocked on authorized infrastructure and credentials.

### 2026-11-07 — T011 completed

- Completed the smallest persisted-record-only Decision Replay over source versions, requests, checks, provider findings, human reviews, decisions, audit links, and explicit gaps without adding a generated narrative or replay write path.
- Enforced server-side reader authorization and tenant scoping, deterministic ordering, citation revalidation, origin labels, UTC/local timestamp presentation, and append-only supersession visibility.
- Verified the implementation with the final 80-test unit/build quality gate, Drizzle consistency, 33 applicable real-PostgreSQL tests, and the authenticated installed-Chrome replay/reload/keyboard/accessibility/mobile flow. Failed environment, cleanup, typecheck, and transient browser attempts remain recorded above and were not converted into passes.
- Result: every T011 acceptance criterion passed. T011 is `Complete`; T012 is the exact next task and was not started.

### 2026-11-06 — T010 completed

- Confirmed approve/reject as the initial vocabulary and completed the smallest deliberate human-decision workflow over a real persisted Reality Check, exact immutable source versions, persisted findings, and explicit evidence-unavailable states.
- Enforced authorization and consistency inside the database transaction, including verified-session actor derivation, active membership, eligible role, `can_decide`, exact context binding, cross-actor serialization, idempotent retries, append-only supersession, and atomic review/decision/request/audit persistence.
- Verified the implementation with the final 77-test unit/build quality gate, Drizzle consistency, 30 applicable real-PostgreSQL tests, and the authenticated installed-Chrome decision/reload/denial/accessibility flow. Failed setup, WSL, formatting, port, and wrapper-shutdown attempts remain recorded above and were not converted into passes.
- Result: every T010 acceptance criterion passed. T010 is `Complete`; T011 is the exact next task and was not started.

### 2026-11-05 — T008 live-verification attempt blocked before external access

- Re-read the seven governance documents, preserved the existing uncommitted T008 implementation, and inspected the local environment with all values suppressed.
- Confirmed `.env.local` contains a non-empty `CLOCKED_API_KEY` and `CLOCKED_LIVE_TEST`, while `TEST_DATABASE_ADMIN_URL` is absent from both `.env.local` and the process environment. The similarly named `.env.local.txt` file does not exist.
- Confirmed the integration and browser harnesses create and drop only guarded `necra_test_*` database names, but could not verify or connect to a disposable PostgreSQL target without the administrative URL.
- No Clocked request was sent, no database was accessed, no production data was used, and no secret was printed. T008 remains blocked and T009 was not started.

### 2026-11-05 — Documentation humanization and judge-access review

- Reviewed the seven root governance documents, README, architecture decision records, environment example, routes, scripts, tests, repository history, remote configuration, and the active T008 working tree.
- Reworked README around a judge-first local evaluation path, clearly separated working and unavailable steps, added Windows-friendly setup/test commands, troubleshooting, architecture links, limitations, and an evidence-based competition checklist.
- Clarified the purpose and reading context of all seven root documents without deleting security rules, acceptance criteria, verified test history, or known limitations. Corrected T007's commit status and marked T008 `In progress` because uncommitted implementation exists but live verification does not.
- Confirmed there is no repository evidence of a deployment, judge account, verified public repository, named competition, official eligibility/submission rules, deadline, demo video, or completed Clocked/decision/Decision Replay workflow. These remain explicit submission blockers.
- `git diff --check` passed with only informational LF-to-CRLF working-tree warnings. `npm.cmd run format:check` passed over 110 files. `npm.cmd run check` passed: strict typecheck, Biome lint over 110 files, 10 unit files/51 tests, formatting, and the Next.js 16.4.3 production build.

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

## Latest production verification — November 9, 2026

**Environment:** Production deployment
**Application:** https://necra.vercel.app/
**Verification type:** Manual authenticated browser walkthrough
**Automated tests executed during this walkthrough:** None confirmed

### Verified observations

The project owner accessed the deployed application and opened an existing project containing an original website redesign agreement and subsequent online-store instructions.

The source records were available in the project interface.

A completed Agreement Reality Check displayed two findings produced through Clocked.

The findings concerned a possible conflict between the original scope and the requested online-store functionality, and missing evidence supporting unchanged pricing.

Neither finding contained a verified source passage.

Necra disclosed the absence of verified evidence rather than generating supporting quotations.

### Decision authority

The project owner initially lacked explicit decision authority.

A new owner-facing permission control was added to the application.

The control uses the existing project membership-management endpoint to request a change to the owner's `canDecide` permission.

After the corrected application code was deployed, the production interface displayed:

`Decision Authority: Explicitly Granted`

The control also offered the ability to revoke that authority.

This confirms the observed authorized owner workflow. It does not establish that every unauthorized permission-change scenario has been retested.

### Human decision

With decision authority enabled, the owner opened the decision interface.

The owner selected rejection and recorded a rationale explaining that the additional online-store functionality was not authorized under the current agreement without separate review and explicit agreement.

The application displayed the persisted rejection with the decision-maker, timestamp, decision identifier, rationale, and associated evidence versions.

The decision was displayed separately from the two automated findings.

### Decision Replay

The production Decision Replay displayed seven chronological records:

1. Original agreement version.
2. Later instruction version.
3. Change request.
4. Agreement Reality Check creation.
5. Clocked provider result.
6. Human review confirmation.
7. Human rejection decision.

The provider result and human decision remained distinguishable.

The replay showed the associated source versions and available audit relationships.

### Outstanding audit issue

The change-request entry displayed:

"No matching audit event is stored for this record."

The application disclosed this gap rather than inventing an audit association.

The cause remains unverified.

Investigation and regression testing are required before claiming complete audit-event coverage.

### Deployment observations

A deployment containing a duplicate-import error failed.

The import issue was corrected.

The subsequent deployment associated with commit `04fbfb4` displayed a Ready status in Vercel.

The owner subsequently completed the production decision workflow.

This observation does not replace a fresh automated build, integration-test, or end-to-end test result.

### Current limitations

The following remain unverified or incomplete:

- Dedicated judge access.
- Fresh automated regression results after the latest production changes.
- Complete audit-event coverage for change requests.
- Independent production security review.
- Backup-and-restore verification.
- Production retention and deletion procedures.
- Final competition submission confirmation.

### Next actions

1. Correct the public README and governance-document status descriptions.
2. Investigate the missing audit-event association.
3. Revalidate permission changes and decision creation.
4. Establish secure judge access.
5. Verify the final competition requirements.
6. Submit the verified application and supporting materials.

This entry records observed behavior and known limitations. It does not retroactively change earlier task completion dates or test results.

## 2026-11-10 — Optional Compare candidate patch, not released

A candidate implementation was prepared from the user's uploaded tracked-source ZIP. It adds a separate one-shot Compare table, server route, provider evidence checks, optional UI, and preliminary unit tests. No source code was changed on the user's computer or live deployment. The build environment used Node 22/npm 10, while this project requires Node 24/npm 11; dependency installation timed out, so TypeScript, database migration, unit, integration, browser and production-build verification have **not** passed. The candidate is **blocked** from deployment. Drizzle migration metadata/snapshot consistency and production DB role permissions must be reviewed on the supported toolchain. A real provider Compare request has not been made for this patch.
