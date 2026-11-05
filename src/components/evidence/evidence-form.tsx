"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button, TextField } from "@/components/ui/primitives";

export function EvidenceForm({
  projectId,
  kind,
}: {
  projectId: string;
  kind: "agreement" | "instruction";
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
    const observedValue = String(form.get("sourceObservedAt") ?? "");
    try {
      const response = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "pasted_text",
          kind,
          title: form.get("title"),
          content: form.get("content"),
          idempotencyKey,
          ...(form.get("sourceAttribution")
            ? { sourceAttribution: form.get("sourceAttribution") }
            : {}),
          ...(observedValue
            ? { sourceObservedAt: new Date(observedValue).toISOString() }
            : {}),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The evidence could not be saved.");
        return;
      }
      formRef.current?.reset();
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch {
      setError(
        "The network request failed. Your text remains here; retry to confirm whether it was saved.",
      );
    } finally {
      setPending(false);
    }
  }

  const prefix = kind === "agreement" ? "evidence-agreement" : "evidence-instruction";
  return (
    <form
      aria-busy={pending}
      className="evidence-form"
      method="post"
      onSubmit={submit}
      ref={formRef}
    >
      <TextField
        id={`${prefix}-title`}
        label="Document title"
        maxLength={160}
        name="title"
        required
      />
      <TextField
        description="Optional. Enter only an author, sender, channel, or other source you actually know."
        id={`${prefix}-attribution`}
        label="Source attribution"
        maxLength={240}
        name="sourceAttribution"
      />
      <TextField
        description="Optional. Leave blank if the source time is unknown."
        id={`${prefix}-observed-at`}
        label="Received or observed time"
        name="sourceObservedAt"
        type="datetime-local"
      />
      <div className="field-group">
        <label htmlFor={`${prefix}-content`}>Exact source text</label>
        <textarea
          aria-describedby={`${prefix}-content-help`}
          id={`${prefix}-content`}
          name="content"
          required
          rows={10}
        />
        <p className="field-help" id={`${prefix}-content-help`}>
          Pasted text only, up to 256 KiB. Necra preserves the exact Unicode text and does
          not normalize whitespace or punctuation.
        </p>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!hydrated || pending} type="submit">
        {pending
          ? "Saving…"
          : kind === "agreement"
            ? "Save agreement"
            : "Save instruction"}
      </Button>
    </form>
  );
}
