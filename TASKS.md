# Necra Implementation Tasks

This is the ordered delivery plan, not a feature wishlist. Each task has a concrete result, dependencies, acceptance criteria, and a verification method so that completion means more than code being present. `PROGRESS.md` records what was actually observed.

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
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-05. Nine official Clocked documentation/security/pricing pages were manually reviewed; strict text-only request/response schemas validated both official recorded response fixtures; Unicode code-point-to-UTF-16 conversion was tested; the full local quality/build gate passed. Credential-free fictional POSTs confirmed both live paths return HTTP 401 without a key. No authenticated success, credit use, or Necra integration is claimed.

### T007 — Implement Agreement Reality Check creation and processing states

- **Objective:** Create authorized, idempotent Agreement Reality Checks that snapshot exact evidence versions and progress through durable truthful states without assuming queue infrastructure.
- **Dependencies:** T002, T003, T005.
- **Acceptance criteria:** Inputs must be accessible and ready; confirmation shows exact versions; duplicates are controlled; pending/running/failed/completed states are durable; no state implies findings or approval before validated results; retries are safe and bounded.
- **Verification method:** State-machine unit tests, transaction/job integration tests including crashes and retries, tenant/role denial tests, and browser creation/status tests.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-05. Exact ready agreement/instruction versions are authorized and snapshotted with their document IDs, SHA-256 hashes, actor, workspace/project, a stable provider UUID, and a deterministic Grounding payload hash. PostgreSQL enforces immutable inputs, bounded attempts, legal optimistic-lock transitions, reconciliation for unknown outcomes, and validated-result requirements before completion. The final unit suite passed 9 files/39 tests, the real PostgreSQL suite passed 4 files/19 tests, and authenticated Chromium passed the create/reload/denial/accessibility workflow. No Clocked request or finding was created.

### T008 — Implement and verify the Clocked adapter

- **Objective:** Add the server-only Clocked adapter using the approved contract, then verify it against the real service in a non-production environment.
- **Dependencies:** T006, T007; authorized credentials and non-sensitive test evidence.
- **Acceptance criteria:** Secrets remain server-only; request/response runtime validation, timeouts, provider errors, bounded retries, and redaction work; raw results remain distinguishable from domain decisions; contract tests pass; at least one authorized Compare and, if required by the workflow, Verify call succeeds end to end and is recorded without sensitive payloads.
- **Verification method:** Unit/error tests, official-contract fixture tests, secret scan, and dated redacted staging integration run with correlation identifiers and observed results.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-06. A dedicated non-production WSL PostgreSQL role and loopback-only harness guard drove all 24 real-database integration tests, including authenticated live Grounding persistence and a live Compare call with fictional evidence. Grounding and Compare each returned `clocked-1.0`, 2 credits, and validated response hashes; the authenticated installed-Chrome workflow passed in 1.2 minutes. The full local gate passed 11 unit files/64 tests, strict types, lint, formatting, and production build; Drizzle migration consistency, secret scans, exact evidence checks, zero-decision checks, and disposable-database cleanup also passed. Redacted identifiers and observed usage are recorded in `PROGRESS.md`.

### T009 — Present Agreement Reality Check findings

- **Objective:** Normalize and display findings with authentic source passages, locators, categories, uncertainty, and provider origin.
- **Dependencies:** T004, T005, T008.
- **Acceptance criteria:** Findings distinguish change, conflict, ambiguity, and missing evidence; every supported claim navigates to exact stored passage/version; unsupported findings are labeled; provider/model output is never labeled a decision or verified human conclusion; mobile reading remains usable.
- **Verification method:** Normalization/citation integrity tests, malformed/unsupported finding tests, browser comparison flow, keyboard/screen-reader review, and responsive/accessibility checks.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-06. The authorized read projection renders only persisted Clocked claims, exact immutable input identities, verified quotations/UTF-16 offsets, and provider origin. Zero-reference claims show an explicit evidence-unavailable state without citations, scores, or falsehood claims. The full local gate passed 13 unit files/72 tests and a production build; real PostgreSQL passed 4 files/24 tests with one intentional live-only skip; the installed-Chrome workflow passed persisted evidence-present/evidence-absent rendering, reload, tenant denial, keyboard context inspection, axe scans, and 390px overflow.

### T010 — Implement human review and explicit decisions

- **Objective:** Support append-only review actions and deliberate authorized decisions without conflating either with automated findings or messages.
- **Dependencies:** T003, T007, T009; approved initial decision vocabulary.
- **Acceptance criteria:** Reviews preserve original findings; decision dialog identifies exact check/versions and never defaults to approval; only authorized explicit server action creates a decision; actor/time/authority/outcome/rationale/supersession are recorded transactionally; invalid/duplicate actions fail safely.
- **Verification method:** Domain/state tests; authorization and concurrency integration tests; prove messages/uploads/job completion cannot decide; complete browser decision flow with accessibility review.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-06. The initial vocabulary is exactly approve/reject. A deliberate dialog binds the choice to one persisted Reality Check and its immutable agreement/instruction versions; the transaction rechecks active membership and `can_decide`, derives the actor from the verified session, appends review/decision/audit records, updates the request state, and preserves supersession history. The final local gate passed 14 unit files/77 tests and production build; Drizzle migration consistency passed; all 30 applicable real-PostgreSQL integration tests passed with the one live-only provider test skipped; and installed Chrome passed the authenticated record/reload/unauthorized-replacement workflow with WCAG-tagged axe and mobile checks. The Playwright wrapper lingered after its reported pass and required manual interruption plus verified disposable-database cleanup.

### T011 — Build Decision Replay from the auditable record

