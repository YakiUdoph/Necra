# Necra Product Requirements

## Product summary

Necra gives both sides of client work a shared, evidence-backed way to understand the original agreement, identify how later instructions may change it, review the evidence, make an explicit decision, and retain an audit trail.

Necra is a decision-support and record-keeping product. Automated comparisons surface findings; authorized people decide what those findings mean for the engagement.

## Signature experiences

### Agreement Reality Check

Agreement Reality Check identifies possible changes between a selected original agreement version and later instructions. It grounds each finding in authentic source evidence, distinguishes a request from an approval, exposes missing or ambiguous evidence, and requires human review before any explicit decision can be recorded.

### Decision Replay

Decision Replay presents the chronological history of genuine persisted agreement versions, requests, automated findings, human reviews, and explicit decisions. It is a projection of the audit record with links back to its sources—not a separate AI-generated narrative or reconstructed timeline. If a required record is absent, Decision Replay shows the gap rather than inventing an event.

## Target users

- Freelancers and contractors who need to identify and resolve scope changes without damaging client relationships.
- Agencies and their project leads who manage agreements, change requests, approvals, and multiple stakeholders.
- Clients who need a clear account of what was agreed, what is newly requested, and what decision is expected from them.
- Workspace administrators who manage membership and access without deciding project changes by default.

Users may be non-technical, working under time pressure, and unfamiliar with formal change-control language.

## Problems to solve

- Agreements and later instructions are scattered across files and messages.
- Parties interpret the same language differently and lose the relevant source passages.
- New requests are mistaken for approved scope changes.
- Missing evidence is incorrectly treated as proof that something did or did not happen.
- Automated analysis is mistaken for a binding decision.
- Decisions are made without recording who decided, when, what evidence was reviewed, and which document version applied.
- Users struggle to recover from unsupported files, integration failures, incomplete analysis, or authorization errors.

## Product principles

- Truth over fluency: say when evidence is missing, ambiguous, or unavailable.
- Human authority: comparisons support review; only an authorized, explicit action records a decision.
- Source fidelity: preserve originals, versions, passages, and provenance.
- Mutual clarity: use calm, neutral language rather than adversarial or legalistic framing.
- Progressive disclosure: show the decision and evidence summary first, with full detail available.
- Honest operation: label samples and fixtures, expose failures, and never claim untested integrations work.

## Primary workflows

### Workspace and engagement setup

1. An authenticated user creates or joins a workspace.
2. An authorized member creates an engagement and identifies its participants.
3. The user adds the original agreement as a source document.
4. Necra stores an immutable document version, provenance, extraction status, and content hash.
5. The user reviews the extracted content before it is treated as usable evidence.

### Complete Agreement Reality Check workflow

1. **Select the original agreement.** The user selects a specific, successfully processed document version. Necra never silently substitutes a newer or different version.
2. **Add new instructions.** The user supplies later instructions as text or a supported source. Necra records the source, author or uploader when known, observed/received time when known, capture time, and immutable content version. A message is recorded as evidence, not authorization.
3. **Confirm inputs.** Necra displays the exact sources and versions that will be compared. The user can correct selection or cancel.
4. **Request comparison.** An authorized server action creates a check with a stable identifier and snapshots its input version identifiers. The request is idempotent against accidental repeats.
5. **Process evidence.** The server validates access, extraction state, source integrity, and required content. Missing or unusable evidence produces an explicit state and recovery instruction.
6. **Run comparison.** Through a server-only integration boundary, Necra requests evidence-based comparison. When Clocked is used, the implementation must follow its official documentation. External output and metadata are retained without presenting them as human-verified truth.
7. **Present findings.** Each finding is classified as one of: potential change, possible conflict/contradiction, ambiguity, or missing evidence. Each claim links to authentic passages from the applicable original agreement version and new-instruction version. Confidence or uncertainty is communicated without implying authority.
8. **Human review.** An authorized reviewer inspects findings, opens source context, adds notes, and may correct or dismiss individual findings. Model/external-service findings remain distinguishable from reviewer conclusions.
9. **Explicit decision.** An authorized decision-maker deliberately chooses an allowed outcome, confirms the exact scope of that decision, and submits it. The initial decision vocabulary will be finalized before implementation; no decision may be inferred from messages, inactivity, or analysis output.
10. **Record decision.** Necra appends an auditable event containing actor, role, timestamp, check/input versions, selected outcome, optional rationale, and supersession relationship if applicable. Previously recorded events are not overwritten.
11. **Communicate and follow up.** Participants can view the outcome and remaining items requiring action. Failed notification delivery, if notifications are later implemented, does not alter the decision state.
12. **Re-open through a new record.** Later evidence or reconsideration creates a new review/decision event linked to the prior record; it does not rewrite history.

### Decision Replay

