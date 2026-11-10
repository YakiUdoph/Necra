import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/product/app-shell";
import { RealityCheckForm } from "@/components/analysis/reality-check-form";
import { RealityCheckList } from "@/components/analysis/reality-check-list";
import { EvidenceForm } from "@/components/evidence/evidence-form";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { DecisionReplay } from "@/components/replay/decision-replay";
import {
  EmptyState,
  Notice,
  PageHeader,
  StatusLozenge,
} from "@/components/ui/primitives";
import { getAuthorizedProject } from "@/server/authorization/project-access";
import { getVerifiedSession } from "@/server/authorization/session";
import { listEvidenceSources } from "@/server/evidence/evidence-service";
import { listAnalyses } from "@/server/analysis/analysis-service";
import { serverEnvironment } from "@/server/env";
import { getDecisionReplay } from "@/server/replay/decision-replay-service";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  view = "overview",
}: {
  params: Promise<{ projectId: string }>;
  view?: "overview" | "agreements" | "changes" | "reality-check" | "decisions" | "replay";
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
  const [evidence, checks, replay] = await Promise.all([
    listEvidenceSources(projectId),
    listAnalyses(projectId),
    getDecisionReplay(projectId),
  ]);
  const agreements = evidence.filter((source) => source.kind === "agreement");
  const instructions = evidence.filter((source) => source.kind === "instruction");
  const canWrite = project.role === "owner" || project.role === "collaborator";
  const agreementVersions = agreements.flatMap((source) =>
    source.versions.map((version) => ({
      id: version.id,
      documentId: source.id,
      title: source.title,
      versionNumber: version.versionNumber,
      contentHash: version.contentHash,
    })),
  );
  const instructionVersions = instructions.flatMap((source) =>
    source.versions.map((version) => ({
      id: version.id,
      documentId: source.id,
      title: source.title,
      versionNumber: version.versionNumber,
      contentHash: version.contentHash,
    })),
  );

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
          eyebrow={`${project.workspaceName} Â· ${project.role} access`}
          status={<StatusLozenge tone="active">Evidence enabled</StatusLozenge>}
          title={view === "overview" ? project.name : ({ agreements: "Agreements", changes: "Changes", "reality-check": "Reality Check", decisions: "Decisions", replay: "Decision Replay" } as Record<string, string>)[view] ?? project.name}
        />

        <Notice title="Evidence-backed Reality Checks are available">
          <p>
            Pasted agreement and instruction text is stored as immutable PostgreSQL
            versions. Completed automated findings show only persisted provider results
            and verified source passages. Explicit authorized decisions are recorded
            separately from automated findings.
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

{view === "agreements" ? (
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
            <StatusLozenge tone="active">Available</StatusLozenge>
          </div>
          {agreements.length > 0 ? (
            <EvidenceList
              canWrite={canWrite}
              projectId={projectId}
              sources={agreements}
            />
          ) : (
            <EmptyState title="No agreement has been recorded">
              <p>Add the agreement you want to use as the baseline.</p>
            </EmptyState>
          )}
          {canWrite ? <EvidenceForm kind="agreement" projectId={projectId} /> : null}
        </section>
        ) : null}

{view === "changes" ? (
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
            <StatusLozenge tone="active">Available</StatusLozenge>
          </div>
          {instructions.length > 0 ? (
            <EvidenceList
              canWrite={canWrite}
              projectId={projectId}
              sources={instructions}
            />
          ) : (
            <EmptyState title="No later instructions have been recorded">
              <p>
                Add the later request or instructions you want to preserve. A request is
                evidence, not approval.
              </p>
            </EmptyState>
          )}
          {canWrite ? <EvidenceForm kind="instruction" projectId={projectId} /> : null}
        </section>
        ) : null}

{view === "reality-check" ? (
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
            <StatusLozenge tone="active">Creation enabled</StatusLozenge>
          </div>
          <RealityCheckList
            canDecide={project.canDecide && canWrite}
            checks={checks}
            processingConfigured={Boolean(serverEnvironment.CLOCKED_API_KEY)}
          />
          {canWrite && agreementVersions.length > 0 && instructionVersions.length > 0 ? (
            <RealityCheckForm
              agreements={agreementVersions}
              instructions={instructionVersions}
              projectId={projectId}
            />
          ) : (
            <EmptyState title="Ready evidence versions are required">
              <p>
                Save at least one agreement and one later instruction before creating a
                Reality Check.
              </p>
            </EmptyState>
          )}
        </section>
        ) : null}

{view === "replay" ? (
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
            <StatusLozenge tone="active">Decision records enabled</StatusLozenge>
          </div>
          <DecisionReplay replay={replay} />
        </section>
        ) : null}
        {view === "overview" ? (
          <section
            className="workflow-section necra-overview necra-casefile"
            aria-labelledby="overview-title"
          >
            <div className="necra-overview-heading">
              <div>
                <p className="workflow-kicker">Project workspace</p>
                <h2 id="overview-title">Choose where to work</h2>
              </div>
              <p>
                Follow the evidence from the original agreement through later
                requests, Reality Checks, human decisions, and recorded history.
              </p>
            </div>

            <nav
              aria-label="Project sections"
              className="necra-overview-grid necra-casefile-flow"
            >
              <Link
                className="necra-overview-card"
                href={`/projects/${projectId}/agreements`}
              >
                <span className="necra-card-number">01 / SOURCE</span>
                <strong>Agreements</strong>
                <span>Preserve the original scope and its exact versions.</span>
                <span className="necra-card-action">Open agreements &rarr;</span>
              </Link>

              <Link
                className="necra-overview-card"
                href={`/projects/${projectId}/changes`}
              >
                <span className="necra-card-number">02 / REQUEST</span>
                <strong>Changes</strong>
                <span>Record later instructions without assuming approval.</span>
                <span className="necra-card-action">Review changes &rarr;</span>
              </Link>

              <Link
                className="necra-overview-card"
                href={`/projects/${projectId}/reality-check`}
              >
                <span className="necra-card-number">03 / COMPARE</span>
                <strong>Reality Check</strong>
                <span>Examine evidence-backed findings and source versions.</span>
                <span className="necra-card-action">Open Reality Check &rarr;</span>
              </Link>

              <Link
                className="necra-overview-card"
                href={`/projects/${projectId}/decisions`}
              >
                <span className="necra-card-number">04 / AUTHORITY</span>
                <strong>Decisions</strong>
                <span>Review findings and record authorized human outcomes.</span>
                <span className="necra-card-action">Review decisions &rarr;</span>
              </Link>

              <Link
                className="necra-overview-card"
                href={`/projects/${projectId}/replay`}
              >
                <span className="necra-card-number">05 / HISTORY</span>
                <strong>Decision Replay</strong>
                <span>Trace the recorded sequence of evidence and decisions.</span>
                <span className="necra-card-action">View history &rarr;</span>
              </Link>
            </nav>
          </section>
        ) : null}
        {view === "decisions" ? (
          <section className="workflow-section workflow-section-wide" aria-labelledby="decision-page-title">
            <div className="workflow-heading"><div><p className="workflow-kicker">Authorized human outcomes</p><h2 id="decision-page-title">Decisions</h2></div></div>
            <Notice title="Decisions require human authority"><p>Review completed Reality Checks below. Only explicitly authorized members can record decisions.</p></Notice>
            <RealityCheckList canDecide={project.canDecide && canWrite} checks={checks} processingConfigured={Boolean(serverEnvironment.CLOCKED_API_KEY)} />
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
