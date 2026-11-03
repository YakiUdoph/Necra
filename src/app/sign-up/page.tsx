import { notFound, redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getVerifiedSession } from "@/server/authorization/session";
import { serverEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (!serverEnvironment.AUTH_ALLOW_SIGN_UP) {
    notFound();
  }
  if (await getVerifiedSession()) {
    redirect("/projects");
  }

  return (
    <main className="auth-shell" id="main-content">
      <a className="wordmark" href="/" aria-label="Necra home">
        Necra<span aria-hidden="true">.</span>
      </a>
      <section className="auth-panel" aria-labelledby="sign-up-title">
        <p className="eyebrow">Create your identity</p>
        <h1 id="sign-up-title">Create an account</h1>
        <p className="auth-intro">
          Creating an account does not grant access to any workspace or project. An active
          membership is still required.
        </p>
        <SignUpForm />
        <p className="auth-alternative">
          Already registered?{" "}
          <a className="auth-link" href="/sign-in">
            Sign in
          </a>
          .
        </p>
      </section>
    </main>
  );
}