An authorized participant can view a chronological history of persisted source creation, versioning, requests, checks, findings, reviews, and explicit decisions. Each entry identifies its origin (human, system, or external service) and links to the applicable evidence. The replay is derived deterministically from stored records and never fills a gap with generated content.

## Functional requirements

### Identity and access

- Authenticate users and maintain secure sessions.
- Support workspace and engagement membership with explicit roles.
- Authorize every protected read, write, download, comparison, review, and decision on the server.
- Prevent workspace and engagement data leakage through identifiers, search, logs, exports, or errors.

### Sources and evidence

- Accept an intentionally limited initial set of source formats, selected during implementation after extraction reliability is evaluated.
- Store original objects separately from extracted text.
- Create immutable versions and content hashes; never mutate a version used by a check.
- Preserve authentic passages and offsets/page or message references when the source provides them.
- Show extraction failures and let users replace, retry, or manually provide text with clear provenance.

### Agreement checks

- Require explicit selection of original and new-instruction versions.
- Capture input versions at creation and expose processing status.
- Represent findings, citations, uncertainty, missing evidence, and contradictions separately.
- Support retry without duplicate decisions or indistinguishable duplicate checks.
- Retain raw provider responses securely for diagnosis/audit subject to an established retention policy; render only validated data.

### Review and decisions

- Allow authorized review actions while retaining original machine/provider findings.
- Require an explicit server-validated decision action.
- Record actor, time, input versions, outcome, rationale, and prior decision relationship.
- Make recorded history append-only through application APIs; corrections are new events.
- Clearly display pending, reviewed, decided, superseded, failed, and evidence-missing states.

### Usability and operations

- Provide accessible, responsive flows for first-time users.
- Provide empty, loading, success, partial, and error states with a recovery action.
- Emit structured operational logs without source content or secrets by default.
- Provide health and integration diagnostics that do not expose credentials.

## Nonfunctional requirements

- **Security:** follow current OWASP guidance; secure cookies; CSRF protection where applicable; validation at trust boundaries; least privilege; encrypted transport and managed encryption at rest.
- **Privacy:** minimize collected content; define retention and deletion behavior before production use; exclude sensitive evidence from analytics and routine logs.
- **Reliability:** durable state transitions, idempotent external jobs, bounded retries, and no false success state.
- **Performance:** target p75 under 2 seconds for ordinary authenticated navigation, excluding document processing and external comparison; show progress for longer operations.
- **Accessibility:** target WCAG 2.2 AA, keyboard operability, visible focus, semantic structure, sufficient contrast, and reduced-motion support.
- **Auditability:** timestamps stored in UTC, stable identifiers, immutable input references, origin attribution, and append-only decision history.
- **Observability:** correlate requests and jobs with opaque IDs; distinguish user, validation, provider, and internal failures.
- **Maintainability:** strict typing, documented boundaries, migrations, automated tests, and small reviewable tasks.

## Out of scope for the initial release

- Automatic legal advice, contract drafting, or declarations of breach.
- Automatic approval, rejection, pricing, invoicing, payment, or contract amendment.
- Inferring authorization or decision rights from message text alone.
- Broad email/chat ingestion, continuous surveillance, or unbounded inbox access.
- E-signature, court-ready evidence certification, or regulatory compliance claims.
- Native mobile applications; responsive web is in scope.
- Public marketplace, competitions, rankings, participant counts, or originality claims.
- Provider-independent claims about semantic accuracy until measured with a reviewed evaluation set.

## Measurable acceptance criteria for the initial release

- An authenticated authorized user can create an engagement, add an agreement and new instructions, confirm exact versions, and create one Agreement Check end to end.
- An unauthorized user cannot read or mutate another workspace's engagements, sources, checks, findings, or decisions; automated tests cover direct-object access attempts.
- Every displayed finding links to at least one authentic stored source passage or is explicitly labeled as unsupported/missing evidence.
- The interface visually and semantically distinguishes provider/model findings, reviewer annotations, and explicit decisions.
- No message, upload, comparison completion, or provider response creates an approval.
- A decision is created only by a deliberate authorized server request and records actor, UTC time, source/check versions, outcome, and audit event.
- Agreement Reality Check requires exact input versions, authentic cited passages, human review, and an explicit authorized decision; it never promotes a request or automated finding to approval.
- Decision Replay displays only genuine persisted records in deterministic chronological order, identifies each record's origin, links to applicable versions/evidence, and never generates missing events.
- Source versions used in a completed check cannot be edited through application APIs.
- Provider timeouts, malformed responses, extraction failures, and authorization failures produce accurate states and actionable recovery paths without invented results.
- Clocked behavior is covered by contract tests based on official documentation and at least one authorized end-to-end test against its real service before the integration is described as working.
- Core workflow tests pass in CI; accessibility checks cover core screens; no production bundle or routine log contains credentials.
- Deployment runbook, backup/restore check, retention policy, monitoring, and production smoke test exist before any production-readiness claim.
