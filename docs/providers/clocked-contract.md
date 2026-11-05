# Clocked API contract note

- **Status:** Official text-mode contract reviewed for T006; no authenticated Necra call
  has been made.
- **Accessed:** 2026-11-05.
- **Scope:** `POST /clocked/compare` and `POST /clocked/grounding` over HTTPS.

This note distinguishes official documentation, unauthenticated transport observations,
and facts that remain unverified. Clocked's published recorded examples are not Necra
responses and do not establish model accuracy or stable output values.

## Official sources

- [Compare API](https://clocked.rezolve.ai/docs/compare)
- [Verify/Grounding API](https://clocked.rezolve.ai/docs/grounding)
- [Authentication](https://clocked.rezolve.ai/docs/authentication)
- [Responses and source positions](https://clocked.rezolve.ai/docs/responses)
- [Errors and retries](https://clocked.rezolve.ai/docs/errors)
- [Limits and usage](https://clocked.rezolve.ai/docs/limits)
- [Security and data handling](https://clocked.rezolve.ai/docs/security)
- [Security overview](https://clocked.rezolve.ai/security)
- [Pricing](https://clocked.rezolve.ai/pricing)

## Authentication and request identity

Officially documented:

- Base URL: `https://clocked.rezolve.ai/clocked`.
- Requests use HTTPS and `Content-Type: application/json`.
- `Authorization: Bearer <Clocked account API key>` is required. Website session cookies
  are not an API credential.
- `Idempotency-Key` is required and must be a UUID. Create one UUID for a new logical
  request. Retry an unknown outcome with the same key and byte-equivalent logical
  payload. Reusing a key with a different payload is a conflict; a completed key may
  replay its stored response.
- Keys use their owning account's credit and concurrency allowance. They must remain in
  a backend secret store and the Authorization header must never be logged.

Necra requirement: a future adapter reads `CLOCKED_API_KEY` only in a server-only module,
persists the request key with the exact analysis attempt, and never sends a document until
the transaction has confirmed the actor's active project authorization and exact input
version identifiers.

## Compare text contract

Officially documented endpoint: `POST https://clocked.rezolve.ai/clocked/compare`.

### Request

| Field          | Documented text-mode contract                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documents`    | Required. 2–20 non-empty strings or `{id, text}` objects. Necra will require unique explicit IDs. Maximum 200,000 source characters and a 58,000-token source/instruction admission budget. |
| `instructions` | Optional string, at most 20,000 characters. Source content must stay in source fields.                                                                                                      |
| `threshold`    | Optional number from 0 through 1; default `0.5`. It controls related passage reads and roll-up membership, not every finding's confidence.                                                  |
| `evidence`     | Optional `"all"`, `"flagged"`, or `"none"`; default `"flagged"`. Evidence may still be absent. Necra's planned request uses `"all"`.                                                        |
| `kinds`        | Optional boolean; default `true`. Enables duplicate/conflict kind classification.                                                                                                           |
| `rotations`    | Optional integer 1–8; documented default is adaptive. More rotations may increase work and latency.                                                                                         |
| `debug`        | Optional boolean; default `false`. Diagnostics are not an end-user contract.                                                                                                                |

Clocked also documents PDF-per-document input and `return_pdf`. Necra does not support
uploaded evidence, PDF requests, or returned PDF content and its text contract rejects
those fields.

### Response

A successful raw HTTP request returns the result object directly, not under `data`.
Documented core fields are:

- `model`, `verdict`, `threshold`, `evidence`, and `instructions_used`;
- `documents[]`, containing each document ID and IDs grouped as duplicates, overlaps,
  and conflicts;
- `pairs[]`, each with document IDs `a` and `b`, `relation` (`same`, `overlapping`,
  `conflicting`, or `unrelated`), `related`, the four alternative probabilities, and
  `duplicates[]`/`conflicts[]` findings;
- finding classification fields may include `kind`, `kinds`, and `confidence`; finding
  sides `a` and `b` contain `document`, `quote`, `start`, `end`, and `confidence`;
- top-level `duplicates`, `overlaps`, `conflicts`, and `related_pairs` are zero-based
  indexes into `pairs`, not document indexes;
- optional `stages` and `timing` are diagnostic objects and are not billing totals.

Twenty documents create 190 pair comparisons. A date or differing number alone does not
establish contradiction, a pair can contain both duplicate and conflict findings, and an
unrelated pair does not prove that requested work was absent or approved.

## Verify/Grounding text contract

Officially documented endpoint: `POST https://clocked.rezolve.ai/clocked/grounding`.
Clocked calls this capability Verify while the path and API reference use Grounding. It
checks an answer against supplied sources; it does not establish outside-world truth.

### Request

| Field          | Documented text-mode contract                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documents`    | Required for Necra text mode. 1–20 non-empty strings or `{id, text}` objects; 200,000 source characters total and a 58,000-token source/instruction admission budget. |
| `answer`       | Required non-empty string, at most 20,000 characters.                                                                                                                 |
| `question`     | Optional original question; adds a separate answer-relevance signal.                                                                                                  |
| `claims`       | Optional 1–30 explicit claim strings. If omitted, Clocked separates the answer into claims.                                                                           |
| `instructions` | Optional string, at most 20,000 characters.                                                                                                                           |
| `threshold`    | Optional number from 0 through 1; default `0.5`.                                                                                                                      |
| `evidence`     | Optional `"all"`, `"flagged"`, or `"none"`; default `"flagged"`. Necra's planned request uses `"all"`.                                                                |
| `rotations`    | Optional integer 1–8; default `3`.                                                                                                                                    |

Clocked separately documents PDF and native-image modes. Their request and response
contracts differ, and Necra intentionally does not accept them.

### Response

Documented text response fields are:

- `model`, `instructions_used`, `grounded`, `ungrounded`, `verdict`, and `threshold`;
- `claims[]`, each with `claim`, `kind`, `counted`, `weight`, probabilities for
  `supported`, `contradicted`, `not_stated`, and `not_a_claim`, selected `verdict`,
  per-document `sources`, nullable `source`, and optional evidence;
- optional evidence contains `document`, `quote`, `start`, `end`, and `confidence`;
- `documents[]` summarizes `id`, `share`, `share_of_answer`, and zero-based indexes into
  `claims`;
- `unsupported_claims`, `not_claims`, `weakest_claim`, and `answers_question` are
  conditional/optional result indexes or signals;
- optional `timing` contains engine diagnostics, not the account debit.

The aggregate grounded score is weighted by claim length, not the percentage of claims
that passed. `answers_question` is separate from grounding. `not_stated` means the
supplied sources do not establish the claim; it does not mean false.

## Evidence and offset semantics

Officially documented text offsets are zero-based and end-exclusive **Unicode code-point
indexes** into the exact submitted document named by `document`. They are not UTF-8 byte
positions, JavaScript UTF-16 indexes, grapheme indexes, or positions in concatenated
documents. Source strings must not be normalized, rewrapped, or have line endings changed.

Necra currently stores zero-based, half-open UTF-16 offsets. The adapter must therefore:

1. retain the exact request text for each provider document alias;
2. slice Clocked offsets by Unicode code point (`Array.from(text)` semantics);
3. require that the slice equals the returned quote exactly;
4. convert start/end code-point indexes to UTF-16 code-unit indexes;
5. verify the converted `content_text.slice(start, end)` still equals the quote;
6. reject/quarantine the finding if the document alias, range, or quotation fails.

Evidence is optional even when requested. Necra must never manufacture a quote or offset
when Clocked omits evidence.

## Errors, timeout, retry, and rate limits

Official error bodies contain a human-readable `error` and may contain
`retryAsNew: true`; HTTP status is authoritative and message wording is not stable.

| Status        | Required handling                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `400` / `422` | Invalid request. Correct it; do not retry unchanged.                                                               |
| `401` / `403` | Invalid/revoked credential or access. Do not retry indefinitely.                                                   |
| `402`         | Credits unavailable. Stop and require account/billing action.                                                      |
| `409`         | Key/payload/in-progress/completed conflict. Preserve the original key; inspect `retryAsNew`. Do not blindly retry. |
| `413`         | Body too large. The account gateway limit is 3.5 MB. Reduce the request.                                           |
| `429`         | Concurrency limit. Queue and retry with bounded exponential backoff; `Retry-After` is not guaranteed.              |
| `5xx`         | Transient service/upstream failure. Retry within a bounded budget unless `retryAsNew` says the attempt ended.      |

The account gateway permits up to 110 seconds for a model request. Published SDK
per-attempt timeouts are 120 seconds for JavaScript and 130 seconds for Python. A client
timeout does not prove backend cancellation. T008 must use a recoverable persisted state,
the original idempotency key, an explicit overall retry budget, and no automatic new-key
retry. T006 does not choose retry counts without workload measurements.

Published concurrency is 1 Trial, 4 Build, 8 Production, and 16 Scale. Actual account
plan/allowance must be checked before sizing workers. No throughput or latency SLA is
documented for Necra's account.

## Credits and observable transport metadata

Officially documented successful-response headers:

- `X-Clocked-Model-Ms`: model time used to calculate credits;
- `X-Clocked-Credits`: model time at 25 ms per credit, rounded up, minimum 1;
- `X-Clocked-Cost-Usd` and `X-Clocked-Cost-Basis`: request cost and whether it is
  prepaid, overage, mixed, or trial reference pricing;
- `X-Clocked-Transport`: upstream path or `replay`;
- `Server-Timing`: gateway stages.

An idempotent replay repeats stored credit/cost headers and is not charged again. Optional
response timing fields and token counts are not billing debits. Pricing and overage vary
by plan and may change; account usage records are authoritative.

## Necra request and result mapping

For one Agreement Reality Check, T007 must first persist a check that snapshots the exact
agreement and instruction `document_versions.id` values. After server authorization and
content-integrity validation, T008 may create provider aliases local to that attempt:

- `agreement` -> exact selected agreement version and `content_text`;
- `instruction` -> exact selected later-instruction version and `content_text`.

Aliases and input version IDs must be persisted together; returned aliases may not select
a different record. The provider receives text, not Necra user/workspace/project IDs.

Planned semantic mapping:

| Clocked result                           | Necra interpretation before human review                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Grounding `supported`                    | Supported by the selected agreement evidence; never approval.                                                                |
| Grounding `contradicted`                 | Possible conflict requiring evidence validation and human review.                                                            |
| Grounding `not_stated`                   | Information not established by the selected agreement; potential change or missing evidence, never contradiction by absence. |
| Grounding `not_a_claim`                  | Non-factual/uncounted text; retain separately or require review, not a finding of approval.                                  |
| Compare `conflicting` / conflict finding | Possible conflict only after quotation validation.                                                                           |
| Compare `same` / duplicate finding       | Restated or shared content, not authorization.                                                                               |
| Compare `overlapping`                    | Partial relationship requiring review; not automatically a scope decision.                                                   |
| Compare `unrelated`                      | No documented pair relationship; not proof of absence or approval.                                                           |

Grounding is the closer fit for evaluating later-instruction claims against the agreement:
the selected agreement is `documents[0].text`, and exact later-instruction text is
`answer`. Compare may provide supplementary pair-level overlap/conflict evidence but does
not itself determine a contractual change. T008 must preserve raw validated provider
probabilities/verdicts separately from Necra categories, reviewer actions, and decisions.

## Data handling and privacy

Official documentation states that requests pass through an authenticated HTTPS account
gateway hosted on Vercel, then through an authenticated TLS tunnel to a model container on
Modal. Successful response bodies are retained for idempotent replay with scheduled
cleanup after 24 hours; that is not a hard deletion-time guarantee. Account/usage records
retain request IDs, payload hashes, credits, timing, and billing metadata separately.
Operational log retention and enabled diagnostics require confirmation. Optional feedback
persists submitted text/labels separately and has no automatic deletion period; Necra must
not use it without a separate decision.

Before any sensitive production evidence is sent, Necra still needs documented agreement
on processing region, subprocessors, contractual terms/DPA, deletion guarantees, access
controls, incident handling, and diagnostic-log retention. Until then, live verification
must use fictional non-sensitive text, and production-sensitive Clocked processing remains
blocked.

## Live observations on 2026-11-05

No API key was available, so no authenticated inference, response schema, latency, model,
credit, or cost was observed through Necra.

Two credential-free cURL POSTs used fictional text and valid JSON/idempotency headers:

- Compare returned HTTP `401`, `{"error":"Use a Clocked account API key."}`, in
  1.481014 seconds.
- Grounding returned HTTP `401`, the same body, in 0.950096 seconds.

Both exposed the documented Clocked timing/credit/cost header names through CORS but
returned no model, credit, or cost values. These are transport observations only—not
playground results, authenticated application tests, or evidence that the documented
success schemas were observed live.

## Explicitly unverified

- Authenticated success responses and headers from Necra or a direct authorized request.
- Real Compare/Grounding latency, accuracy, credit debit, cost, and account concurrency.
- Exact provider behavior when a successful response adds undocumented fields.
- Token-count admission before a request is sent; Necra can enforce characters but needs
  a provider-compatible tokenizer or must handle a documented validation failure.
- Contractual processing region, residency, subprocessors, DPA, deletion SLA,
  operational-log content/retention, support SLA, and incident commitments.
- Whether any future Clocked model/deployment change preserves observed calibration.

T006 does not implement an HTTP adapter, create a check, call Clocked with credentials, or
describe Clocked as integrated. Those belong to T007 and T008.
