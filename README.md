# NECRA

Clear agreements. Accountable changes. Decisions you can trace.

Necra helps freelancers, agencies, contractors, and their clients manage a common source of project disputes: the work agreed at the start is not always the work requested later.

Instead of relying on scattered messages or treating an automated assessment as a final answer, Necra preserves the original agreement, records later instructions, checks what the available evidence supports, and gives an authorized person a clear place to approve or reject a proposed change.

Live application: https://necra.vercel.app/
Source code: https://github.com/YakiUdoph/Necra

«Project status — November 9, 2026: The core workflow has been manually tested on the production deployment. This includes reviewing stored agreement versions, inspecting a completed Clocked Reality Check, granting decision authority, recording a human decision, and viewing that decision in Decision Replay. These observations confirm the specific workflow tested, not every possible security, failure, or access scenario.»

---

## The Problem

A client agrees to a website redesign. Later, they request a shopping cart, checkout, and payment processing.

The new request might sound like a small addition, but it raises several questions:

- Was this functionality included in the original agreement?
- What evidence supports that interpretation?
- Does the additional work require a new agreement?
- Who has authority to approve or reject the change?
- Can both parties reconstruct what happened months later?

These questions become difficult to answer when agreements, instructions, and decisions are scattered across messages and documents.

An automated comparison can help identify potential differences, but it cannot replace human judgment or establish contractual approval.

Necra addresses this problem by connecting the original evidence, subsequent requests, automated findings, and explicit human decisions in one traceable workflow.

## The Solution

Necra provides two connected capabilities.

Agreement Reality Check

Agreement Reality Check examines a selected original agreement version alongside later instructions.

It uses Clocked to assess whether claims about the requested work are supported by the agreement.

The application distinguishes between supported evidence, possible contradictions, and information that the agreement does not establish.

When a finding lacks a verifiable source passage, Necra reports that limitation instead of inventing a quotation.

Automated findings are presented for human review. They do not automatically approve or reject a request.

Decision Replay

Decision Replay reconstructs the recorded history of an agreement and its subsequent changes.

It connects stored source versions, change requests, Reality Checks, provider findings, human reviews, and explicit decisions.

Each recorded decision can be traced to the evidence versions considered at the time.

The history is built from persisted records rather than generated explanations of events that may not have happened.

Where a supporting audit record is missing, the interface identifies the gap.

---

## How Necra Works

### 1. Preserve the Original Agreement

Users create a workspace and project, then save the original agreement as text.

Necra stores the content with its version number, timestamp, and SHA-256 hash.

The original version remains available when later revisions are added.

### 2. Capture Later Instructions

Additional client requests are saved separately from the original agreement.

This distinction matters because a request for new work is not automatically evidence that the work was approved.

Each revision creates another stored version rather than overwriting the earlier record.

### 3. Run an Agreement Reality Check

Users select the exact agreement and instruction versions they want to examine.

Necra creates a durable Reality Check associated with those versions.

The server submits the relevant information to Clocked Grounding and validates the returned response before storing the results.

### 4. Examine the Findings

Necra presents the findings alongside their available evidence.

Where a provider supplies a source quotation, the application checks that it matches the selected stored agreement.

Where no verifiable quotation is available, the finding remains explicitly marked as lacking verified source evidence.

The application does not treat missing evidence as proof of a contradiction.

### 5. Record a Human Decision

An authenticated project member with decision authority can approve or reject the proposed change.

Decision authority is separate from project ownership.

A project owner can explicitly grant or revoke their own decision authority through Necra's membership-management workflow.

Before recording a decision, the authorized person reviews the relevant agreement, instructions, and findings.

The decision is stored with its outcome, decision-maker, timestamp, associated versions, and rationale where supplied.

Recording a decision does not modify the original agreement.

### 6. Review the Decision History

Decision Replay displays the stored sequence of events.

Users can trace the relationship between the original agreement, later instructions, automated findings, and human decisions.

A later decision can supersede an earlier one without deleting the previous record.

Important: A decision recorded in Necra is a project record. It is not an electronic signature, a legal amendment, or proof that another party accepted revised contractual terms.

---

## Production Verification

On November 9, 2026, Necra's core workflow was manually exercised on the production deployment.

The test used a project named Website Redesign Test.

The project contained an original website redesign agreement and a later request for online-store functionality.

Observed Results

Functionality| Observed result
Production application| Successfully deployed and accessible
Authentication| Project owner accessed protected project records
Agreement records| Original agreement and later instructions were available
Agreement Reality Check| Completed using Clocked
Automated findings| Two findings displayed
Evidence disclosure| Missing verified quotations were explicitly identified
Decision permissions| Owner explicitly granted decision authority
Human decision| Rejection recorded with a rationale
Decision persistence| Decision displayed with its associated records
Decision Replay| Seven chronological records displayed

