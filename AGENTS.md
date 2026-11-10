# Necra Agent Instructions

This is the working agreement for anyone changing Necra. It keeps implementation, documentation, and status claims aligned with what has actually been built and tested.

## Mission

Build Necra as an agreement-change review product that people can trust with consequential project records. The product is for freelancers, agencies, contractors, and their clients. Its defining workflow is:

Original agreement → New instructions → Evidence-based comparison → Human review → Explicit decision → Auditable record

## Required reading order

Before changing the repository, consult these documents in order:

1. `AGENTS.md` — session rules and conflict handling.
2. `PRD.md` — product scope, users, workflows, and acceptance criteria.
3. `ARCHITECTURE.md` — system boundaries, data model, integrations, and deployment.
4. `DESIGN.md` — interaction and visual requirements.
5. `RULES.md` — engineering, security, evidence, and testing constraints.
6. `TASKS.md` — ordered work and task status.
7. `PROGRESS.md` — verified current state, defects, blockers, and next task.

This order moves from authority and product intent to implementation status. Re-read the sections relevant to the task immediately before changing code. Then inspect the code and tests, because documentation can lag behind the working tree.

## Session workflow

1. Confirm the first eligible, incomplete task in `TASKS.md` and its dependencies.
2. State any material assumptions. If an assumption could change product scope, evidence meaning, authorization, security, cost, or an external contract, stop and request direction.
3. Implement one small task at a time. Do not bundle unrelated work.
4. Add or update tests appropriate to the change.
5. Run the documented verification method and record only commands actually run and their real results.
6. Review the change for authorization, evidence integrity, error recovery, accessibility, and responsive behavior where applicable.
7. Update `TASKS.md` only when its acceptance criteria are met. Update `PROGRESS.md` after every task attempt, including failed or blocked attempts.
8. Report what changed, tests run, remaining risks, and the next task.

Never mark planned, partially implemented, mocked-only, or unverified work as complete. A test fixture must always be visibly and technically separated from production data.

## Conflict resolution

Apply instructions in this order:

1. Applicable law, platform safety controls, and security requirements.
2. Explicit current user instructions.
3. This `AGENTS.md` file.
4. `PRD.md` and `ARCHITECTURE.md`.
5. `DESIGN.md` and `RULES.md`.
6. `TASKS.md` and `PROGRESS.md`.
7. Existing implementation conventions.

When two instructions at the same level conflict, choose the safer, more reversible interpretation and document the conflict. Ask for clarification when it materially affects behavior or data. Documentation never overrides authentication, authorization, privacy, credential protection, evidence integrity, or other security requirements.

If implementation and documentation differ, do not silently normalize either one. Determine which is authoritative under the order above, fix only within the current task's scope, and record the discrepancy.

## Permanent product constraints

- Build real end-to-end behavior; never fabricate API responses, evidence, decisions, integration success, participant counts, or competition rules.
- A request is not an approval. Silence, message delivery, model output, and inferred intent are not approvals.
- Missing evidence is not a contradiction. Model findings are not verified human decisions.
- Preserve authentic source passages, provenance, document versions, and the relationship between every finding and its sources.
- Enforce access and state transitions on the server. Client-side checks are supplementary only.
- Keep credentials server-only and out of source, logs, browser bundles, test snapshots, and error responses.
- Use useful, non-deceptive errors with safe recovery paths.
- Use official Clocked documentation before implementing calls. Do not guess endpoints, payloads, schemas, authentication, rate limits, or guarantees.
- The Clocked playground has produced real Compare and Verify responses. Necra itself has not integrated with or verified Clocked yet; preserve that distinction until end-to-end tests prove otherwise.
- Do not claim originality without documented competitor research or production readiness without documented verification.

## Current implementation guidance — November 10, 2026

Necra has progressed beyond its initial implementation phase.

Future contributors must inspect the current repository and verification history before making changes.

The production application has demonstrated an agreement-to-decision workflow, including Clocked Grounding, explicit decision authority, authenticated human rejection, and persisted Decision Replay.

These observations must not be expanded into unsupported claims about complete production readiness.

### Required preparation

Before implementation:

1. Read all seven governance documents in the established order.
2. Review the relevant application code.
3. Inspect existing tests.
4. Identify the current incomplete task.
5. Confirm that proposed changes preserve the product's evidence and authorization boundaries.
6. Check the official competition requirements where relevant.

The Serial Hackathon Winner Playbook remains the governing competition strategy alongside these documents, subject to official competition rules and security constraints.

Do not reduce or replace its requirements.

### Current priorities

Prioritize:

- Accurate public documentation.
- Evidence-integrity correctness.
- Investigation of the missing change-request audit association.
- Authorization regression testing.
- Reproducible judge access.
- Reliable deployment and submission.

Do not add speculative features merely to increase apparent scope.

### Documentation and verification

Keep implementation, tests, and documentation synchronized.

Record only tests that were actually executed.

Distinguish historical verification from current production verification.

Never rewrite earlier progress records to imply that later decisions guided previous development.

Do not fabricate endpoint coverage, source evidence, audit records, user activity, security certifications, or competition results.

### Completion requirements

Before marking a new task complete:

- Confirm its acceptance criteria.
- Execute the relevant tests.
- Review authorization and evidence-integrity implications.
- Record observed results and limitations.
- Update `TASKS.md` and `PROGRESS.md`.
- Verify that public documentation remains accurate.

A working deployment is evidence of deployed functionality, not proof that every security, reliability, or operational requirement has passed.
