"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/primitives";

interface DecisionDialogProps {
  projectId: string;
  analysisId: string;
  changeRequestId: string;
  agreementTitle: string;
  agreementVersionNumber: number;
  agreementVersionId: string;
  instructionTitle: string;
  instructionVersionNumber: number;
  instructionVersionId: string;
  unresolvedFindingCount: number;
  supersedesDecisionId: string | null;
}

type Outcome = "approved" | "rejected" | "";

export function DecisionDialog(props: DecisionDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [outcome, setOutcome] = useState<Outcome>("");
  const [rationale, setRationale] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const titleId = `decision-title-${props.analysisId}`;
  const descriptionId = `decision-description-${props.analysisId}`;

  function openDialog() {
    setOutcome("");
    setRationale("");
    setConfirmed(false);
    setError(null);
    setIdempotencyKey(crypto.randomUUID());
    dialogRef.current?.showModal();
  }

  async function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outcome || !confirmed) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${props.projectId}/checks/${props.analysisId}/decisions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome,
            rationale: rationale.trim() || undefined,
            idempotencyKey,
            supersedesDecisionId: props.supersedesDecisionId,
            confirmReviewedExactRecord: true,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The decision could not be recorded.");
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setError(
        "The connection ended before the record was confirmed. Reload to check the decision history before retrying.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="decision-action">
      <Button onClick={openDialog} type="button">
        {props.supersedesDecisionId
          ? "Record a replacement decision"
          : "Record the human decision"}
      </Button>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="decision-dialog"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        ref={dialogRef}
      >
        <form aria-busy={pending} onSubmit={submitDecision}>
          <div className="decision-dialog-heading">
            <p className="workflow-kicker">Explicit human decision</p>
            <h4 id={titleId}>
              {props.supersedesDecisionId
                ? "Replace the current decision"
                : "Decide this proposed change"}
            </h4>
            <p id={descriptionId}>
              This records your authenticated choice. It is not a signature or an
              automatic contract amendment.
            </p>
          </div>

          <section className="decision-scope" aria-labelledby={`${titleId}-scope`}>
            <h5 id={`${titleId}-scope`}>Exactly what this decision applies to</h5>
            <dl>
              <div>
                <dt>Reality Check</dt>
                <dd className="technical-value">{props.analysisId}</dd>
              </div>
              <div>
                <dt>Change request</dt>
                <dd className="technical-value">{props.changeRequestId}</dd>
              </div>
              <div>
                <dt>Agreement</dt>
                <dd>
                  {props.agreementTitle}, version {props.agreementVersionNumber}
                  <span className="decision-version-identity">
                    {props.agreementVersionId}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Later instruction</dt>
                <dd>
                  {props.instructionTitle}, version {props.instructionVersionNumber}
                  <span className="decision-version-identity">
                    {props.instructionVersionId}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {props.unresolvedFindingCount > 0 ? (
            <div className="decision-warning" role="note">
              <strong>
                {props.unresolvedFindingCount} unresolved or unsupported finding
                {props.unresolvedFindingCount === 1 ? " remains" : "s remain"}.
              </strong>{" "}
              Approving does not convert missing evidence into support.
            </div>
          ) : (
            <p className="decision-review-note">
              Every displayed finding has a verified supporting passage. You must still
              make the decision yourself.
            </p>
          )}

          <fieldset className="decision-options">
            <legend>Choose one decision</legend>
            <label>
              <input
                checked={outcome === "approved"}
                name={`outcome-${props.analysisId}`}
                onChange={() => setOutcome("approved")}
                type="radio"
                value="approved"
              />
              <span className="decision-option-copy">
                <strong>Approve the proposed change</strong>
                <small>Record that you authorize this specific requested change.</small>
              </span>
            </label>
            <label>
              <input
                checked={outcome === "rejected"}
                name={`outcome-${props.analysisId}`}
                onChange={() => setOutcome("rejected")}
                type="radio"
                value="rejected"
              />
              <span className="decision-option-copy">
                <strong>Reject the proposed change</strong>
                <small>
                  Record that you do not authorize this specific requested change.
                </small>
              </span>
            </label>
          </fieldset>

          <label className="decision-rationale">
            Rationale <span className="decision-optional-label">(optional)</span>
            <textarea
              maxLength={2000}
              onChange={(event) => setRationale(event.target.value)}
              rows={4}
              value={rationale}
            />
          </label>

          <label className="decision-confirmation">
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              I reviewed the exact agreement, instruction, findings, and available
              evidence shown for this Reality Check, and I intend to record this decision.
            </span>
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="decision-dialog-actions">
            <Button
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={pending || !outcome || !confirmed} type="submit">
              {pending ? "Recording decisionâ€¦" : "Confirm and record decision"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