The two Clocked findings concerned a possible scope conflict and the absence of established support for unchanged pricing.

Neither finding contained a verified source passage.

Necra preserved that distinction rather than presenting the findings as conclusively proven.

The project owner subsequently recorded a rejection of the proposed change.

Decision Replay displayed the associated agreement, instructions, change request, Reality Check, provider result, human review confirmation, and final decision.

One change-request record showed no matching stored audit event.

That issue remains open for investigation.

These observations come from a manual production session. They do not replace automated regression testing, independent judge-access verification, or a complete security assessment.

---

## Clocked Integration

Necra's production Agreement Reality Check uses the Clocked Grounding endpoint.

The integration is implemented on the server.

Processing Flow

1. Retrieve the selected immutable agreement and instruction versions.
2. Verify their stored content hashes.
3. Construct the Grounding request using the selected evidence.
4. Send the request to Clocked using server-side credentials.
5. Validate the response against the application's expected schema.
6. Verify returned source quotations against the exact agreement text.
7. Persist the validated findings and associated provider information.
8. Present the results for human review.

The integration includes request validation, response validation, timeout handling, failure classification, and idempotency controls.

The application also distinguishes between a confirmed provider failure and a network outcome that requires reconciliation.

Evidence Integrity

Necra does not accept a returned quotation merely because a provider supplied it.

The validation layer checks the source document identifier, quotation text, and character offsets against the stored agreement.

A mismatch produces an evidence-integrity failure rather than a verified citation.

When Clocked does not provide a verifiable passage, Necra preserves the evidence limitation.

Compare Adapter

The repository also contains a Clocked Compare adapter.

That adapter has recorded integration verification using fictional evidence.

However, the current production Reality Check uses Grounding. The existence of the Compare adapter should not be interpreted as proof that Compare is available as a completed user-facing workflow.

Additional endpoints will only be described as production features after their integration and behavior have been verified.

For further details, see "docs/providers/clocked-contract.md".

---

## Technical Architecture

Necra is built as a Next.js App Router application using React and TypeScript.

PostgreSQL is the source of truth for project records, authentication data, evidence versions, analyses, decisions, and audit history.

Drizzle ORM provides the typed database layer and migration tooling.

Better Auth handles credential-based authentication and sessions.

Protected server modules and route handlers enforce authorization and validate sensitive operations.

Technology Stack

Layer| Technology
Application framework| Next.js
User interface| React
Programming language| TypeScript
Styling| Tailwind CSS
Database| PostgreSQL
Database toolkit| Drizzle ORM
Authentication| Better Auth
Validation| Zod
Automated testing| Vitest
Browser testing| Playwright
Analysis provider| Clocked
Deployment| Vercel

Data Integrity

Necra preserves exact source versions instead of overwriting earlier evidence.

SHA-256 hashes help identify the stored content associated with each version.

Database transactions, constraints, and application-level authorization checks protect sensitive operations.

Human decisions are append-only records. A replacement decision supersedes an earlier decision rather than silently modifying it.

Authorization

Necra uses workspace and project memberships to control access.

Project permissions are enforced on the server.

Decision authority is an additional permission, separate from the user's displayed project role.

Project owners can explicitly manage their own decision authority through an audited permission-change operation.

The application does not rely solely on hiding buttons to enforce access restrictions.

Provider Security

Clocked requests originate from the server.

API credentials are not intended to be exposed to browser code.

Provider responses are validated before their contents are used.

The application includes controls for provider concurrency and request attempts.

For detailed architecture decisions, see "ARCHITECTURE.md".

---

## How to Test Necra

Option 1: Production Walkthrough

Application: https://necra.vercel.app/

The application is deployed, but protected project workflows require authentication.

A dedicated judge account has not yet been independently verified.

Public access to the application does not mean private project records are publicly accessible.

With an authorized evaluation account and fictional project data:

1. Sign in and create or open a workspace.
2. Create a project.
3. Save an original agreement.
4. Add later instructions.
5. Inspect the saved versions and timestamps.
6. Create an Agreement Reality Check using selected versions.
7. Process the check if Clocked is configured and the account is authorized to use provider credits.
8. Review the findings and any missing-evidence notices.
9. Explicitly enable decision authority if permitted and necessary.
10. Review the selected evidence and record an approval or rejection.
11. Refresh the page and confirm the decision remains available.
12. Open Decisions & Replay and inspect the recorded history.

A completed Reality Check does not automatically approve a proposed change.

Option 2: Local Development

Requirements

- Node.js ">=24.18.0 <25"
- npm ">=11.16.0 <13"
- PostgreSQL
- Chrome for browser testing

Use a disposable, non-production database and fictional agreement content.

Install Dependencies

npm.cmd ci

Create a local environment file:

Copy-Item .env.example .env.local

Configure the following values in ".env.local":

