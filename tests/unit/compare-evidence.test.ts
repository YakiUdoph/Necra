import { describe, expect, it } from "vitest";
import { validateCompareEvidence } from "../../src/server/analysis/compare-service";
import type { ClockedCompareTextResponse } from "../../src/server/integrations/clocked/contract";

const a = "agreement-version:11111111-1111-4111-8111-111111111111";
const b = "instruction-version:22222222-2222-4222-8222-222222222222";

const sources = {
  [a]: "Price is $10 \u{1F600}",
  [b]: "Price is $20 \u{1F600}",
};

const base: ClockedCompareTextResponse = {
  model: "test-fixture",
  verdict: "test-fixture",
  threshold: 0.5,
  instructions_used: "test-fixture",
  evidence: "all",
  documents: [
    { id: a, duplicates: [], overlaps: [], conflicts: [b] },
    { id: b, duplicates: [], overlaps: [], conflicts: [a] },
  ],
  pairs: [
    {
      a,
      b,
      relation: "conflicting",
      related: 0.9,
      probabilities: {
        same: 0,
        overlapping: 0.1,
        conflicting: 0.9,
        unrelated: 0,
      },
      duplicates: [],
      conflicts: [
        {
          a: {
            document: a,
            quote: "\u{1F600}",
            start: 13,
            end: 14,
            confidence: 1,
          },
          b: {
            document: b,
            quote: "\u{1F600}",
            start: 13,
            end: 14,
            confidence: 1,
          },
        },
      ],
    },
  ],
  duplicates: [],
  overlaps: [],
  conflicts: [0],
  related_pairs: [0],
};

describe("Compare evidence integrity", () => {
  it("accepts exact Unicode code-point quotations", () => {
    expect(() => validateCompareEvidence(base, sources)).not.toThrow();
  });

  it("rejects forged quotations", () => {
    const pair = base.pairs[0];

    if (!pair) {
      throw new Error("Missing first pair in test fixture");
    }

    const conflict = pair.conflicts[0];

    if (!conflict) {
      throw new Error("Missing first conflict in test fixture");
    }

    const forged: ClockedCompareTextResponse = {
      ...base,
      pairs: [
        {
          ...pair,
          conflicts: [
            {
              ...conflict,
              a: {
                ...conflict.a,
                quote: "fabricated",
              },
            },
          ],
        },
      ],
    };

    expect(() => validateCompareEvidence(forged, sources)).toThrow();
  });

  it("rejects unknown source aliases", () => {
    const secondDocument = base.documents[1];

    if (!secondDocument) {
      throw new Error("Missing second document in test fixture");
    }

    const altered: ClockedCompareTextResponse = {
      ...base,
      documents: [
        {
          id: "other",
          duplicates: [],
          overlaps: [],
          conflicts: [],
        },
        secondDocument,
      ],
    };

    expect(() => validateCompareEvidence(altered, sources)).toThrow();
  });

  it("rejects out-of-range pair indexes", () => {
    expect(() => validateCompareEvidence({ ...base, conflicts: [1] }, sources)).toThrow();
  });
});
