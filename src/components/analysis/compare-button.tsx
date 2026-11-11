"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";

export function CompareButton({
  projectId,
  analysisId,
}: {
  projectId: string;
  analysisId: string;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checks/${analysisId}/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmExternalProcessing: true }),
        },
      );
      const result = (await response.json()) as { error?: string; status?: string };
      setMessage(
        response.ok
          ? `Compare ${result.status ?? "finished"}. Reload to review its recorded result.`
          : (result.error ?? "Compare unavailable"),
      );
      router.refresh();
    } catch {
      setMessage(
        "Connection ended. Reload before attempting another request; the provider outcome may be unknown.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div aria-busy={pending}>
      <label>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        I confirm these exact saved texts are authorized for external Clocked Compare
        processing.
      </label>
      <p className="field-help">
        Compare is a separate, chargeable provider operation. One attempt per Reality
        Check; unknown outcomes are never automatically retried.
      </p>
      {message ? <p role="status">{message}</p> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={!confirmed || pending}
        onClick={start}
      >
        {pending ? "Comparing…" : "Run Clocked Compare"}
      </Button>
    </div>
  );
}
