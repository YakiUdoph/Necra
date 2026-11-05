import type { EvidenceSourceRecord } from "@/server/evidence/evidence-service";

import { StatusLozenge } from "@/components/ui/primitives";
import { VersionForm } from "./version-form";

export function EvidenceList({
  projectId,
  sources,
  canWrite,
}: {
  projectId: string;
  sources: EvidenceSourceRecord[];
  canWrite: boolean;
}) {
  return (
    <ul className="evidence-list">
      {sources.map((source) => {
        const latest = source.versions.at(-1);
        return (
          <li className="source-card" key={source.id}>
            <header className="source-card-header">
              <div>
                <p className="workflow-kicker">
                  {source.kind === "agreement" ? "Agreement" : "Later instruction"}
                </p>
                <h3>{source.title}</h3>
              </div>
              <StatusLozenge tone="active">
                Ready · v{latest?.versionNumber}
              </StatusLozenge>
            </header>
            <dl className="source-metadata">
              <div>
                <dt>Source</dt>
                <dd>{source.sourceAttribution ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>Received / observed</dt>
                <dd>{formatUtc(source.sourceObservedAt)}</dd>
              </div>
              <div>
                <dt>Captured by Necra</dt>
                <dd>{formatUtc(source.createdAt)}</dd>
              </div>
            </dl>
            <div className="version-history">
              <h4>Immutable version history</h4>
              {source.versions.map((version) => (
                <details className="version-record" key={version.id}>
                  <summary>
                    <span>Version {version.versionNumber}</span>
                    <time dateTime={version.createdAt.toISOString()}>
                      {formatUtc(version.createdAt)}
                    </time>
                  </summary>
                  <dl className="version-metadata">
                    <div>
                      <dt>SHA-256</dt>
                      <dd className="technical-value">{version.contentHash}</dd>
                    </div>
                    <div>
                      <dt>UTF-8 size</dt>
                      <dd>{version.byteSize.toLocaleString("en-US")} bytes</dd>
                    </div>
                  </dl>
                  <pre className="evidence-content">{version.content}</pre>
                </details>
              ))}
            </div>
            {canWrite ? (
              <details className="new-version-panel">
                <summary>Create a revision</summary>
                <p>
                  A revision creates a new immutable version. Earlier text is never
                  overwritten.
                </p>
                <VersionForm projectId={projectId} sourceDocumentId={source.id} />
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function formatUtc(value: Date | null) {
  if (!value) return "Unknown";
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value)} UTC`;
}
