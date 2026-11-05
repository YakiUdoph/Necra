# Necra Implementation Tasks

## Status vocabulary

Allowed values: `Not started`, `In progress`, `Blocked`, `Complete`.

A task is `Complete` only after every acceptance criterion passes and its verification is recorded in `PROGRESS.md`. Planned work remains `Not started`.

## Ordered tasks

### T000 — Establish project governance and specification

- **Objective:** Create and internally review the seven root project documents that define product, architecture, design, engineering rules, task order, and factual progress.
- **Dependencies:** None.
- **Acceptance criteria:** All seven files exist; they consistently distinguish requests, evidence, findings, reviews, and decisions; they accurately state that Clocked playground responses are real while Necra integration is unimplemented/unverified; planned product work is not marked complete; no API schema or unsupported provider behavior is invented.
- **Verification method:** Check file presence; search cross-document terminology/status; manually review workflow, architecture boundaries, task dependencies, and progress statements; inspect repository diff.
- **Completion status:** Complete.

### T001 — Bootstrap the verified development foundation

- **Objective:** Record an architecture decision, choose supported versions/tools, and scaffold the strict TypeScript web application with local quality commands and environment validation.
- **Dependencies:** T000.
- **Acceptance criteria:** Official documentation supporting runtime/framework/tool choices is linked with access dates; compatible maintained versions and a lockfile are recorded; app starts locally; strict types, lint, formatting, unit test, and production build commands exist; secret-bearing environment variables are server-only and validated; a test-only fixture path is isolated; README includes truthful setup steps; the accessible responsive shell names Agreement Reality Check and Decision Replay and honestly marks both unimplemented; no external service is presented as connected.
- **Verification method:** Fresh dependency install from lockfile; run typecheck, lint, unit test, and production build; start app and perform a local smoke check; inspect browser bundle/config for secret exposure.
- **Completion status:** Complete.

### T002 — Define persistence and immutable audit schema

- **Objective:** Implement migrations and typed persistence for tenants, engagements, evidence versions, checks, findings, reviews, decisions, and audit events.
- **Dependencies:** T001.
- **Acceptance criteria:** Constraints encode tenant ownership, immutable check inputs, append-only decisions/audit history, unique idempotency scopes, and valid references; migrations work from an empty database; no production data is used in tests.
- **Verification method:** Apply/rollback per migration policy on disposable databases; run schema integration tests for constraints, immutability, idempotency, and tenant separation.
- **Completion status:** Complete.

### T003 — Implement authentication and server authorization

- **Objective:** Add verified identity/session handling and centralized workspace/engagement authorization policies.
- **Dependencies:** T001, T002.
- **Acceptance criteria:** Protected routes default deny; all resource queries are tenant-scoped; roles and decision authority are explicit; direct-object, horizontal, and vertical escalation attempts fail without leaking resource existence; role changes are audited.
- **Verification method:** Unit tests for policies, database-backed authorization integration tests, and browser tests for login/logout/session expiry and denied routes.
- **Completion status:** Complete.
- **Latest verification:** Re-audited on 2026-11-02; production HTTPS validation and direct-API invalid/expired-session coverage passed without starting T004.

### T004 — Build the accessible product shell and design primitives

- **Objective:** Implement the visual tokens, typography, navigation shell, controls, status language, and reusable loading/error/empty patterns from `DESIGN.md`.
- **Dependencies:** T001, T003.
- **Acceptance criteria:** Responsive shell supports keyboard navigation and visible focus; tokens/components match the documented direction; sample content is explicitly test/story data; core components meet contrast and reduced-motion requirements.
- **Verification method:** Component tests, automated accessibility scan, keyboard/manual responsive review at defined breakpoints, and visual regression snapshots if adopted.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-03. The full typecheck/lint/unit/format/build gate, WCAG-tagged axe scans, keyboard navigation, responsive overflow checks at 320/390/768/1280px, and the real-session/disposable-PostgreSQL Playwright suite passed. No visual-regression baseline was adopted.

### T005 — Implement evidence ingestion and versioning

- **Objective:** Let authorized users add supported agreement/instruction sources while preserving originals, provenance, immutable versions, hashes, and truthful processing states.
- **Dependencies:** T002, T003, T004; decisions on storage, formats, limits, malware scanning, extraction, and retention.
- **Acceptance criteria:** Private storage and server authorization are enforced; new content creates a new version; hashes and provenance are stored; extraction is clearly derived; unsupported/malformed/failed inputs have recovery paths; source versions referenced by checks cannot be changed.
- **Verification method:** Unit tests for validation/hashing; integration tests for authorized storage, tenant isolation, version immutability, and extraction failure; browser upload/manual-entry flow; safe-file security checks.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-05. The local quality/build gate, Drizzle migration consistency check, 14-test real PostgreSQL integration suite, and authenticated installed-Chrome workflow against a disposable PostgreSQL database passed. Only pasted text is supported; file upload/extraction security checks are not applicable and unsupported file capabilities remain visibly deferred.

