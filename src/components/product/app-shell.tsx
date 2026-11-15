import Link from "next/link";
import "./evidence-workspace.css";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { StatusLozenge } from "@/components/ui/primitives";

interface ShellProject {
  id: string;
  name: string;
  workspaceName: string;
}

export type WorkspaceSection =
  | "overview"
  | "agreements"
  | "changes"
  | "reality-check"
  | "decisions"
  | "replay";

const projectSections = [
  { href: "", label: "Overview", section: "overview" },
  { href: "/agreements", label: "Agreements", section: "agreements" },
  { href: "/changes", label: "Changes", section: "changes" },
  { href: "/reality-check", label: "Reality Check", section: "reality-check" },
  { href: "/decisions", label: "Decisions", section: "decisions" },
  { href: "/replay", label: "Replay", section: "replay" },
] as const;

export function AppShell({
  children,
  userEmail,
  project,
  activeSection,
}: {
  children: ReactNode;
  userEmail: string;
  project?: ShellProject;
  activeSection?: WorkspaceSection;
}) {
  return (
    <div className="workspace-frame">
      <aside className="app-rail" aria-label="Workspace navigation">
        <ShellIdentity project={project} />
        <ProductNavigation activeSection={activeSection} project={project} />
        <AccountControl userEmail={userEmail} />
      </aside>

      <header className="mobile-bar">
        <Link className="wordmark" href="/">
          <span className="workspace-mark" aria-hidden="true">
            N
          </span>
          <span>NECRA</span>
        </Link>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <div className="mobile-menu-panel">
            <ShellIdentity project={project} />
            <ProductNavigation activeSection={activeSection} project={project} />
            <AccountControl userEmail={userEmail} />
          </div>
        </details>
      </header>

      <div className="workspace-canvas">{children}</div>
    </div>
  );
}

function ShellIdentity({ project }: { project?: ShellProject }) {
  return (
    <div className="shell-identity">
      <Link className="wordmark" href="/">
        <span className="workspace-mark" aria-hidden="true">
          N
        </span>
        <span>NECRA</span>
      </Link>
      <div className="project-context">
        <span className="context-label">Workspace</span>
        <strong className="context-name">
          {project?.workspaceName ?? "All workspaces"}
        </strong>
        {project ? <small className="context-project">{project.name}</small> : null}
      </div>
    </div>
  );
}

function ProductNavigation({
  project,
  activeSection,
}: {
  project?: ShellProject;
  activeSection?: WorkspaceSection;
}) {
  return (
    <nav className="product-nav" aria-label="Product">
      <Link
        aria-current={!project ? "page" : undefined}
        className={!project ? "nav-item nav-item-active" : "nav-item"}
        href="/projects"
      >
        <span className="nav-index" aria-hidden="true">
          01
        </span>
        Projects
      </Link>
      {projectSections.map((item, index) =>
        project ? (
          <Link
            aria-current={activeSection === item.section ? "page" : undefined}
            className={
              activeSection === item.section ? "nav-item nav-item-active" : "nav-item"
            }
            href={`/projects/${project.id}${item.href}`}
            key={item.label}
          >
            <span className="nav-index" aria-hidden="true">
              {String(index + 2).padStart(2, "0")}
            </span>
            {item.label}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="nav-item nav-item-disabled"
            key={item.label}
          >
            <span className="nav-index" aria-hidden="true">
              {String(index + 2).padStart(2, "0")}
            </span>
            <span>
              {item.label}
              <small>Choose a project</small>
            </span>
          </span>
        ),
      )}
    </nav>
  );
}

function AccountControl({ userEmail }: { userEmail: string }) {
  return (
    <div className="account-control">
      <StatusLozenge tone="active">Session active</StatusLozenge>
      <p title={userEmail}>{userEmail}</p>
      <SignOutButton />
    </div>
  );
}
