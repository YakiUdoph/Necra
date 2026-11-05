# Necra

Necra helps project partners establish what was agreed, what changed, and what still needs explicit approval.

This repository contains the verified foundation through T005. Authenticated users can create a private project, record pasted-text agreements and later instructions, retrieve the persisted sources, and append immutable versions. Clocked calls, Agreement Reality Check processing, explicit decisions, and Decision Replay remain unimplemented.

## How to test Necra

1. Configure a non-production PostgreSQL database and the required authentication values described below.
2. Apply migrations with `npm.cmd run db:migrate`.
3. Set `AUTH_ALLOW_SIGN_UP=true` only for intentional local self-service testing, then run `npm.cmd run dev`.
4. Create an account, create a workspace/project, open the project, and add exact agreement and instruction text. Create a revision and reload the page to verify that every version remains visible.

Pasted text is the only supported evidence format. Each version is limited to 256 KiB of UTF-8 content. PDF, DOCX, images, OCR, file upload, malware scanning, and user deletion are not available. Use only evidence you are authorized to record.

## Requirements

- Node.js 24.18.x (Node 24 LTS)
- npm 11.16 or later within the supported engine range

The repository pins application dependencies in `package.json` and `package-lock.json`.

## Local setup

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`. On systems where PowerShell script execution is disabled, use `npm.cmd` instead of `npm`.

PostgreSQL and the authentication settings below are required for sign-in and protected project routes. The public landing page and unit tests do not connect to external services.

## Environment configuration

- `DATABASE_URL`: PostgreSQL connection URL used by migrations, Better Auth, and protected application queries.
- `BETTER_AUTH_SECRET`: at least 32 random characters, stored only as a server secret. Generate one with `openssl rand -base64 32` or an equivalent cryptographically secure secret generator.
- `BETTER_AUTH_URL`: exact public application origin, such as `http://localhost:3000` locally. Production configuration is rejected unless this uses HTTPS.
- `AUTH_ALLOW_SIGN_UP`: `false` by default. Set `true` only when self-service account creation is intentional. A signed-in user can deliberately create a new private workspace/project; signup alone still grants no access to an existing workspace.
- `PRIVATE_STORAGE_*`: optional and currently unused. No object-storage provider is connected.
- `CLOCKED_API_KEY`: optional and currently unused. Keep it server-side; never prefix it with `NEXT_PUBLIC_` or commit it.
- `CLOCKED_BASE_URL`: validated URL with the documented default `https://clocked.rezolve.ai/clocked`. Necra makes no Clocked calls yet.

All `.env*` files except `.env.example` are ignored. Server environment access belongs in `src/server/` and is guarded with `server-only`.

The app exposes `GET /api/health` for a basic process-level check. It returns only a service name and status; it does not claim that any external dependency is configured or healthy.

## Quality commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run format:check
npm.cmd run build
npm.cmd run db:check
npm.cmd run test:integration
npm.cmd run test:e2e
```

`npm.cmd run check` runs typecheck, lint, unit tests, formatting, and the production build. Database and browser suites are separate because they require a disposable PostgreSQL administrative connection.

## Database migrations and tests

T002 uses Drizzle ORM with version-controlled PostgreSQL SQL migrations. Do not use production data for local or automated tests.

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
npm.cmd run db:migrate
Remove-Item Env:DATABASE_URL
```

`npm run db:generate` creates a new migration after an intentional schema change; never edit an already applied migration. `npm run db:check` validates migration snapshot consistency. Shared environments use forward migrations. The migration 0000 down script is for disposable empty-development verification only, not an automatic populated-environment rollback.

For the Vitest integration suite, set `TEST_DATABASE_ADMIN_URL` to a non-production PostgreSQL administrative database. The suite creates and drops a uniquely prefixed disposable database:

```powershell
$env:TEST_DATABASE_ADMIN_URL = "postgresql://USER:PASSWORD@HOST:5432/postgres"
npm.cmd run test:integration
Remove-Item Env:TEST_DATABASE_ADMIN_URL
```

On a Unix environment with local PostgreSQL tooling, `bash tests/integration/run-schema-tests.sh` runs the database-native apply/invariant/rollback suite. Test records are clearly labeled and never load through production paths.

The browser suite uses the same disposable-database contract and installed Chrome:

```powershell
$env:TEST_DATABASE_ADMIN_URL = "postgresql://USER:PASSWORD@HOST:5432/postgres"
npm.cmd run test:e2e
Remove-Item Env:TEST_DATABASE_ADMIN_URL
```

Never point either test command at production. The role needs permission to create and drop uniquely named disposable test databases.

Tailwind CSS uses its CSS-first configuration in `src/app/styles.css`, with PostCSS configured in `postcss.config.mjs`. Biome provides linting and formatting with the pinned repository configuration in `biome.json`.

## Current product status

- Agreement Reality Check: planned, not implemented.
- Decision Replay: planned, not implemented.
- Evidence ingestion: exact pasted agreement/instruction text, optional known provenance, server-generated immutable versions, server-calculated SHA-256 hashes, and persisted history are implemented. File formats and extraction are unsupported.
- Project setup: an authenticated user can create a new private workspace/project and becomes its owner without receiving decision authority automatically.
- Clocked playground: real Compare and Grounding endpoints are documented for later research; Necra has not called or verified them.
- PostgreSQL schema/query tooling: implemented and tested locally; no hosted database is selected or connected.
- Authentication and project authorization: implemented with Better Auth and real PostgreSQL sessions; email verification, password reset, MFA, invitations, and a hosted deployment remain unconfigured.
- Private object storage: not selected or connected; text-only originals are private PostgreSQL records.

Read `AGENTS.md` and the remaining root specifications before changing the project.
