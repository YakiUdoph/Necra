import { describe, expect, it } from "vitest";

import {
  DecisionValidationError,
  parseDecisionCreation,
} from "../../src/server/decisions/validation";

const validInput = {
  outcome: "approved",
  rationale: "The additional work is authorized.",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  supersedesDecisionId: null,
  confirmReviewedExactRecord: true,
};

describe("T010 decision validation", () => {
  it("accepts only a deliberate approved or rejected decision", () => {
    expect(parseDecisionCreation(validInput)).toEqual(validInput);
    expect(parseDecisionCreation({ ...validInput, outcome: "rejected" }).outcome).toBe(
      "rejected",
    );
  });

  it("rejects unresolved, missing confirmation, actor spoofing, and oversized rationale", () => {
    for (const input of [
      { ...validInput, outcome: "unresolved" },
      { ...validInput, confirmReviewedExactRecord: false },
      { ...validInput, actorUserId: "22222222-2222-4222-8222-222222222222" },
      { ...validInput, rationale: "x".repeat(2_001) },
    ]) {
      expect(() => parseDecisionCreation(input)).toThrow(DecisionValidationError);
    }
  });

  it("normalizes blank optional rationale without inventing a note", () => {
    expect(parseDecisionCreation({ ...validInput, rationale: "   " }).rationale).toBe(
      undefined,
    );
  });
});
