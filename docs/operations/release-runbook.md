# Release, recovery, and acceptance runbook

## Deployment boundary

No hosting provider, production PostgreSQL database, public URL, DNS name, or judge credential is currently authorized or verified. Do not reuse `TEST_DATABASE_ADMIN_URL`, a disposable `necra_test_*` database, or an administrator database role. Provisioning, payment, repository publication, and secret entry require the owner's explicit action.

## Production prerequisites

1. Create an isolated PostgreSQL database with encrypted transport, automated backups, point-in-time recovery where available, and separate owner, migration, backup, and runtime roles.
2. Grant the runtime role only connect plus required table/sequence DML. Do not grant database creation, role management, schema ownership, superuser, replication, or bypass-RLS privileges. Keep the migration role out of the application environment.
3. Configure server-only `DATABASE_URL`, a unique 32+ character `BETTER_AUTH_SECRET`, the exact HTTPS `BETTER_AUTH_URL`, `AUTH_ALLOW_SIGN_UP=false`, `CLOCKED_API_KEY`, the documented HTTPS Clocked base URL, and explicit deployment-wide plus workspace concurrency/24-hour budgets. Set the global ceilings to the authorized Clocked account capacity; workspace ceilings must not exceed them. Never put values in source or browser variables.
4. Apply migrations 0000 through 0005 in order with `npm run db:migrate` using the migration role. Run `npm run db:check` before deployment and retain the migration output.
5. Deploy the existing Node/Next.js application behind HTTPS. Verify HSTS, CSP, secure session cookies, `/api/health`, database connectivity through an authenticated read, and generic 4xx/5xx responses.

## Backup and restore exercise

Use an isolated disposable target. Never restore over the source database.

1. Record the source database identifier, migration journal, row counts for immutable tables, and SHA-256 of the encrypted backup artifact.
2. Create a PostgreSQL custom-format backup with `pg_dump --format=custom --no-owner --no-acl` using the backup role.
3. Create a new empty disposable restore database and run `pg_restore --exit-on-error --no-owner --no-acl` with a restore/migration role.
4. Connect with the restricted runtime role. Verify the migration journal, source/version/provider/decision/audit counts, append-only triggers, authentication, one scoped read, and denial from an unrelated user.
5. Destroy only the explicitly named disposable restore database after recording results. Retain or delete the backup according to the environment policy.

## Rollback and recovery

- Application-only regression: stop promotion or route traffic to the last known-good application artifact. Do not reverse migrations merely because application code rolled back.
- Failed migration before application promotion: stop, capture logs, restore the pre-migration backup into a new database, validate it, and repoint only after owner approval.
- Failure after new writes: prefer a corrective forward migration. Restoring an older database can erase audit history and requires incident-owner authorization and a documented recovery point.
- Clocked uncertainty: do not retry with a new identity. Preserve the run in `reconciliation_required`, investigate provider state, and keep the original evidence/version hashes.
- Credential exposure: revoke/rotate the affected secret, invalidate sessions where applicable, inspect audit/provider activity, and document scope. Never paste the secret into an issue or log.

## Mandatory deployed acceptance

After a provider and database are authorized, use fresh non-sensitive text entered independently through the UI. Create and re-login to a real account; create a project; persist agreement and instruction versions; deliberately authorize a genuine Clocked call; inspect validated evidence; record a decision as a user with `can_decide`; reload; re-login; inspect Decision Replay; and prove another account cannot read or decide. Record the URL, timestamps, content hashes (not source text), provider response hash/model, decision ID, browser/mobile/accessibility results, and production smoke result in `PROGRESS.md`.

Until every step succeeds on the deployed URL, T012 remains blocked and Necra is not production- or judge-ready.
