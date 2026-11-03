"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/primitives";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div>
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          const result = await authClient.signOut();
          if (result.error) {
            setPending(false);
            setError(true);
            return;
          }
          router.replace("/sign-in");
          router.refresh();
        }}
        variant="quiet"
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error ? (
        <p className="form-error" role="alert">
          Sign out failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}
