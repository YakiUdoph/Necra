import { EmptyState, Notice, StatusLozenge } from "@/components/ui/primitives";
import type {
  DecisionReplay as DecisionReplayRecord,
  ReplayEvent,
} from "@/server/replay/decision-replay-service";

import { ReplayTimestamp } from "./replay-timestamp";

export function DecisionReplay({ replay }: { replay: DecisionReplayRecord }) {
  if (replay.events.length === 0) {
    return (
      <EmptyState title="No replayable project records yet">
        <p>
          Decision Replay will begin when a source version, Reality Check, review, or
          decision is persisted. It does not infer activity from silence.
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="decision-replay">
      <Notice title="Replay is a factual record, not a generated narrative">
        <p>
          Entries come from persisted project records and use their stored timestamps.
          Missing audit links and unavailable evidence are shown explicitly. This view
          does not prove that activity outside Necra did or did not happen.
        </p>
      </Notice>
      <ol className="replay-ledger" aria-label="Chronological decision replay">
        {replay.events.map((event, index) => (
          <li id={`replay-event-${event.id}`} key={`${event.kind}:${event.id}`}>
            <span className="replay-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <article className="replay-entry">
              <header className="replay-entry-heading">
                <div>
                  <p className="replay-kind">{kindLabel(event.kind)}</p>
                  <h3>{eventTitle(event)}</h3>
                </div>
                <StatusLozenge tone={eventTone(event)}>
                  {event.origin === "external" ? "Provider record" : "Human record"}
                </StatusLozenge>
              </header>
              <dl className="replay-identity">
                <div>
                  <dt>When</dt>
                  <dd>
                    <ReplayTimestamp value={event.occurredAt.toISOString()} />
                  </dd>
                </div>
                <div>
                  <dt>Actor / origin</dt>
                  <dd>{event.actorLabel}</dd>
                </div>
                <div>
                  <dt>Persisted record</dt>
                  <dd className="technical-value">{event.id}</dd>
                </div>
              </dl>
              <EventDetails event={event} />
              {event.audit ? (
                <p className="replay-audit">
                  {event.audit.relation === "direct"
                    ? "Direct audit event"
                    : "Linked audit event"}{" "}
                  <span className="technical-value">{event.audit.id}</span>, recorded{" "}
                  <ReplayTimestamp value={event.audit.occurredAt.toISOString()} />
                </p>
              ) : (
                <p className="replay-gap" role="note">
                  No matching audit event is stored for this record. The persisted record
                  is shown, but Replay does not invent a missing audit link.
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EventDetails({ event }: { event: ReplayEvent }) {
  switch (event.kind) {
    case "evidence_version":
      return (
        <div className="replay-details">
          <p>
            {sourceKindLabel(event.sourceKind)} · Version {event.versionNumber}
            {event.sourceAttribution ? ` · Source: ${event.sourceAttribution}` : ""}
          </p>
          {event.sourceObservedAt ? (
            <p>
              <span>Source-observed time: </span>
              <ReplayTimestamp value={event.sourceObservedAt.toISOString()} />
            </p>
          ) : null}
          <dl className="replay-bindings">
            <Binding label="Source document" value={event.sourceDocumentId} />
            <Binding label="Content hash" value={event.contentHash} />
          </dl>
          <details className="replay-source">
            <summary>Inspect exact stored source version</summary>
            {event.content === null ? (
              <p className="replay-gap">
                The source text is not stored in this database record, so it cannot be
                displayed here.
              </p>
            ) : (
              <pre>{event.content}</pre>
            )}
          </details>
        </div>
      );
    case "change_request":
      return (
        <div className="replay-details">
          <p>
            Current persisted request status: <strong>{humanize(event.status)}</strong>. A
            request is not an approval.
          </p>
          <dl className="replay-bindings">
            <Binding label="Instruction version" value={event.instructionVersionId} />
          </dl>
        </div>
      );
    case "analysis":
      return (
        <div className="replay-details">
          <p>
            Reality Check status: <strong>{humanize(event.status)}</strong>.
          </p>
          <dl className="replay-bindings">
            <Binding label="Change request" value={event.changeRequestId} />
            <Binding label="Agreement version" value={event.agreementVersionId} />
            <Binding label="Agreement hash" value={event.agreementContentHash} />
            <Binding label="Instruction version" value={event.instructionVersionId} />
            <Binding label="Instruction hash" value={event.instructionContentHash} />
          </dl>
        </div>
      );
    case "provider_result":
      return (
        <div className="replay-details">
          <p>
            Validated external result from <strong>{event.provider}</strong>, model{" "}
            <strong>{event.model}</strong>. Provider output is evidence for human review;
            it is not a decision.
          </p>
          <dl className="replay-bindings">
            <Binding label="Reality Check" value={event.analysisRunId} />
            <Binding label="Adapter" value={event.adapterVersion} />
            <Binding label="Response hash" value={event.responseHash} />
          </dl>
          {event.findings.length > 0 ? (
            <ol className="replay-findings">
              {event.findings.map((finding) => (
                <li key={`${event.id}:${finding.claimIndex}`}>
                  <p>
                    <strong>Finding {finding.claimIndex + 1}:</strong> {finding.claim}
                  </p>
                  <p>
                    Provider verdict: <strong>{humanize(finding.verdict)}</strong>
                  </p>
                  {finding.evidence.state === "verified" ? (
                    <div className="replay-citation">
                      <blockquote>{finding.evidence.quote}</blockquote>
                      <p>
                        Verified against {finding.evidence.sourceTitle}, version{" "}
                        {finding.evidence.sourceVersionNumber}, offsets{" "}
                        {finding.evidence.startOffset}–{finding.evidence.endOffset}.{" "}
                        <a href={`#replay-event-${finding.evidence.documentVersionId}`}>
                          Inspect the full stored source version
                        </a>
                      </p>
                    </div>
                  ) : finding.evidence.state === "unavailable" ? (
                    <p className="replay-gap">
                      No source passage was persisted for this finding. Missing evidence
                      is not a contradiction.
                    </p>
                  ) : (
                    <p className="replay-invalid" role="alert">
                      The stored evidence reference does not validate against the bound
                      agreement version. Replay will not present it as a verified
                      citation.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="replay-gap">
              No persisted findings are attached to this result.
            </p>
          )}
        </div>
      );
    case "review":
      return (
        <div className="replay-details">
          <p>
            Human review action: <strong>{humanize(event.action)}</strong>
            {event.note ? ` — ${event.note}` : ""}
          </p>
          <dl className="replay-bindings">
            <Binding label="Reality Check" value={event.analysisRunId} />
          </dl>
        </div>
      );
    case "decision":
      return (
        <div className="replay-details">
          <p>
            Explicit human outcome: <strong>{humanize(event.outcome)}</strong>.{" "}
            {event.isCurrent
              ? "This is the current decision."
              : "This decision was superseded."}
          </p>
          {event.rationale ? <blockquote>{event.rationale}</blockquote> : null}
          {event.supersedesDecisionId ? (
            <p>
              Supersedes decision{" "}
              <a href={`#replay-event-${event.supersedesDecisionId}`}>
                <span className="technical-value">{event.supersedesDecisionId}</span>
              </a>
              .
            </p>
          ) : null}
          <dl className="replay-bindings">
            <Binding label="Reality Check" value={event.analysisRunId} />
            <Binding label="Change request" value={event.changeRequestId} />
            <Binding label="Agreement version" value={event.agreementVersionId} />
            <Binding label="Instruction version" value={event.instructionVersionId} />
          </dl>
        </div>
      );
  }
}

function Binding({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="technical-value">{value}</dd>
    </div>
  );
}

function kindLabel(kind: ReplayEvent["kind"]) {
  return {
    evidence_version: "Source evidence",
    change_request: "Change request",
    analysis: "Reality Check",
    provider_result: "Automated comparison",
    review: "Human review",
    decision: "Human decision",
  }[kind];
}

function eventTitle(event: ReplayEvent) {
  switch (event.kind) {
    case "evidence_version":
      return `${event.title}, version ${event.versionNumber}`;
    case "change_request":
      return event.title;
    case "analysis":
      return "Reality Check created";
    case "provider_result":
      return "Validated provider result recorded";
    case "review":
      return "Review action recorded";
    case "decision":
      return event.supersedesDecisionId
        ? "Replacement decision recorded"
        : "Decision recorded";
  }
}

function eventTone(event: ReplayEvent) {
  if (event.kind === "decision") return event.isCurrent ? "active" : "neutral";
  if (event.kind === "provider_result") return "info";
  return "neutral";
}

function sourceKindLabel(kind: "agreement" | "instruction" | "attachment" | "manual") {
  return {
    agreement: "Agreement source",
    instruction: "Instruction source",
    attachment: "Attachment",
    manual: "Manual source",
  }[kind];
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}
