import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

import { AppShell } from "../../src/components/product/app-shell";

describe("authenticated workspace shell", () => {
  it("marks the current project section without changing the protected destination", () => {
    const markup = renderToStaticMarkup(
      <AppShell
        activeSection="reality-check"
        project={{ id: "project-id", name: "Project", workspaceName: "Workspace" }}
        userEmail="reviewer@example.test"
      >
        <main>Protected project content</main>
      </AppShell>,
    );

    expect(markup).toContain('href="/projects/project-id/reality-check"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Protected project content");
    expect(markup).toContain("reviewer@example.test");
  });
});
