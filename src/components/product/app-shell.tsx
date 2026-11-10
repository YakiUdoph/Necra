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

const projectSections = [
  { href: "", label: "Overview" },
  { href: "/agreements", label: "Agreements" },
  { href: "/changes", label: "Changes" },
  { href: "/reality-check", label: "Reality Check" },
  { href: "/decisions", label: "Decisions" },
  { href: "/replay", label: "Replay" },
] as const;

export function AppShell({
  children,
  userEmail,
  project,
}: {
  children: ReactNode;
  userEmail: string;
  project?: ShellProject;
}) {
  return (
    <div className="workspace-frame">
      <aside className="app-rail" aria-label="Workspace navigation">
        <ShellIdentity project={project} />
        <ProductNavigation project={project} />
        <AccountControl userEmail={userEmail} />
      </aside>

      <header className="mobile-bar">
        <Link className="wordmark" href="/" aria-label="Necra home">
          Necra<span aria-hidden="true">.</span>
        </Link>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <div className="mobile-menu-panel">
            <ShellIdentity project={project} />
            <ProductNavigation project={project} />
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
      <Link className="wordmark" href="/" aria-label="Necra home">
        Necra<span aria-hidden="true">.</span>
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

function ProductNavigation({ project }: { project?: ShellProject }) {
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
            className="nav-item"
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
