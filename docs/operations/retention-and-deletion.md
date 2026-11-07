# Retention and deletion policy

Necra's current release is an evaluation system for authorized, non-sensitive material. It is not approved for private customer agreements.

- Source versions, provider results, findings, reviews, decisions, and audit events are retained in PostgreSQL for the lifetime of the evaluation environment so Decision Replay remains complete.
- The application has no self-service deletion or selective history rewrite. Database constraints intentionally reject mutation or deletion of consequential records.
- Before creating an evaluation environment, its owner must set an end date and a named operator. Within 30 days after that end date, the operator must destroy the isolated application database and any backups under the hosting provider's verified deletion procedure, unless a documented legal hold applies.
- Test suites use visibly synthetic data in disposable databases and drop those databases after the run. A failed cleanup must be investigated before reuse.
- Clocked receives only the deliberately confirmed agreement/instruction text needed for a check. Necra does not claim a provider-side deletion period because Clocked's production data-handling terms have not been verified.
- Requests for access, correction, or deletion require operator review. If a request conflicts with append-only audit integrity, deployment counsel/owner must decide the lawful response; the product must not silently rewrite history.

Production use is blocked until the owner confirms applicable retention law, Clocked terms/DPA, subprocessors/regions, incident handling, backup deletion, and a tested request procedure.
