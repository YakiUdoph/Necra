import compareRecordedResponse from "../fixtures/clocked/compare-recorded-response.json";
import groundingRecordedResponse from "../fixtures/clocked/grounding-recorded-response.json";
import { describe, expect, it } from "vitest";

import {
  clockedCompareTextRequestSchema,
  clockedCompareTextResponseSchema,
  clockedGroundingTextRequestSchema,
  clockedGroundingTextResponseSchema,
  sliceUnicodeCodePoints,
  unicodeCodePointOffsetToUtf16,
} from "../../src/server/integrations/clocked/contract";

describe("documented Clocked text contracts", () => {
  it("validates the official recorded Compare response fixture", () => {
    expect(() =>
      clockedCompareTextResponseSchema.parse(compareRecordedResponse),
    ).not.toThrow();
  });

  it("validates the official recorded Grounding response fixture", () => {
    expect(() =>
      clockedGroundingTextResponseSchema.parse(groundingRecordedResponse),
    ).not.toThrow();
  });

  it("accepts the observed null aggregate and claim-kinds compatibility shape", () => {
    const observedCompatibilityShape = {
      ...structuredClone(groundingRecordedResponse),
      grounded: null,
      ungrounded: null,
      claims: groundingRecordedResponse.claims.map((claim, index) =>
        index === 0
          ? {
              ...claim,
              kinds: {
                acknowledgement: 0.25,
                offer_or_question: 0.25,
                pointer: 0.25,
                meta: 0.25,
              },
            }
          : claim,
      ),
    };

    expect(() =>
      clockedGroundingTextResponseSchema.parse(observedCompatibilityShape),
    ).not.toThrow();
  });

  it("enforces the documented text request boundaries", () => {
    expect(() =>
      clockedCompareTextRequestSchema.parse({
        documents: [
          { id: "agreement", text: "Original agreement" },
          { id: "instruction", text: "Later instruction" },
        ],
        evidence: "all",
      }),
    ).not.toThrow();
    expect(() =>
      clockedGroundingTextRequestSchema.parse({
        documents: [{ id: "agreement", text: "Original agreement" }],
        answer: "Later instruction",
        evidence: "all",
      }),
    ).not.toThrow();
    expect(() =>
      clockedCompareTextRequestSchema.parse({
        documents: [{ id: "only-one", text: "Insufficient document count" }],
      }),
    ).toThrow();
  });

  it("converts Clocked Unicode code-point offsets to Necra UTF-16 offsets", () => {
    const source = "A😀B";
    expect(sliceUnicodeCodePoints(source, 1, 2)).toBe("😀");
    expect(unicodeCodePointOffsetToUtf16(source, 1)).toBe(1);
    expect(unicodeCodePointOffsetToUtf16(source, 2)).toBe(3);
  });
});