Variable| Purpose
"DATABASE_URL"| PostgreSQL connection string
"BETTER_AUTH_SECRET"| Random server-side secret of at least 32 characters
"BETTER_AUTH_URL"| Application origin
"AUTH_ALLOW_SIGN_UP"| Enables registration in an isolated evaluation environment
"CLOCKED_API_KEY"| Authorized Clocked credential for live processing
"CLOCKED_BASE_URL"| Clocked service base URL

For local development, use:

BETTER_AUTH_URL=http://localhost:3000
AUTH_ALLOW_SIGN_UP=true

Never commit credentials or environment files containing secrets.

Apply Database Migrations

Set the connection string for the intended disposable database:

$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"

npm.cmd run db:migrate

Remove-Item Env:DATABASE_URL

Start the Application

npm.cmd run dev

Open the local sign-up page:

"http://localhost:3000/sign-up"

Create an account and follow the production walkthrough using fictional data.

Local registration is disabled unless explicitly enabled.

---

## Testing and Quality Checks

Necra includes automated checks for application behavior, type safety, formatting, database integration, and browser workflows.

Standard Quality Check

npm.cmd run check

This command runs:

- TypeScript checking
- Linting
- Unit tests
- Formatting verification
- Production build

Additional commands:

npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run format:check
npm.cmd run build
npm.cmd run db:check

Integration and Browser Tests

Integration and browser tests require a disposable PostgreSQL environment.

$env:TEST_DATABASE_ADMIN_URL = "postgresql://necra_runner_test:PASSWORD@127.0.0.1:5432/postgres"

npm.cmd run test:integration
npm.cmd run test:e2e

Remove-Item Env:TEST_DATABASE_ADMIN_URL

The test harness restricts the database targets it accepts.

Never run these tests against production data.

Live Clocked Verification

Live Clocked tests are disabled by default.

They require an authorized API key and explicit opt-in:

CLOCKED_LIVE_TEST=true

Live requests may consume provider credits.

The repository records earlier authenticated integration verification using fictional evidence.

This README rewrite does not claim that the full automated test suite was rerun after the latest production changes.

Refer to "PROGRESS.md" for the dated verification history.

---

## Security and Data Integrity

Necra is designed around several important boundaries.

### Authentication and authorization: Protected records require authenticated access and appropriate workspace and project permissions.

### Immutable evidence: Agreement and instruction revisions preserve earlier versions rather than replacing them.

### Verified quotations: Provider-supplied passages are checked against stored source text before being treated as verified evidence.

### Human authority: Automated findings cannot independently approve a proposed change.

### Append-only decisions: Later decisions supersede earlier records without deleting the original history.

### Server-side credentials: Database credentials, authentication secrets, and Clocked credentials remain server-side.

### Mutation protection: Sensitive operations use authorization checks, origin protections, and validated inputs.

These are implemented design and code boundaries, not a claim of an independent security certification or completed external security audit.

PostgreSQL row-level security is not enabled. The application server and database administrators remain privileged trust boundaries.

---

## Project Documentation

Necra maintains seven project governance documents.

Document| Purpose
"PRD.md"| Product requirements, users, workflows, scope, and acceptance criteria
"ARCHITECTURE.md"| System architecture, data model, trust boundaries, and integration decisions
"DESIGN.md"| Visual design, interaction behavior, accessibility, and product language
"RULES.md"| Engineering standards, security, evidence integrity, and testing requirements
"TASKS.md"| Implementation tasks, dependencies, and acceptance criteria
"PROGRESS.md"| Verified implementation history, test results, known issues, and current status
"AGENTS.md"| Instructions and required reading order for contributors and coding agents

These documents should be consulted before changing the application.

Development history and verification results must remain accurate. Documentation must not imply that unperformed tests or earlier development activities occurred.

---

## Competition Submission

Necra is being prepared for the Clocked Build Challenge.

Its demonstrated value is the connection between an original agreement, a later request, an automated evidence assessment, and an explicit human decision.

The production application and its core workflow have been manually exercised.

However, competition submission is not yet confirmed.

Before submitting, the remaining requirements include:

- Confirming official competition eligibility and category requirements.
- Verifying the final submission deadline and required materials.
- Confirming repository visibility and reviewing it for exposed secrets.
- Establishing a secure way for judges to evaluate protected functionality.
- Reviewing current deployment health and outstanding audit issues.
- Preparing a demonstration using genuine application behavior.
- Confirming that the completed submission was accepted before the deadline.

The production Reality Check uses Clocked Grounding. Category-specific claims about other endpoints must be supported by actual implementation and testing.

---

## Project Principles

Necra is built around three commitments.

Preserve the evidence. Original agreements and later instructions should remain available in their recorded versions.

Keep findings separate from decisions. Automated analysis can inform a review, but it cannot replace explicit human authority.

Make the history traceable. A decision should be connected to the evidence considered and the person who recorded it.

---

Necra — Clear agreements. Accountable changes. Decisions you can trace
