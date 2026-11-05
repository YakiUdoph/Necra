import type { AnalysisRecord } from "@/server/analysis/analysis-service";

import { EmptyState, StatusLozenge } from "../ui/primitives";

const statusLabels = {
  pending: "Created",
  running: "Processing",
  reconciliation_required: "Needs reconciliation",
  failed: "Failed",
  completed: "Completed",
  evidence_missing: "Evidence unavailable",
} as const;

export function RealityCheckList({ checks }: { checks: AnalysisRecord[] }) {
  if (checks.length === 0) {
    return (
      <EmptyState title="No Reality Checks have been created">
        <p>Select exact saved versions to create an auditable processing record.</p>
      </EmptyState>
    );
  }
  return (
    <div className="evidence-list">
      {checks.map((check) => (
        <article className="evidence-card" key={check.id}>
          <div className="evidence-card-heading">
            <div>
              <p className="workflow-kicker">Reality Check</p>
              <h3>{check.instructionTitle}</h3>
            </div>
            <StatusLozenge tone={check.status === "failed" ? "warning" : "planned"}>
              {statusLabels[check.status]}
            </StatusLozenge>
          </div>
          <p>
            {check.agreementTitle}, version {check.agreementVersionNumber} →{" "}
            {check.instructionTitle}, version {check.instructionVersionNumber}
          </p>
          <p className="field-help">
            Agreement hash {check.agreementContentHash.slice(0, 12)}… · Instruction hash{" "}
            {check.instructionContentHash.slice(0, 12)}…
          </p>
          {check.status === "pending" ? (
            <p>
              <strong>Analysis created. Clocked processing is not yet connected.</strong>
            </p>
          ) : null}
          <p className="field-help">
            Created {check.createdAt.toLocaleString()} by an authenticated project member.
            No human approval recorded.
          </p>
        </article>
      ))}
    </div>
  );
}
