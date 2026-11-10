"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/primitives";

interface VersionOption {
  id: string;
  documentId: string;
  title: string;
  versionNumber: number;
  contentHash: string;
}

export function RealityCheckForm({
  projectId,
  agreements,
  instructions,
}: {
  projectId: string;
  agreements: VersionOption[];
  instructions: VersionOption[];
}) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [agreementId, setAgreementId] = useState(agreements[0]?.id ?? "");
  const [instructionId, setInstructionId] = useState(instructions[0]?.id ?? "");

  useEffect(() => setHydrated(true), []);
  const agreement = agreements.find((option) => option.id === agreementId);
  const instruction = instructions.find((option) => option.id === instructionId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementVersionId: agreementId,
          instructionVersionId: instructionId,
          idempotencyKey,
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "The Reality Check could not be created.");
        return;
      }
      setMessage(result.message ?? "Analysis created.");
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch {
      setError(
        "The network request failed. Retry to confirm whether the analysis was created.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form aria-busy={pending} className="evidence-form" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor="reality-check-agreement">Agreement version</label>
        <select
          id="reality-check-agreement"
          onChange={(event) => setAgreementId(event.target.value)}
          value={agreementId}
        >
          {agreements.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title} - version {option.versionNumber}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="reality-check-instruction">Instruction version</label>
        <select
          id="reality-check-instruction"
          onChange={(event) => setInstructionId(event.target.value)}
          value={instructionId}
        >
          {instructions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title} - version {option.versionNumber}
            </option>
          ))}
        </select>
      </div>
      {agreement && instruction ? (
        <fieldset className="notice version-confirmation">
          <legend>Exact version confirmation</legend>
          <p>
            <strong>Agreement:</strong> {agreement.title}, version{" "}
            {agreement.versionNumber}, hash {agreement.contentHash.slice(0, 12)}...
          </p>
          <p>
            <strong>Instruction:</strong> {instruction.title}, version{" "}
            {instruction.versionNumber}, hash {instruction.contentHash.slice(0, 12)}...
          </p>
        </fieldset>
      ) : null}
      <p className="field-help">
        Creating this record does not send evidence to Clocked and does not approve the
        instruction.
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
      <Button disabled={!hydrated || pending || !agreement || !instruction} type="submit">
        {pending ? "Creating..." : "Create Reality Check"}
      </Button>
    </form>
  );
}
