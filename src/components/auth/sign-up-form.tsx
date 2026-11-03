"use client";

import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button, Notice, TextField } from "@/components/ui/primitives";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);

    if (result.error) {
      setError("We could not create that account. Check the details and try again.");
      return;
    }
    setComplete(true);
  }

  if (complete) {
    return (
      <div role="status">
        <Notice title="Account created">
          <p>Your account is ready. Sign in to continue.</p>
        </Notice>
      </div>
    );
  }

  return (
    <form aria-busy={pending} className="auth-form" onSubmit={submit}>
      <TextField autoComplete="name" id="name" label="Name" name="name" required />
      <TextField
        autoComplete="email"
        id="email"
        label="Email address"
        name="email"
        required
        type="email"
      />
      <TextField
        autoComplete="new-password"
        description="Use at least 12 characters."
        id="password"
        label="Password"
        minLength={12}
        name="password"
        required
        type="password"
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
