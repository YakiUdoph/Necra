# ADR 0003: Better Auth and project-scoped authorization

- Status: Accepted for T003
- Date: 2026-11-02

## Context

Necra requires real identity verification, revocable sessions, and default-deny project authorization without replacing T002's PostgreSQL/Drizzle model or implementing password cryptography. Authentication must remain distinct from project membership and explicit decision authority.

## Decision

- Use Better Auth 1.7.15 with its Drizzle adapter and email/password provider. Better Auth, not Necra code, hashes and verifies passwords.
- Store users, credential accounts, opaque sessions, and verification records in PostgreSQL. Better Auth account identifiers are atomically mirrored into T002's `authenticated_identities` table by migration 0001, preserving the existing audit-actor model.
- Use database-backed eight-hour sessions with a one-hour rolling update window. Cookie caching is disabled so database expiry or revocation takes effect on the next verified request.
- Require a minimum 32-character `BETTER_AUTH_SECRET`, a canonical `BETTER_AUTH_URL`, and production HTTPS. Environment validation rejects a configured production authentication origin unless it uses HTTPS. Better Auth issues HTTP-only same-site cookies, uses secure cookies in production, and has origin and CSRF checks explicitly enabled. Necra's own cookie-authenticated mutation routes additionally require an exact configured `Origin` and reject cross-site Fetch Metadata.
- Keep self-service signup disabled by default. A deployment may set `AUTH_ALLOW_SIGN_UP=true` deliberately; creating an account grants no workspace or project access.
- Use Next.js `proxy.ts` only for an optimistic protected-page redirect. Every page, route handler, query, and mutation performs real server session and authorization checks.

## Authorization policy

The persisted role names are retained to avoid a destructive migration and map to product language as follows:

| Stored role   | Product role | Read | Write | Manage membership | Decide                                       |
| ------------- | ------------ | ---- | ----- | ----------------- | -------------------------------------------- |
| `manager`     | owner        | yes  | yes   | yes               | only with `can_decide`                       |
| `reviewer`    | collaborator | yes  | yes   | no                | only with `can_decide`                       |
| `participant` | viewer       | yes  | no    | no                | no, even if malformed data sets `can_decide` |

Both workspace and project memberships must be active. Missing, suspended, cross-workspace, cross-project, and underprivileged records return the same not-found result after authentication. The authoritative actor always comes from the verified session; route user IDs identify only mutation targets.

Role, status, and `can_decide` changes run in one transaction with an append-only audit event. Only active project owners can perform them, and a project cannot lose its last active owner. T010 must still recheck active membership and `can_decide` in the decision transaction; T003 does not implement decisions.

## Migration policy

Migration 0001 adds Better Auth tables and nullable name/email fields to existing `users`. Nullable fields preserve any pre-authentication T002 users without inventing identity data. Better Auth-created users always receive name and email. Existing rows require explicit provisioning before they can authenticate.

No T002 versioning, evidence, decision, or append-only constraint is removed or weakened.

## Security limitations and follow-up

- No email delivery provider is configured, so email ownership verification and password reset are not available. Public signup therefore remains opt-in and is unsuitable where verified email ownership is required.
- Better Auth's default process-local rate limiter is not a distributed production control. A hosted deployment needs platform/database-backed abuse protection before broad public signup.
- Only credential authentication is configured. OAuth, SSO, MFA, invitations, and an administrator provisioning UI are not implemented.
- PostgreSQL row-level security is not enabled. Server modules centralize authorization, but database credentials and operator access remain privileged.
- Session cookies require HTTPS in production; `BETTER_AUTH_URL` must match the public canonical origin.

## Verification

- The npm registry reported 1.7.15 as the current release for both `better-auth` and `@better-auth/drizzle-adapter` on 2026-11-02.
- Unit policies cover role mapping, default denial, suspended membership, viewer restrictions, explicit decision authority, and custom mutation origin checks.
- A real PostgreSQL integration suite drives Better Auth's HTTP handler for signup, sign-in, invalid/expired sessions, CSRF rejection, logout revocation, stable identity mapping, cross-project denial, suspended membership, decision authority, role escalation denial, and transactional role-change auditing.
- A Chromium browser suite covers signup, login, valid protected access, unauthenticated, invalid-cookie, and expired-session direct API access, cross-project and spoof attempts, revoked membership, forged mutation origin, logout invalidation, and protected-page redirects.

## Official references reviewed

Accessed 2026-11-02:

- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication
- Better Auth installation and concepts: https://www.better-auth.com/docs/installation
- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
- Better Auth email/password authentication: https://www.better-auth.com/docs/authentication/email-password
- Better Auth session management: https://www.better-auth.com/docs/concepts/session-management
- Better Auth security: https://www.better-auth.com/docs/reference/security
