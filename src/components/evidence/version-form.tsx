"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/primitives";

export function VersionForm({
  projectId,
  sourceDocumentId,
}: {
  projectId: string;
  sourceDocumentId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => setHydrated(true), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/evidence/${sourceDocumentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: "pasted_text",
            content: form.get("content"),
            idempotencyKey,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The new version could not be saved.");
        return;
      }
      formRef.current?.reset();
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch {
      setError("The network request failed. Your text remains here; retry safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="version-form" method="post" onSubmit={submit} ref={formRef}>
      <div className="field-group">
        <label htmlFor={`version-${sourceDocumentId}`}>Exact revised text</label>
        <textarea id={`version-${sourceDocumentId}`} name="content" required rows={8} />
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!hydrated || pending} type="submit" variant="secondary">
        {pending ? "Saving version…" : "Create new version"}
      </Button>
    </form>
  );
}
