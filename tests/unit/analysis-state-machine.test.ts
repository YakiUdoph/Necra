import { describe, expect, it } from "vitest";

import {
  canTransitionAnalysis,
  requireAnalysisTransition,
} from "../../src/server/analysis/state-machine";
import {
  buildClockedGroundingRequest,
  hashClockedRequest,
} from "../../src/server/analysis/clocked-mapping";
import {
  AnalysisValidationError,
  parseAnalysisCreation,
} from "../../src/server/analysis/validation";

describe("T007 analysis lifecycle", () => {
  it("allows only the documented durable transition graph", () => {
    expect(canTransitionAnalysis("pending", "running")).toBe(true);
    expect(canTransitionAnalysis("running", "reconciliation_required")).toBe(true);
    expect(canTransitionAnalysis("reconciliation_required", "running")).toBe(true);
    expect(canTransitionAnalysis("failed", "pending")).toBe(true);
    expect(canTransitionAnalysis("completed", "running")).toBe(false);
    expect(() => requireAnalysisTransition("pending", "completed")).toThrow(
      "Invalid analysis transition",
    );
  });

  it("maps exact text to Grounding and hashes a stable payload", () => {
    const request = buildClockedGroundingRequest({
      agreementVersionId: "11111111-1111-4111-8111-111111111111",
      agreementText: "Exact agreement 👩🏽‍💻 text",
      instructionText: "Exact later instruction",
    });
    expect(request).toEqual({
      documents: [
        {
          id: "agreement-version:11111111-1111-4111-8111-111111111111",
          text: "Exact agreement 👩🏽‍💻 text",
        },
      ],
      answer: "Exact later instruction",
      evidence: "all",
    });
    expect(hashClockedRequest(request)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClockedRequest(request)).toBe(hashClockedRequest(request));
  });

  it("rejects identical versions and unsupported fields", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(() =>
      parseAnalysisCreation({
        agreementVersionId: id,
        instructionVersionId: id,
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow(AnalysisValidationError);
    expect(() =>
      parseAnalysisCreation({
        agreementVersionId: id,
        instructionVersionId: "33333333-3333-4333-8333-333333333333",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        threshold: 0.4,
      }),
    ).toThrow(AnalysisValidationError);
  });
});
