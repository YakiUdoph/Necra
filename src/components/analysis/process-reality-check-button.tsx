"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/primitives";

export function ProcessRealityCheckButton({
  projectId,
  analysisId,
  configured,
  actionLabel = "Start Clocked processing",
}: {
  projectId: string;
  analysisId: string;
  configured: boolean;
  actionLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function process() {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checks/${analysisId}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmExternalProcessing: true }),
        },
      );
      const result = (await response.json()) as {
        status?: "completed" | "failed" | "reconciliation_required";
        claimCount?: number;
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Clocked processing could not be started.");
        return;
      }
      if (result.status === "completed") {
        setMessage(
          `Clocked returned a validated result with ${result.claimCount ?? 0} claim results.`,
        );
      } else if (result.status === "reconciliation_required") {
        setError(
          "Clocked's outcome is uncertain. The original request identity was preserved for safe reconciliation.",
        );
      } else {
        setError(
          "Clocked did not complete this analysis. Reload to review the persisted failure and retry state.",
        );
      }
      router.refresh();
    } catch {
      setError(
        "The connection ended before the outcome was confirmed. Reload to inspect the durable state before retrying.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!configured) {
    return (
      <p className="field-help">
        Real Clocked processing is unavailable because the server credential is not
        configured.
      </p>
    );
  }

  return (
    <div aria-busy={pending}>
      <label>
        <input
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />{" "}
        I confirm that these selected agreement and instruction texts are authorized for
        processing by Clocked, an external service.
      </label>
      <p className="field-help">
        Necra sends the exact selected text versions. Do not continue with sensitive
        evidence unless your organization has approved Clocked's data handling terms.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      <Button
        disabled={pending || !confirmed}
        onClick={process}
        type="button"
        variant="secondary"
      >
        {pending ? "Waiting for Clocked…" : actionLabel}
      </Button>
    </div>
  );
}
