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

function findingKey(kind: string, finding: QuoteFinding): string {
  return JSON.stringify([kind, finding.a.quote, finding.b.quote]);
}

function pairKey(pair: ComparePair): string {
  return JSON.stringify([pair.relation, pair.related, pair.duplicates, pair.conflicts]);
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
    <section className="analysis-findings" aria-label="Clocked Compare results">
      <h4>Agreement and instruction comparison</h4>
      <p>
        Clocked Compare checks how two saved versions relate. Its classifications are not
        legal conclusions or human approvals.
      </p>

      {!record ? (
        canWrite && configured ? (
          <CompareButton projectId={projectId} analysisId={analysisId} />
        ) : (
          <p>Compare has not been run.</p>
        )
      ) : (
        <>
          <p>
            <strong>Compare status:</strong> {record.status}
          </p>

          {record.status === "completed" && record.valid ? (
            <>
              <p>Validated provider: Clocked — {record.model}</p>

              {record.pairs.length === 0 ? (
                <p>Clocked returned no comparison pairs. No findings were invented.</p>
              ) : (
                record.pairs.map((pair) => (
                  <article className="finding-panel" key={pairKey(pair)}>
                    <p>
                      <strong>Relationship:</strong> {pair.relation} (related score:{" "}
                      {pair.related.toFixed(3)})
                    </p>

                    {pair.duplicates.map((finding) => (
                      <div key={findingKey("duplicate", finding)}>
                        <strong>Possible duplicate</strong>
                        <blockquote>{finding.a.quote}</blockquote>
                        <blockquote>{finding.b.quote}</blockquote>
                      </div>
                    ))}

                    {pair.conflicts.map((finding) => (
                      <div key={findingKey("conflict", finding)}>
                        <strong>Possible conflict</strong>
                        <blockquote>{finding.a.quote}</blockquote>
                        <blockquote>{finding.b.quote}</blockquote>
                      </div>
                    ))}

                    {pair.duplicates.length === 0 && pair.conflicts.length === 0 ? (
                      <p>
                        No quoted duplicate or conflict findings were returned for this
                        pair.
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </>
          ) : record.status === "completed" ? (
            <p>
              Stored comparison could not be verified against the immutable evidence.
              Findings are withheld.
            </p>
          ) : (
            <p>
              Compare did not complete successfully (
              {record.failureCode ?? "outcome pending"}). Grounding and human decisions
              remain unchanged. No automatic retry is available.
            </p>
          )}
        </>
      )}
    </section>
  );
}
