import type { AnalysisRecord } from "@/server/analysis/analysis-service";
import type {
  FindingSourceVersion,
  NormalizedFinding,
} from "@/server/analysis/finding-normalization";
import { DecisionDialog } from "../decisions/decision-dialog";

import { EmptyState, StatusLozenge } from "../ui/primitives";
import { ProcessRealityCheckButton } from "./process-reality-check-button";

const statusLabels = {
  pending: "Created",
  running: "Processing",
  reconciliation_required: "Outcome uncertain",
  failed: "Failed",
  completed: "Completed",
  evidence_missing: "Evidence unavailable",
} as const;

const verdictLabels = {
  supported: "Supported by the selected agreement",
  contradicted: "Contradicted by the selected agreement",
  not_stated: "Not stated in the selected agreement",
  not_a_claim: "Not treated as a factual claim",
} as const;

const verdictExplanations = {
  supported:
    "Clocked judged this claim supported by the selected agreement. That automated result is not a human conclusion or approval.",
  contradicted:
    "Clocked judged this claim contradicted by the selected agreement. A person must review the source before deciding what it means.",
  not_stated:
    "Clocked did not find this claim stated in the selected agreement. That does not prove the claim is false or contradictory.",
  not_a_claim:
    "Clocked did not treat this text as a factual claim. It remains available for human review.",
} as const;

const categoryLabels = {
  potential_change: "Potential change",
  possible_conflict: "Possible conflict",
  ambiguity: "Ambiguity",
  missing_evidence: "Missing evidence",
} as const;

const reviewStateLabels = {
  source_supported: "Source-supported",
  possible_conflict: "Possible conflict",
  unresolved: "Unresolved",
} as const;

function statusTone(status: AnalysisRecord["status"]) {
  if (status === "completed") return "active" as const;
  if (status === "running") return "info" as const;
  if (status === "failed" || status === "reconciliation_required") {
    return "warning" as const;
  }
  return "planned" as const;
}

function SourceSnapshot({
  source,
  label,
}: {
  source: FindingSourceVersion;
  label: string;
}) {
  return (
    <article className="analysis-source-card">
      <p className="source-kicker">{label}</p>
      <h4>{source.title}</h4>
      <p>Version {source.versionNumber} · immutable saved text</p>
      <dl className="analysis-source-identity">
        <div>
          <dt>Version identity</dt>
          <dd className="technical-value">{source.versionId}</dd>
        </div>
        <div>
          <dt>Content hash</dt>
          <dd className="technical-value">{source.contentHash}</dd>
        </div>
      </dl>
      <details>
        <summary>Read the exact analyzed text</summary>
        <div className="evidence-content">{source.content}</div>
      </details>
    </article>
  );
}

function SourceContext({
  finding,
  source,
}: {
  finding: NormalizedFinding;
  source: FindingSourceVersion;
}) {
  if (finding.evidence.state !== "verified") return null;
  const evidence = finding.evidence;
  return (
    <details
      className="source-context"
      id={`source-context-${source.versionId}-${finding.claimIndex}`}
    >
      <summary>Inspect this passage in the original agreement context</summary>
      <p className="source-context-meta">
        {evidence.sourceTitle}, version {evidence.sourceVersionNumber} · characters{" "}
        {evidence.startOffset}–{evidence.endOffset} (end exclusive)
      </p>
      <div className="document-context">
        {source.content.slice(0, evidence.startOffset)}
        <mark>{source.content.slice(evidence.startOffset, evidence.endOffset)}</mark>
        {source.content.slice(evidence.endOffset)}
      </div>
    </details>
  );
}

function FindingPanel({
  finding,
  source,
  checkId,
  origin,
}: {
  finding: NormalizedFinding;
  source: FindingSourceVersion;
  checkId: string;
  origin: NonNullable<AnalysisRecord["providerOrigin"]>;
}) {
  const headingId = `finding-${checkId}-${finding.claimIndex}`;
  return (
    <article
      className={`finding-panel finding-${finding.category}`}
      aria-labelledby={headingId}
    >
      <div className="finding-heading">
        <div>
          <p className="finding-category">{categoryLabels[finding.category]}</p>
          <h5 id={headingId}>{finding.claim}</h5>
        </div>
        <span className={`finding-review-state review-${finding.reviewState}`}>
          {reviewStateLabels[finding.reviewState]}
        </span>
      </div>
      <dl className="finding-metadata">
        <div>
          <dt>Automated result</dt>
          <dd>{verdictLabels[finding.verdict]}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>
            {origin.provider} · {origin.model}
          </dd>
        </div>
      </dl>
      <p className="finding-explanation">{verdictExplanations[finding.verdict]}</p>
      {finding.evidence.state === "verified" ? (
        <section className="finding-evidence" aria-label="Verified source passage">
          <p className="source-kicker">Verified source passage</p>
          <blockquote>{finding.evidence.quote}</blockquote>
          <p className="citation-source">
            {finding.evidence.sourceTitle}, version {finding.evidence.sourceVersionNumber}
          </p>
          <SourceContext finding={finding} source={source} />
        </section>
      ) : finding.evidence.state === "unavailable" ? (
        <section
          className="finding-evidence-unavailable"
          aria-label="Evidence unavailable"
        >
          <h6>No verified source passage was returned</h6>
          <p>
            Clocked returned this claim result without an evidence reference. Necra has
            not created a quotation or citation. Missing evidence does not establish that
            the claim is false.
          </p>
        </section>
      ) : (
        <section
          className="finding-evidence-invalid"
          aria-label="Source reference unavailable"
        >
          <h6>The stored source reference could not be verified</h6>
          <p>
            Necra will not display the quotation because it does not match the exact saved
            source version and offsets. This finding requires operator review.
          </p>
        </section>
      )}
      <p className="human-review-note">
        <strong>Human review required.</strong> No decision or approval is recorded by
        this finding.
      </p>
    </article>
  );
}

