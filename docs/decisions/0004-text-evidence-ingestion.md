# ADR 0004: Text-first evidence ingestion

- **Status:** Accepted for T005
- **Date:** 2026-11-03

## Context

Necra needs a genuine evidence workflow before file extraction or an object-storage
provider has been selected. The first workflow must preserve source wording for later
quotation and offset verification without pretending that PDF, DOCX, OCR, or malware
scanning exists.

## Decision

- The initial supported source is manually pasted Unicode text for agreements and later
  instructions. A source may include a user-supplied title, optional source attribution,
  and optional received/observed timestamp. Unknown provenance remains visibly unknown.
- Each source and version is private PostgreSQL data reached only through authenticated,
  project-scoped server queries. PostgreSQL is the original store for this text-only
  capture method; no object-storage provider is required or represented as connected.
- Input is limited to 256 KiB of UTF-8 bytes per version and 300 KiB per JSON request.
  Empty/whitespace-only strings, null bytes, unpaired UTF-16 surrogates, unsupported
  formats, unknown fields, and malformed JSON/UTF-8 are rejected.
- Necra stores the exact JavaScript string submitted after transport decoding. It does
  not normalize Unicode, line endings, whitespace, or punctuation. SHA-256 is computed
  server-side over the exact UTF-8 encoding. Client hashes and version numbers are not
  accepted.
- Character offsets used by future evidence citations are zero-based, half-open
  `[start, end)` indexes in JavaScript/Unicode UTF-16 code units over the exact stored
  `content_text`. This convention matches string slicing in the web runtime. A future
  provider adapter must convert and verify any different provider offset convention.
- Pasted text has no extraction step: `content_text` is both the captured original and
  usable text, `capture_method` is `pasted_text`, media type is `text/plain`, and status
  is `ready` only after the transaction commits. Future uploaded bytes and derived
  extraction must remain separate records/fields and may not overwrite this content.
- Source identity/provenance and document-version rows are database-immutable.
  Revisions append a server-numbered version under a transaction-scoped advisory lock.
  Project-scoped idempotency keys make exact network retries safe and reject conflicting
  reuse.
- Retention/deletion remains restrictive: no user deletion is implemented and database
  foreign keys/triggers prevent rewriting or deleting evidence. A production retention
  and deletion policy is still required before production-readiness can be claimed.

## Deferred capabilities

PDF, DOCX, images, OCR, object storage, downloads, archive inspection, MIME sniffing,
malware scanning, extraction retry/replacement, and user-facing deletion are unsupported.
Because no file bytes are accepted, file malware scanning is not applicable to this
initial path. These capabilities require a later reviewed provider and retention decision.

## Consequences

The initial workflow is useful for exact text that users are authorized to record and is
fully testable without inventing external infrastructure. It does not establish that file
ingestion is safe or available, and PostgreSQL/database operators remain a privileged
boundary rather than a tamper-proof store.
