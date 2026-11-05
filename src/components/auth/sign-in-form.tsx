"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button, TextField } from "@/components/ui/primitives";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => setHydrated(true), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);

    if (result.error) {
      setError("We could not sign you in with those details.");
      return;
    }
    router.replace("/projects");
    router.refresh();
  }

  return (
    <form aria-busy={pending} className="auth-form" method="post" onSubmit={submit}>
      <TextField
        autoComplete="email"
        id="email"
        label="Email address"
        name="email"
        required
        type="email"
      />
      <TextField
        autoComplete="current-password"
        id="password"
        label="Password"
        name="password"
        required
        type="password"
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!hydrated || pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
