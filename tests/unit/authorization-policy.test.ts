import { describe, expect, it } from "vitest";

import {
  hasProjectPermission,
  toProductProjectRole,
  type ProjectAuthority,
} from "../../src/server/authorization/policy";

function authority(role: ProjectAuthority["role"], canDecide = false): ProjectAuthority {
  return {
    role,
    canDecide,
    projectMembershipStatus: "active",
    workspaceMembershipStatus: "active",
  };
}

describe("project authorization policy", () => {
  it("maps stored roles to plain-language product roles", () => {
    expect(toProductProjectRole("manager")).toBe("owner");
    expect(toProductProjectRole("reviewer")).toBe("collaborator");
    expect(toProductProjectRole("participant")).toBe("viewer");
  });

  it("defaults to denial without active membership", () => {
    expect(hasProjectPermission(null, "project:read")).toBe(false);
    expect(
      hasProjectPermission(
        { ...authority("manager", true), projectMembershipStatus: "suspended" },
        "project:read",
      ),
    ).toBe(false);
    expect(
      hasProjectPermission(
        { ...authority("manager", true), workspaceMembershipStatus: "suspended" },
        "project:read",
      ),
    ).toBe(false);
  });

  it("allows viewers to read but not mutate or decide", () => {
    const viewer = authority("participant", true);
    expect(hasProjectPermission(viewer, "project:read")).toBe(true);
    expect(hasProjectPermission(viewer, "project:write")).toBe(false);
    expect(hasProjectPermission(viewer, "membership:manage")).toBe(false);
    expect(hasProjectPermission(viewer, "decision:create")).toBe(false);
  });

  it("requires explicit can_decide authority for eligible roles", () => {
    expect(hasProjectPermission(authority("reviewer"), "decision:create")).toBe(false);
    expect(hasProjectPermission(authority("reviewer", true), "decision:create")).toBe(
      true,
    );
    expect(hasProjectPermission(authority("manager", true), "decision:create")).toBe(
      true,
    );
  });

  it("reserves membership management for owners", () => {
    expect(hasProjectPermission(authority("manager"), "membership:manage")).toBe(true);
    expect(hasProjectPermission(authority("reviewer"), "membership:manage")).toBe(false);
  });
});
