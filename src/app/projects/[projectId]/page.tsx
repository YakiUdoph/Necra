import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/product/app-shell";
import { ComparisonEmpty } from "@/components/product/comparison-empty";
import {
  EmptyState,
  Notice,
  PageHeader,
  StatusLozenge,
} from "@/components/ui/primitives";
import { getAuthorizedProject } from "@/server/authorization/project-access";
import { getVerifiedSession } from "@/server/authorization/session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getVerifiedSession();
  if (!session) {
    redirect("/sign-in");
  }
  const { projectId } = await params;
  const project = await getAuthorizedProject(projectId);
  if (!project) {
    notFound();
  }

  return (
    <AppShell
      project={{
        id: project.id,
        name: project.name,
        workspaceName: project.workspaceName,
      }}
      userEmail={session.user.email}
    >
      <main className="product-page" id="main-content">
        <PageHeader
          description="Review what is available for this project without treating a request or automated finding as approval."
          eyebrow={`${project.workspaceName} · ${project.role} access`}
          status={<StatusLozenge tone="info">Interface foundation</StatusLozenge>}
          title={project.name}
        />

        <Notice title="What works today">
          <p>
            Your identity and access are verified on the server. Agreement evidence,
            change requests, comparisons, reviews, and decisions are not available yet.
          </p>
        </Notice>

        <dl className="authority-summary" aria-label="Your project permissions">
          <div>
            <dt>Project role</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>Decision authority</dt>
            <dd>{project.canDecide ? "Explicitly granted" : "Not granted"}</dd>
          </div>
        </dl>

        <section
          className="workflow-section"
          id="agreement"
          aria-labelledby="agreement-title"
        >
          <div className="workflow-heading">
            <span className="workflow-step" aria-hidden="true">
              01
            </span>
            <div>
              <p className="workflow-kicker">Baseline evidence</p>
              <h2 id="agreement-title">Original agreement</h2>
            </div>
            <StatusLozenge tone="planned">Not available yet</StatusLozenge>
          </div>
          <EmptyState title="No agreement can be added yet">
            <p>
              Evidence ingestion belongs to T005. Until private storage, provenance, and
              immutable versioning are connected end to end, this interface will not offer
              an upload control.
            </p>
          </EmptyState>
        </section>

        <section
          className="workflow-section"
          id="requests"
          aria-labelledby="requests-title"
        >
          <div className="workflow-heading">
            <span className="workflow-step" aria-hidden="true">
              02
            </span>
            <div>
              <p className="workflow-kicker">Later instructions</p>
              <h2 id="requests-title">Change requests</h2>
            </div>
            <StatusLozenge tone="planned">Not available yet</StatusLozenge>
          </div>
          <EmptyState title="No request workflow is available">
            <p>
              A request is evidence, not approval. Necra will add this flow only after the
              evidence storage and versioning boundary is implemented.
            </p>
          </EmptyState>
        </section>

        <section
          className="workflow-section workflow-section-wide"
          id="reality-check"
          aria-labelledby="reality-check-title"
        >
          <div className="workflow-heading">
            <span className="workflow-step" aria-hidden="true">
              03
            </span>
            <div>
              <p className="workflow-kicker">Evidence-based comparison</p>
              <h2 id="reality-check-title">Agreement Reality Check</h2>
            </div>
            <StatusLozenge tone="planned">Planned</StatusLozenge>
          </div>
          <ComparisonEmpty />
        </section>

        <section
          className="workflow-section"
          id="decisions"
          aria-labelledby="decisions-title"
        >
          <div className="workflow-heading">
            <span className="workflow-step" aria-hidden="true">
              04
            </span>
            <div>
              <p className="workflow-kicker">Human authority and history</p>
              <h2 id="decisions-title">Decisions & Decision Replay</h2>
            </div>
            <StatusLozenge tone="planned">Planned</StatusLozenge>
          </div>
          <EmptyState title="Decision history is not available yet">
            <p>
              Necra does not infer decisions from messages, silence, uploads, or automated
              findings. T010 and T011 will add explicit decisions and a replay of genuine
              persisted records.
            </p>
          </EmptyState>
        </section>
      </main>
    </AppShell>
  );
}
