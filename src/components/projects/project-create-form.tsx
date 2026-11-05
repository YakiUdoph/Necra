"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button, TextField } from "@/components/ui/primitives";

export function ProjectCreateForm() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceName: form.get("workspaceName"),
          projectName: form.get("projectName"),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        project?: { id: string };
      };
      if (!response.ok || !result.project) {
        setError(result.error ?? "The project could not be created.");
        return;
      }
      router.push(`/projects/${result.project.id}`);
      router.refresh();
    } catch {
      setError("The network request failed. Your project was not confirmed as created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-busy={pending}
      className="project-create-form"
      method="post"
      onSubmit={submit}
    >
      <TextField
        id="workspace-name"
        label="Workspace name"
        maxLength={120}
        name="workspaceName"
        placeholder="Your studio or client team"
        required
      />
      <TextField
        id="project-name"
        label="Project name"
        maxLength={160}
        name="projectName"
        placeholder="Website redesign"
        required
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!hydrated || pending} type="submit">
        {pending ? "Creating project…" : "Create project"}
      </Button>
      <p className="field-help">
        This creates a private workspace and makes you its project owner. Decision
        authority is not granted automatically.
      </p>
    </form>
  );
}
