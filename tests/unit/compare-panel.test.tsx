import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComparePanel } from "../../src/components/analysis/compare-panel";

const props = {
  projectId: "10000000-0000-4000-8000-000000000001",
  analysisId: "10000000-0000-4000-8000-000000000002",
  canWrite: true,
};

describe("Clocked Compare presentation", () => {
  it("distinguishes configuration and read-only unavailable states", () => {
    const unconfigured = renderToStaticMarkup(
      <ComparePanel {...props} configured={false} record={null} />,
    );
    const readOnly = renderToStaticMarkup(
      <ComparePanel {...props} canWrite={false} configured={true} record={null} />,
    );

    expect(unconfigured).toContain("Compare is not configured");
    expect(unconfigured).toContain("server-side Clocked API key");
    expect(readOnly).toContain("project access is read-only");
  });

  it("presents a running record as in progress rather than failed", () => {
    const markup = renderToStaticMarkup(
      <ComparePanel
        {...props}
        configured
        record={{
          status: "running",
          model: null,
          failureCode: null,
          pairs: [],
          valid: false,
        }}
      />,
    );

    expect(markup).toContain("Compare is still processing");
    expect(markup).not.toContain("Compare did not complete");
  });

  it("labels both authentic passages and preserves the human-review boundary", () => {
    const markup = renderToStaticMarkup(
      <ComparePanel
        {...props}
        configured
        record={{
          status: "completed",
          model: "TEST ONLY model",
          failureCode: null,
          valid: true,
          pairs: [
            {
              relation: "conflicting",
              related: 0.875,
              duplicates: [],
              conflicts: [
                {
                  a: { quote: "TEST ONLY original passage" },
                  b: { quote: "TEST ONLY later passage" },
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Possible conflict");
    expect(markup).toContain("Agreement</span>");
    expect(markup).toContain("Later instructions</span>");
    expect(markup).toContain("not legal conclusions, approvals, or decisions");
  });
});
