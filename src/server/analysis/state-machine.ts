export type AnalysisLifecycleStatus =
  | "pending"
  | "running"
  | "reconciliation_required"
  | "failed"
  | "completed"
  | "evidence_missing";

export const MAX_ANALYSIS_ATTEMPTS = 4;

const allowedTransitions: Record<AnalysisLifecycleStatus, AnalysisLifecycleStatus[]> = {
  pending: ["running", "failed"],
  running: ["completed", "failed", "reconciliation_required"],
  reconciliation_required: ["running", "completed", "failed"],
  failed: ["pending"],
  completed: [],
  evidence_missing: [],
};

export function canTransitionAnalysis(
  from: AnalysisLifecycleStatus,
  to: AnalysisLifecycleStatus,
) {
  return allowedTransitions[from].includes(to);
}

export function requireAnalysisTransition(
  from: AnalysisLifecycleStatus,
  to: AnalysisLifecycleStatus,
) {
  if (!canTransitionAnalysis(from, to)) {
    throw new Error(`Invalid analysis transition: ${from} to ${to}`);
  }
}
