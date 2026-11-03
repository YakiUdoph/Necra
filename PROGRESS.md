# Necra Progress

## Current state

Phase 0 governance and T001–T004 are complete. The repository now contains a strict TypeScript Next.js application, a premium accessible responsive product shell, reusable interface primitives, real PostgreSQL-backed authentication, default-deny project authorization, local quality tooling, and version-controlled migrations with real database and browser tests.

Document ingestion, evidence processing, Clocked calls, Agreement Reality Check functionality, the approval workflow, and Decision Replay remain unimplemented. Authentication does not create projects, memberships, findings, or approvals.

## Implemented functionality

- Next.js App Router shell that explains Necra without presenting future features as operational.
- Accessible semantic navigation, skip link, visible focus treatment, responsive layouts, reduced-motion handling, and 44px minimum interactive targets.
- Static descriptions of Agreement Reality Check and Decision Replay, both labeled `Planned` and explicitly described as unimplemented.
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
- Accessible responsive sign-in, optional sign-up, sign-out, empty-project, and authorized project status views. Future evidence/approval features remain honestly labeled unimplemented.
- Playwright coverage through installed Chrome for login, logout, expiry, invalid sessions, direct API denial, cross-project access, membership revocation, and spoof attempts.
- Authenticated desktop and mobile product navigation organized around Projects, Agreements, Changes, Agreement Reality Check, and Decisions & Replay, with real server-authorized context and honest unavailable states.
- Reusable page header, status, notice, empty-state, button, field, comparison-empty, loading, and error patterns with visible focus, text-plus-color status communication, 44px targets, and reduced-motion handling.
- Automated axe coverage on authentication and authorized project screens plus responsive/keyboard browser checks. No production-facing fixture content or nonfunctional action controls were added.

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

## Known issues and unverified assumptions

- Automated axe coverage now exercises authentication and authorized project screens. A visual-regression baseline was not adopted, and manual screen-reader testing remains outstanding for the complete product workflows in later tasks.
- Storage provider, extraction/OCR, background execution, observability, hosting/database vendor, regions, and retention/deletion policy remain undecided.
- Email verification, password reset, MFA, invitations, OAuth/SSO, administrator provisioning UI, and distributed authentication rate limiting are not implemented. Public signup remains disabled by default.
- `PRIVATE_STORAGE_*` remains an inert boundary placeholder, not a provider commitment.
- Clocked's playground has produced real Compare and Verify responses, but Necra has no adapter, credentials, live request, runtime response schema, or end-to-end result. Its behavior remains unverified pending T006 and T008.
- Supported evidence formats, limits, malware scanning, and decision vocabulary still require their owning decisions.
- The repository has no tracked baseline commit; all files currently appear untracked in Git. T001 did not create a commit.
- Database constraints do not authorize reads by themselves. T003 server queries now enforce active membership/role/`can_decide`; T010 must repeat that check inside the future decision transaction.
- Evidence references enforce correct version association and offset shape, but exact quote-to-content matching cannot be enforced until T005 persists and validates extracted content.
- Document hash format is enforced, but trusted SHA-256 calculation and original-object preservation belong to T005.
- Drizzle Kit's legacy dependency chain has four moderate npm audit findings. Better Auth's optional peer causes npm to include that toolchain in the production audit graph even though application runtime code does not import it. Do not expose Drizzle development tooling or Studio to untrusted networks; reassess on a compatible upstream fix.
- PostgreSQL row-level security is not enabled; the application server and database operators remain privileged boundaries.
- No hosted database or production authentication environment has been configured or verified.
- One clean browser attempt encountered a transient Next.js development-stream error during sign-in; the immediately following fresh-database run passed. This remains a local test-flakiness risk rather than evidence of production readiness.

## Current blockers

- None for T001–T004.
- Later Clocked work requires official documentation access; live verification also requires authorized credentials and non-sensitive test evidence.
- T004 is complete. T005 remains blocked on explicit storage provider, supported-format/limit, malware-scanning, extraction, and retention decisions.

## Next task

T005 — Implement evidence ingestion and versioning, after its required storage, format, scanning, extraction, and retention decisions are made.

## Activity log

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
