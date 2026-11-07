# Necra Engineering Rules

These rules turn Necra's product promises into reviewable engineering constraints. They are deliberately strict where a shortcut could change the meaning of evidence, grant access, imply approval, or hide a failure. When delivery pressure conflicts with these rules, preserve the safer behavior and record the blocker.

## Coding standards

- Use strict TypeScript. Do not introduce `any`, unchecked casts, or non-null assertions without a documented, narrowly scoped reason.
- Keep domain logic independent from UI and provider payloads. Validate data at every trust boundary.
- Prefer small modules, explicit names, pure functions for rules, and dependency injection at external boundaries.
- Use server-only modules for secrets, database access, object storage, provider calls, and authorization.
- Treat lint and type errors as failures; do not disable a rule globally to ship a local workaround.
- Pin supported runtime and dependency versions through the package manager lockfile. Review dependency necessity and maintenance/security posture.
- Use transactional migrations. Never edit an applied migration; add a new one.
- Store timestamps as UTC and render with clear locale/timezone context.
- Document non-obvious state machines and architecture decisions in `docs/decisions/`.
- Keep changes scoped to one `TASKS.md` task unless a discovered security issue requires immediate containment.

## Testing requirements

- Every behavior change needs a test at the lowest useful level plus integration or end-to-end coverage for important boundaries.
- Test happy paths, validation, permission denial, tenant isolation, invalid state transitions, retries/idempotency, and truthful failure behavior.
- Authorization tests must include horizontal and vertical privilege escalation attempts.
- Evidence tests must verify hashes/version immutability, citations against exact stored passages, and separation of missing evidence from contradiction.
- Decision tests must prove that messages, uploads, findings, and job completion cannot create an approval or decision.
- External adapters require schema/runtime validation, contract tests based on official documentation, and explicit error/malformed-response tests.
- Browser tests cover the complete Agreement Check workflow and keyboard-accessible critical paths.
- Test fixtures live only under test infrastructure, are unmistakably labeled, and cannot load in production paths.
- Never record a test in `PROGRESS.md` unless it was actually run. Record command, date, scope, and real result; retain failures.
- Do not claim an integration works from mocked tests alone. A real, authorized, redacted end-to-end test is required.

## Security restrictions

- Enforce authentication, authorization, tenant scoping, ownership, and state transitions on the server for every protected operation.
- Default deny. The client may hide unavailable controls but is never the enforcement point.
- Never trust submitted actor IDs, workspace IDs, roles, filenames, media types, object keys, redirects, or provider payloads.
- Keep secrets in approved environment/secret storage. Never commit, echo, log, serialize to the browser, place in URLs, or include them in screenshots/fixtures.
- Use parameterized queries, output encoding, CSRF defenses where applicable, secure cookies, restrictive content security policy, and safe redirect allowlists.
- Validate upload size/type/content, use private storage, safe generated object names, malware scanning when selected, and short-lived authorized downloads.
- Redact source content, personal data, tokens, and provider payloads from routine telemetry. Correlate using opaque IDs.
- Do not use production data in local, test, preview, demo, or evaluation environments.
- Security requirements override all project documentation and delivery pressure.
- Report and contain a discovered vulnerability; do not conceal it to satisfy a task status.

## Evidence integrity rules

- Originals and every source version are immutable after ingestion. Replacements create new versions.
- Compute and store a trusted content hash; never imply a hash proves facts beyond file equality/integrity.
- Preserve original bytes, derived extraction, exact cited passage, locator, provenance, and version relationship separately.
- Never alter source language for readability inside a citation. Paraphrases must be labeled and link to authentic text.
- Never create a citation to text that is absent from the recorded source version.
- “No evidence found” means only that the searched evidence did not establish the point. It is not a contradiction or proof of absence.
- Provider/model findings are unverified assertions until reviewed; human review is not a decision unless an authorized explicit decision action occurs.
- Never infer approval from natural-language messages, silence, attendance, upload, task completion, or provider verification.
- Corrections, reversals, and supersessions append events; they do not rewrite audit history.
- Preserve provider raw output securely for traceability under the approved retention policy, but render only validated content.

## API and integration rules

- Use current official documentation. Record sources and access dates in provider notes before implementation.
- Do not invent endpoints, fields, authentication, status semantics, limits, retries, idempotency, or availability guarantees.
- Keep providers behind typed adapters and translate to domain concepts without overstating provider output.
- Perform calls only from the server. Use explicit timeouts, bounded retries where safe, idempotency where supported, and rate-limit handling.
- Validate responses at runtime. Unknown, partial, or malformed responses fail visibly and must not produce substitute data.
- Log redacted correlation metadata, not credentials or sensitive payloads.
- Never claim an integration works until a real authorized call has passed end to end and the observed result is recorded.
- The existing real Clocked playground Compare and Verify responses establish only playground behavior. They do not establish Necra integration behavior.
- Respect provider data-use, retention, residency, and deletion terms; if unknown, treat them as a blocker for sensitive production evidence.

## UI and product rules

- Follow `DESIGN.md`; use beginner-friendly language and a clear recovery action for errors.
- Distinguish request, evidence, automated finding, human review, and explicit decision in copy and visual treatment.
- Never use fake loading percentages, fake activity, fabricated testimonials/data, or production-looking fixtures.
- Meet keyboard, semantic, focus, contrast, responsive, and reduced-motion requirements for every completed user flow.
- Do not claim “original,” “unique,” “secure,” “compliant,” or “production-ready” without the specific research or verification needed to support it.

## Prohibited shortcuts

- Hard-coded users, roles, approvals, findings, external responses, participant counts, or competition rules.
- Client-only authorization or state transitions.
- Silent fallback from a failed live service to fixtures, random data, or generated results.
- Treating a provider response or model confidence as verified fact.
- Mutating or deleting historical evidence/decision records to make a flow simpler.
- Swallowing errors, returning success before durable state exists, or marking a job complete without validated output.
- Shipping placeholder controls that imply unavailable functionality works.
- Disabling tests, types, security checks, or accessibility checks merely to pass CI.
- Marking planned work complete or claiming tests were run when they were not.