function CompletedFindings({ check }: { check: AnalysisRecord }) {
  if (!check.providerOrigin) {
    return (
      <section className="finding-evidence-invalid" aria-label="Result unavailable">
        <h4>Completed result metadata is unavailable</h4>
        <p>
          No findings are displayed because the persisted provider origin could not be
          verified.
        </p>
      </section>
    );
  }
  const origin = check.providerOrigin;
  return (
    <section className="analysis-findings" aria-labelledby={`findings-${check.id}`}>
      <div className="analysis-findings-heading">
        <div>
          <p className="workflow-kicker">Automated findings</p>
          <h4 id={`findings-${check.id}`}>What the analysis found</h4>
        </div>
        <p>
          {check.findings.length} {check.findings.length === 1 ? "claim" : "claims"}
        </p>
      </div>
      <p className="analysis-origin">
        Validated {origin.provider} output using {origin.model}. Provider output is
        evidence for review, not a verified human conclusion.
      </p>
      {check.findings.length > 0 ? (
        <div className="finding-list">
          {check.findings.map((finding) => (
            <FindingPanel
              checkId={check.id}
              finding={finding}
              key={finding.claimIndex}
              origin={origin}
              source={check.agreementSource}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Analysis completed with no claim results">
          <p>Clocked returned no claims. Necra has not generated substitute findings.</p>
        </EmptyState>
      )}
    </section>
  );
}

function DecisionRecord({
  check,
  canDecide,
}: {
  check: AnalysisRecord;
  canDecide: boolean;
}) {
  const currentDecision = check.decisions.find((decision) => decision.isCurrent) ?? null;
  const unresolvedFindingCount = check.findings.filter(
    (finding) => finding.reviewState !== "source_supported",
  ).length;
  return (
    <section className="change-record" aria-labelledby={`decision-${check.id}`}>
      <div className="analysis-findings-heading">
        <div>
          <p className="workflow-kicker">Human decision and change record</p>
          <h4 id={`decision-${check.id}`}>What an authorized person decided</h4>
        </div>
        {currentDecision ? (
          <StatusLozenge
            tone={currentDecision.outcome === "approved" ? "active" : "warning"}
          >
            {currentDecision.outcome === "approved" ? "Approved" : "Rejected"}
          </StatusLozenge>
        ) : (
          <StatusLozenge tone="planned">No decision</StatusLozenge>
        )}
      </div>

      {check.decisions.length > 0 ? (
        <ol
          className="decision-history"
          aria-label="Decision history for this Reality Check"
        >
          {check.decisions.map((decision) => (
            <li key={decision.id}>
              <div className="decision-history-heading">
                <strong>
                  {decision.outcome === "approved"
                    ? "Proposed change approved"
                    : decision.outcome === "rejected"
                      ? "Proposed change rejected"
                      : "Decision left unresolved"}
                </strong>
                <span className="decision-history-status">
                  {decision.isCurrent ? "Current decision" : "Superseded"}
                </span>
              </div>
              <p>
                Recorded by {decision.actorLabel} on{" "}
                <time dateTime={decision.decidedAt.toISOString()}>
                  {decision.decidedAt.toLocaleString(undefined, {
                    timeZoneName: "short",
                  })}
                </time>
                .
              </p>
              {decision.rationale ? (
                <blockquote className="decision-rationale-record">
                  {decision.rationale}
                </blockquote>
              ) : (
                <p className="field-help">No rationale was added.</p>
              )}
              <dl className="decision-record-identities">
                <div>
                  <dt>Decision identity</dt>
                  <dd className="technical-value">{decision.id}</dd>
                </div>
                <div>
                  <dt>Reality Check identity</dt>
                  <dd className="technical-value">{decision.analysisRunId}</dd>
                </div>
                <div>
                  <dt>Agreement version</dt>
                  <dd className="technical-value">{decision.agreementVersionId}</dd>
                </div>
                <div>
                  <dt>Instruction version</dt>
                  <dd className="technical-value">{decision.instructionVersionId}</dd>
                </div>
              </dl>
              {decision.supersedesDecisionId ? (
                <p className="field-help">
                  This record supersedes decision{" "}
                  <span className="technical-value">{decision.supersedesDecisionId}</span>
                  . The earlier record remains preserved above.
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No human decision has been recorded">
          <p>
            Automated findings and instruction text do not approve or reject this change.
          </p>
        </EmptyState>
      )}

      <p className="decision-review-summary">
        {check.reviewActions.length} authenticated human review confirmation
        {check.reviewActions.length === 1 ? " is" : "s are"} preserved separately from{" "}
        {check.findings.length} automated finding
        {check.findings.length === 1 ? "" : "s"}.
      </p>

      {canDecide ? (
        <DecisionDialog
          agreementTitle={check.agreementTitle}
          agreementVersionId={check.agreementVersionId}
          agreementVersionNumber={check.agreementVersionNumber}
          analysisId={check.id}
          changeRequestId={check.changeRequestId}
          instructionTitle={check.instructionTitle}
          instructionVersionId={check.instructionVersionId}
          instructionVersionNumber={check.instructionVersionNumber}
          projectId={check.projectId}
          supersedesDecisionId={currentDecision?.id ?? null}
          unresolvedFindingCount={unresolvedFindingCount}
        />
      ) : (
        <p className="decision-unavailable">
          You can inspect this record, but your active project membership does not grant
          decision authority.
        </p>
      )}
      <p className="field-help">
        A Necra decision is an auditable project record. It is not an electronic signature
        or a claim that the agreement was legally amended.
      </p>
    </section>
  );
}

export function RealityCheckList({
  checks,
  processingConfigured,
  canDecide,
}: {
  checks: AnalysisRecord[];
  processingConfigured: boolean;
  canDecide: boolean;
}) {
  if (checks.length === 0) {
    return (
      <EmptyState title="No Reality Checks have been created">
        <p>Select exact saved versions to create an auditable processing record.</p>
      </EmptyState>
    );
  }
  return (
    <div className="reality-check-list">
      {checks.map((check) => {
        const retryBlocked =
          check.failureCode === "provider_requires_new_attempt" ||
          check.failureCode === "input_integrity_failed" ||
          check.attemptNumber >= 4;
        const canProcess =
          check.status === "pending" ||
          check.status === "reconciliation_required" ||
          (check.status === "failed" && !retryBlocked);
        const actionLabel =
          check.status === "pending"
            ? "Start Clocked processing"
            : check.status === "reconciliation_required"
              ? "Reconcile with the original request"
              : "Retry Clocked processing";
        return (
          <article className="reality-check-card" key={check.id}>
            <div className="evidence-card-heading">
              <div>
                <p className="workflow-kicker">Reality Check</p>
                <h3>{check.instructionTitle}</h3>
              </div>
              <StatusLozenge tone={statusTone(check.status)}>
                {statusLabels[check.status]}
              </StatusLozenge>
            </div>

            <section className="analysis-inputs" aria-labelledby={`inputs-${check.id}`}>
              <div className="analysis-section-heading">
                <p className="workflow-kicker">Analysis inputs</p>
                <h4 id={`inputs-${check.id}`}>What the system evaluated</h4>
                <p>
                  These exact immutable versions were selected when this Reality Check was
                  created.
                </p>
              </div>
              <div className="analysis-source-grid">
                <SourceSnapshot
                  label="Selected agreement"
                  source={check.agreementSource}
                />
                <SourceSnapshot
                  label="Later instructions"
                  source={check.instructionSource}
                />
              </div>
            </section>

            <div className="analysis-state" aria-live="polite">
              {check.status === "pending" ? (
                <p>
                  <strong>Created, not processed.</strong> No provider finding exists yet.
                </p>
              ) : null}
              {check.status === "running" ? (
                <p>
                  <strong>Processing is in progress.</strong> Results will appear only
                  after validated provider output has been persisted.
                </p>
              ) : null}
              {check.status === "reconciliation_required" ? (
                <p>
                  <strong>The provider outcome is uncertain.</strong> Retrying preserves
                  the original request identity and exact payload.
                </p>
              ) : null}
              {check.status === "failed" ? (
                <p>
                  <strong>Processing did not complete.</strong> No substitute finding or
                  approval was created.{" "}
                  {retryBlocked
                    ? "This attempt needs operator review or a new Reality Check."
                    : "A bounded retry is available."}
                </p>
              ) : null}
              {check.status === "evidence_missing" ? (
                <p>
                  <strong>The selected evidence is unavailable.</strong> No finding is
                  shown because the exact analyzed versions could not be read.
                </p>
              ) : null}
            </div>

            {check.status === "completed" ? (
              <>
                <CompletedFindings check={check} />
                <DecisionRecord canDecide={canDecide} check={check} />
              </>
            ) : null}

            {canProcess ? (
              <ProcessRealityCheckButton
                actionLabel={actionLabel}
                analysisId={check.id}
                configured={processingConfigured}
                projectId={check.projectId}
              />
            ) : null}
            <p className="analysis-record-note">
              Created{" "}
              {check.createdAt.toLocaleString(undefined, { timeZoneName: "short" })} by an
              authenticated project member.{" "}
              {check.decisions.length > 0
                ? "The human decision is recorded separately above."
                : "No human approval recorded."}
            </p>
          </article>
        );
      })}
    </div>
  );
}
