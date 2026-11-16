"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/primitives";

export function SelfDecisionAuthority({
  projectId,
  userId,
  canDecide,
}: {
  projectId: string;
  userId: string;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateAuthority() {
    const next = !canDecide;

    if (
      !window.confirm(
        next
          ? "Grant your account permission to record human decisions in this project? This change will be audited."
          : "Revoke your account's permission to record human decisions in this project? This change will be audited.",
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            role: "manager",
            canDecide: next,
            status: "active",
          }),
        },
      );

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(
          result.error ?? "Permission change was rejected. No success is assumed.",
        );
        return;
      }

      setMessage("Permission update accepted. Refreshing the verified project status.");

      router.refresh();
    } catch {
      setError("Network failure. The outcome is unknown; refresh before trying again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Your decision permissions" style={{ marginBlock: "1rem" }}>
      <p>
        Decision authority is separate from project ownership. This control changes only
        your existing project membership; it does not approve any request.
      </p>

      <Button disabled={pending} onClick={updateAuthority} variant="secondary">
        {pending
          ? "Updating permission…"
          : canDecide
            ? "Revoke my decision authority"
            : "Grant my decision authority"}
      </Button>

      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
