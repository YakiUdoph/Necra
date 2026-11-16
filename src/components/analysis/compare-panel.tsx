import { StatusLozenge } from "../ui/primitives";
import { CompareButton } from "./compare-button";

interface QuoteFinding {
  a: { quote: string };
  b: { quote: string };
}

interface ComparePair {
  relation: string;
  related: number;
  duplicates: QuoteFinding[];
  conflicts: QuoteFinding[];
}

export interface CompareDisplay {
  status: string;
  model: string | null;
  failureCode: string | null;
  pairs: ComparePair[];
  valid: boolean;
}

const relationLabels: Record<string, string> = {
  same: "Substantially the same",
  overlapping: "Partial overlap",
  conflicting: "Possible conflict",
  unrelated: "No documented relationship",
};

function findingKey(kind: string, finding: QuoteFinding): string {
  return JSON.stringify([kind, finding.a.quote, finding.b.quote]);
}

function pairKey(pair: ComparePair): string {
  return JSON.stringify([pair.relation, pair.related, pair.duplicates, pair.conflicts]);
}

function compareTone(status: string) {
  if (status === "completed") return "active" as const;
  if (status === "running") return "info" as const;
  return "warning" as const;
}

function compareStatus(status: string) {
  if (status === "outcome_unknown") return "Outcome uncertain";
  if (status === "running") return "Processing";
  if (status === "completed") return "Completed";
  return "Failed";
}

function QuotePair({ finding }: { finding: QuoteFinding }) {
  return (
    <div className="compare-quote-grid">
      <blockquote>
        <span className="compare-quote-label">Agreement</span>
        {finding.a.quote}
      </blockquote>
      <blockquote>
        <span className="compare-quote-label">Later instructions</span>
        {finding.b.quote}
      </blockquote>
    </div>
  );
}

export function ComparePanel({
  projectId,
  analysisId,
  canWrite,
  configured,
  record,
}: {
  projectId: string;
  analysisId: string;
  canWrite: boolean;
  configured: boolean;
  record: CompareDisplay | null;
}) {
  return (
    <section
      className="analysis-findings compare-panel"
      aria-labelledby={`compare-${analysisId}`}
    >
      <div className="compare-panel-heading">
        <div>
          <p className="workflow-kicker">Supplementary comparison</p>
          <h4 id={`compare-${analysisId}`}>Agreement and instruction comparison</h4>
        </div>
        {record ? (
          <StatusLozenge tone={compareTone(record.status)}>
            {compareStatus(record.status)}
          </StatusLozenge>
        ) : null}
      </div>
      <p className="compare-introduction">
        Clocked Compare checks how the two exact saved versions relate. Its
        classifications support human review; they are not legal conclusions, approvals,
        or decisions.
      </p>

      {!record ? (
        canWrite && configured ? (
          <CompareButton projectId={projectId} analysisId={analysisId} />
        ) : !canWrite ? (
          <div className="compare-unavailable" role="note">
            <strong>Compare has not been run.</strong>
            <p className="compare-unavailable-copy">
              Your project access is read-only, so no provider request is available.
            </p>
          </div>
        ) : (
          <div className="compare-unavailable" role="note">
            <strong>Compare is not configured.</strong>
            <p className="compare-unavailable-copy">
              A server-side Clocked API key is required. The existing Reality Check and
              human decision record remain available.
            </p>
          </div>
        )
      ) : record.status === "completed" && record.valid ? (
        <>
          <p className="compare-provenance">
            Validated provider output · Clocked · {record.model}
          </p>
          {record.pairs.length === 0 ? (
            <p>Clocked returned no comparison pairs. No findings were invented.</p>
          ) : (
            record.pairs.map((pair) => (
              <article className="finding-panel compare-pair" key={pairKey(pair)}>
                <div className="compare-relationship">
                  <div>
                    <p className="source-kicker">Provider classification</p>
                    <h5>{relationLabels[pair.relation] ?? pair.relation}</h5>
                  </div>
                  <span className="compare-relatedness">
                    Relatedness signal {pair.related.toFixed(3)}
                  </span>
                </div>

                {pair.duplicates.map((finding) => (
                  <div className="compare-finding" key={findingKey("duplicate", finding)}>
                    <h6>Possible duplicate passage</h6>
                    <QuotePair finding={finding} />
                  </div>
                ))}

                {pair.conflicts.map((finding) => (
                  <div className="compare-finding" key={findingKey("conflict", finding)}>
                    <h6>Possible conflict between passages</h6>
                    <QuotePair finding={finding} />
                  </div>
                ))}

                {pair.duplicates.length === 0 && pair.conflicts.length === 0 ? (
                  <p>
                    No quoted duplicate or conflict findings were returned for this pair.
                  </p>
                ) : null}
              </article>
            ))
          )}
        </>
      ) : record.status === "completed" ? (
        <div className="compare-unavailable" role="alert">
          <strong>Stored findings are withheld.</strong>
          <p className="compare-unavailable-copy">
            The comparison could not be verified against the exact immutable evidence.
          </p>
        </div>
      ) : record.status === "running" ? (
        <div className="compare-unavailable" role="status">
          <strong>Compare is still processing.</strong>
          <p className="compare-unavailable-copy">
            Leave this page safely and reload later to inspect the persisted result.
          </p>
        </div>
      ) : record.status === "outcome_unknown" ? (
        <div className="compare-unavailable" role="alert">
          <strong>The provider outcome is uncertain.</strong>
          <p className="compare-unavailable-copy">
            Necra preserved the request identity and did not create substitute findings.
            Operator reconciliation is required before another attempt.
          </p>
        </div>
      ) : (
        <div className="compare-unavailable" role="alert">
          <strong>Compare did not complete.</strong>
          <p className="compare-unavailable-copy">
            Failure code: {record.failureCode ?? "processing_error"}. The existing Reality
            Check and human decisions remain unchanged; no automatic retry was made.
          </p>
        </div>
      )}
    </section>
  );
}