- **Objective:** Provide Decision Replay as an authorized chronological ledger over genuine persisted sources, versions, requests, checks, findings, review actions, decisions, corrections, and origins.
- **Dependencies:** T005, T007, T009, T010.
- **Acceptance criteria:** History is append-only through APIs, tenant-scoped, ordered deterministically, attributable, and linked to evidence; every replay entry maps to a persisted record; gaps are shown rather than generated or inferred; supersession is visible without erasing history; exports, if added, apply the same authorization and redaction.
- **Verification method:** Audit integration tests, tamper/authorization tests, chronological browser flow, and timezone/accessibility review.
- **Completion status:** Complete.
- **Latest verification:** Completed on 2026-11-07. Decision Replay is a server-authorized, tenant-scoped read projection over persisted source versions, change requests, Reality Checks, provider results/findings, human reviews, decisions, and matching audit records. It orders equal timestamps deterministically, revalidates citations against exact stored text, labels human and external origin, exposes missing audit/evidence links without inventing events, and retains visible decision supersession. The full local gate passed 15 unit files/80 tests and the production build; Drizzle migration consistency passed; all 33 applicable real-PostgreSQL integration tests passed with one live-only provider test skipped; and installed Chrome passed the authenticated reload/chronology/keyboard/axe/mobile flow. The first browser attempt hit the recorded transient Next.js navigation failure before workflow entry; the clean rerun passed. The Playwright wrapper again lingered after its reported pass and required manual interruption followed by verified disposable-database cleanup.

### T012 — Harden, operate, and verify the initial release

- **Objective:** Validate the full story and operational controls before any production-readiness claim.
- **Dependencies:** T001–T011.
- **Acceptance criteria:** PRD acceptance criteria pass, including complete Agreement Reality Check and persisted-record-only Decision Replay flows; CI gates are active; security/privacy review, dependency/secret scan, retention/deletion policy, monitoring, backups and restore test, migration procedure, runbook, and production smoke checklist exist; known defects are triaged; competitor research exists before any originality claim.
- **Verification method:** Fresh-environment build; full automated suite; manual exploratory, keyboard, responsive, and failure-path review; authorized staging E2E; backup restoration exercise; documented release checklist with real results.
- **Completion status:** In progress.
- **Latest verification:** On 2026-11-07, the reviewed T008–T012 checkpoint was committed as `bc56504` and published without force to the previously empty `YakiUdoph/Necra` GitHub repository. The final local gate passed strict typecheck, lint, 15 unit files/80 tests, formatting, production build, migration consistency, staged/history secret-pattern review, and artifact/path review. This publication does not satisfy the remaining deployment, backup/restore, production smoke, or live deployed acceptance criteria.

## Submission readiness work — November 10, 2026

The following tasks extend the existing T012 release-hardening work.

They do not replace earlier tasks or retroactively alter completed development history.

### T013 — Correct public documentation

**Status:** In progress.

**Objective:** Ensure that public documentation accurately explains Necra's purpose, deployed architecture, implemented capabilities, testing procedures, and limitations.

**Acceptance criteria:**

- README begins with a clear product introduction.
- The main workflow is understandable without specialist terminology.
- Production deployment information is accurate.
- Clocked Grounding and Compare capabilities are distinguished correctly.
- Judge-access limitations are disclosed.
- Existing governance requirements remain intact.
- Documentation contains no fabricated verification results.

**Verification:** Review the final Markdown rendering, links, commands, and consistency with the repository.

### T014 — Investigate change-request audit coverage

**Status:** Not started.

**Objective:** Determine why the November 9 production Decision Replay displayed a change request without a matching audit event.

**Acceptance criteria:**

- Identify the relevant persistence and audit-event creation paths.
- Determine whether the missing association reflects an implementation defect, historical record condition, or projection issue.
- Add regression coverage for the confirmed cause.
- Preserve existing historical records.
- Do not generate fictional audit events to conceal the gap.

**Verification:** Relevant automated tests and an authorized end-to-end workflow.

### T015 — Verify production permissions and decision workflow

**Status:** Not started.

**Objective:** Revalidate the owner self-grant permission control and authenticated decision workflow after the latest production changes.

**Acceptance criteria:**

- Unauthorized users cannot grant themselves decision authority.
- Authorized owner permission changes persist.
- Decision controls reflect server-confirmed permissions.
- Unauthorized decision creation is rejected.
- Valid decisions persist across reloads.
- Earlier decisions remain available when superseded.

**Verification:** Authorization tests, integration tests, and browser verification.

### T016 — Establish judge evaluation access

**Status:** Not started.

**Objective:** Provide judges with a secure and reproducible way to evaluate the protected application workflow.

**Acceptance criteria:**

- Access method complies with competition requirements.
- Evaluation data is fictional and non-sensitive.
- No credentials are committed to the repository.
- The complete workflow can be reproduced.
- Evaluation instructions are clear.
- Access is tested independently before submission.

**Verification:** Follow the published instructions using the intended evaluation access method.

### T017 — Final submission verification

**Status:** Not started.

**Objective:** Confirm that the submitted project accurately represents the working application and satisfies the official competition requirements.

**Acceptance criteria:**

- Official rules and deadline verified.
- Actual Clocked endpoint usage documented.
- Repository and deployment accessible as required.
- No exposed credentials or confidential records.
- Demonstration uses authentic application behavior.
- Known limitations disclosed.
- Submission completed and confirmation retained.

**Verification:** Final submission review against the organizer's official requirements and recorded confirmation.

### Scheduling note

T013–T017 are submission-readiness tasks, not evidence that their acceptance criteria have passed.

T012 remains in progress until its outstanding release-hardening requirements are satisfied.

Competition submission may occur with disclosed nonblocking limitations where the official rules permit it, but this does not justify an unsupported production-readiness claim.
