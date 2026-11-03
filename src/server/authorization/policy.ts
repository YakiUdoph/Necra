export type StoredProjectRole = "manager" | "reviewer" | "participant";
export type ProductProjectRole = "owner" | "collaborator" | "viewer";
export type ProjectPermission =
  | "project:read"
  | "project:write"
  | "membership:manage"
  | "decision:create";

export interface ProjectAuthority {
  role: StoredProjectRole;
  canDecide: boolean;
  projectMembershipStatus: "active" | "suspended";
  workspaceMembershipStatus: "active" | "suspended";
}

export function toProductProjectRole(role: StoredProjectRole): ProductProjectRole {
  switch (role) {
    case "manager":
      return "owner";
    case "reviewer":
      return "collaborator";
    case "participant":
      return "viewer";
  }
}

export function hasProjectPermission(
  authority: ProjectAuthority | null,
  permission: ProjectPermission,
): boolean {
  if (
    authority?.projectMembershipStatus !== "active" ||
    authority.workspaceMembershipStatus !== "active"
  ) {
    return false;
  }

  switch (permission) {
    case "project:read":
      return true;
    case "project:write":
      return authority.role === "manager" || authority.role === "reviewer";
    case "membership:manage":
      return authority.role === "manager";
    case "decision:create":
      return (
        authority.canDecide &&
        (authority.role === "manager" || authority.role === "reviewer")
      );
  }
}
