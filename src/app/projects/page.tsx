import { redirect } from "next/navigation";

import { AppShell } from "@/components/product/app-shell";
import { EmptyState, PageHeader, StatusLozenge } from "@/components/ui/primitives";
import { listAuthorizedProjects } from "@/server/authorization/project-access";
import { getVerifiedSession } from "@/server/authorization/session";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getVerifiedSession();
  if (!session) {
    redirect("/sign-in");
  }
  const projects = await listAuthorizedProjects();

  return (
    <AppShell userEmail={session.user.email}>
      <main className="product-page" id="main-content">
        <PageHeader
          description="Only projects where your workspace and project memberships are active appear here."
          eyebrow="Authorized workspace"
          status={<StatusLozenge tone="active">Server verified</StatusLozenge>}
          title="Projects"
        />
        {projects.length === 0 ? (
          <EmptyState title="No project access yet">
            <p>
              Your account is valid, but it has no active project membership. Ask a
              workspace owner to grant access.
            </p>
          </EmptyState>
        ) : (
          <section className="project-section" aria-labelledby="project-list-title">
            <div className="section-bar">
              <h2 id="project-list-title">Available to you</h2>
              <span className="section-count">
                {projects.length === 1 ? "1 project" : `${projects.length} projects`}
              </span>
            </div>
            <ul className="project-list">
              {projects.map((project) => (
                <li key={project.id}>
                  <a className="project-link" href={`/projects/${project.id}`}>
                    <span className="project-name">{project.name}</span>
                    <span className="project-workspace">{project.workspaceName}</span>
                    <span className="project-open" aria-hidden="true">
                      Open →
                    </span>
                  </a>
                  <StatusLozenge tone="neutral">{project.role}</StatusLozenge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