### T006 — Research and specify the Clocked contract

- **Objective:** Convert current official Clocked documentation and authorized observations into a reviewed provider note and adapter contract without yet claiming working integration.
- **Dependencies:** T001; access to official Clocked documentation.
- **Acceptance criteria:** Provider note cites official sources/access dates and documents verified authentication, endpoints, Compare/Verify schemas and semantics, errors, timeouts, limits, idempotency/retry guidance, and data terms; unknowns stay marked; internal types preserve citations and uncertainty; playground evidence is described separately from Necra behavior.
- **Verification method:** Peer/manual comparison against official documentation; schema examples validate as test-only contract fixtures; unresolved fields have no guessed defaults.
- **Completion status:** Not started.

### T007 — Implement Agreement Reality Check creation and processing states

- **Objective:** Create authorized, idempotent Agreement Reality Checks that snapshot exact evidence versions and progress through durable truthful states without assuming queue infrastructure.
- **Dependencies:** T002, T003, T005.
- **Acceptance criteria:** Inputs must be accessible and ready; confirmation shows exact versions; duplicates are controlled; pending/running/failed/completed states are durable; no state implies findings or approval before validated results; retries are safe and bounded.
- **Verification method:** State-machine unit tests, transaction/job integration tests including crashes and retries, tenant/role denial tests, and browser creation/status tests.
- **Completion status:** Not started.

### T008 — Implement and verify the Clocked adapter

- **Objective:** Add the server-only Clocked adapter using the approved contract, then verify it against the real service in a non-production environment.
- **Dependencies:** T006, T007; authorized credentials and non-sensitive test evidence.
- **Acceptance criteria:** Secrets remain server-only; request/response runtime validation, timeouts, provider errors, bounded retries, and redaction work; raw results remain distinguishable from domain decisions; contract tests pass; at least one authorized Compare and, if required by the workflow, Verify call succeeds end to end and is recorded without sensitive payloads.
- **Verification method:** Unit/error tests, official-contract fixture tests, secret scan, and dated redacted staging integration run with correlation identifiers and observed results.
- **Completion status:** Not started.

### T009 — Present Agreement Reality Check findings

- **Objective:** Normalize and display findings with authentic source passages, locators, categories, uncertainty, and provider origin.
- **Dependencies:** T004, T005, T008.
- **Acceptance criteria:** Findings distinguish change, conflict, ambiguity, and missing evidence; every supported claim navigates to exact stored passage/version; unsupported findings are labeled; provider/model output is never labeled a decision or verified human conclusion; mobile reading remains usable.
- **Verification method:** Normalization/citation integrity tests, malformed/unsupported finding tests, browser comparison flow, keyboard/screen-reader review, and responsive/accessibility checks.
- **Completion status:** Not started.

### T010 — Implement human review and explicit decisions

- **Objective:** Support append-only review actions and deliberate authorized decisions without conflating either with automated findings or messages.
- **Dependencies:** T003, T007, T009; approved initial decision vocabulary.
- **Acceptance criteria:** Reviews preserve original findings; decision dialog identifies exact check/versions and never defaults to approval; only authorized explicit server action creates a decision; actor/time/authority/outcome/rationale/supersession are recorded transactionally; invalid/duplicate actions fail safely.
- **Verification method:** Domain/state tests; authorization and concurrency integration tests; prove messages/uploads/job completion cannot decide; complete browser decision flow with accessibility review.
- **Completion status:** Not started.

### T011 — Build Decision Replay from the auditable record

- **Objective:** Provide Decision Replay as an authorized chronological ledger over genuine persisted sources, versions, requests, checks, findings, review actions, decisions, corrections, and origins.
- **Dependencies:** T005, T007, T009, T010.
- **Acceptance criteria:** History is append-only through APIs, tenant-scoped, ordered deterministically, attributable, and linked to evidence; every replay entry maps to a persisted record; gaps are shown rather than generated or inferred; supersession is visible without erasing history; exports, if added, apply the same authorization and redaction.
- **Verification method:** Audit integration tests, tamper/authorization tests, chronological browser flow, and timezone/accessibility review.
- **Completion status:** Not started.

### T012 — Harden, operate, and verify the initial release

- **Objective:** Validate the full story and operational controls before any production-readiness claim.
- **Dependencies:** T001–T011.
- **Acceptance criteria:** PRD acceptance criteria pass, including complete Agreement Reality Check and persisted-record-only Decision Replay flows; CI gates are active; security/privacy review, dependency/secret scan, retention/deletion policy, monitoring, backups and restore test, migration procedure, runbook, and production smoke checklist exist; known defects are triaged; competitor research exists before any originality claim.
- **Verification method:** Fresh-environment build; full automated suite; manual exploratory, keyboard, responsive, and failure-path review; authorized staging E2E; backup restoration exercise; documented release checklist with real results.
- **Completion status:** Not started.
