import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getVerifiedSession } from "@/server/authorization/session";
import { serverEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getVerifiedSession()) {
    redirect("/projects");
  }

  return (
    <main className="auth-shell" id="main-content">
      <a className="wordmark" href="/" aria-label="Necra home">
        Necra<span aria-hidden="true">.</span>
      </a>
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <p className="eyebrow">Verified access</p>
        <h1 id="sign-in-title">Sign in to your workspace</h1>
        <p className="auth-intro">
          Your session identifies you. Project access and decision authority are checked
          again on the server for every protected request.
        </p>
        <SignInForm />
        {serverEnvironment.AUTH_ALLOW_SIGN_UP ? (
          <p className="auth-alternative">
            Need an account?{" "}
            <a className="auth-link" href="/sign-up">
              Create one
            </a>
            .
          </p>
        ) : (
          <p className="auth-alternative">
            Account creation is disabled for this deployment. Ask the operator how access
            is provisioned.
          </p>
        )}
      </section>
    </main>
  );
}
