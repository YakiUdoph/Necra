import { describe, expect, it } from "vitest";

import {
  type FindingSourceVersion,
  normalizePersistedProviderClaim,
} from "../../src/server/analysis/finding-normalization";

const agreement: FindingSourceVersion = {
  documentId: "document-agreement",
  versionId: "version-agreement",
  title: "Signed scope",
  versionNumber: 2,
  contentHash: "a".repeat(64),
  content: "Intro. Scope: research and design. End.",
};

describe("T009 finding normalization", () => {
  it("keeps a genuine source identity, exact quotation, and UTF-16 offsets", () => {
    const quote = "Scope: research and design.";
    const startOffset = agreement.content.indexOf(quote);
    const finding = normalizePersistedProviderClaim(
      {
        claimIndex: 0,
        claim: "Research and design are included.",
        verdict: "supported",
        evidenceDocumentVersionId: agreement.versionId,
        evidenceQuote: quote,
        evidenceStartOffset: startOffset,
        evidenceEndOffset: startOffset + quote.length,
      },
      agreement,
    );

    expect(finding).toMatchObject({
      category: "potential_change",
      reviewState: "source_supported",
      evidence: {
        state: "verified",
        documentId: agreement.documentId,
        documentVersionId: agreement.versionId,
        sourceTitle: agreement.title,
        sourceVersionNumber: 2,
        quote,
        startOffset,
        endOffset: startOffset + quote.length,
      },
    });
  });

  it("keeps a zero-reference provider result citation-free and unresolved", () => {
    const finding = normalizePersistedProviderClaim(
      {
        claimIndex: 1,
        claim: "A reporting dashboard is included.",
        verdict: "not_stated",
        evidenceDocumentVersionId: null,
        evidenceQuote: null,
        evidenceStartOffset: null,
        evidenceEndOffset: null,
      },
      agreement,
    );

    expect(finding).toMatchObject({
      category: "missing_evidence",
      reviewState: "unresolved",
      evidence: { state: "unavailable" },
    });
    expect(finding.evidence).not.toHaveProperty("quote");
  });

  it.each([
    ["contradicted", "possible_conflict"],
    ["not_stated", "missing_evidence"],
    ["not_a_claim", "ambiguity"],
  ] as const)("maps %s without inventing a provider status", (verdict, category) => {
    const finding = normalizePersistedProviderClaim(
      {
        claimIndex: 0,
        claim: "Review this instruction.",
        verdict,
        evidenceDocumentVersionId: null,
        evidenceQuote: null,
        evidenceStartOffset: null,
        evidenceEndOffset: null,
      },
      agreement,
    );
    expect(finding.verdict).toBe(verdict);
    expect(finding.category).toBe(category);
  });

  it("refuses a mismatched quotation, wrong version, or partial locator", () => {
    for (const claim of [
      {
        evidenceDocumentVersionId: agreement.versionId,
        evidenceQuote: "Scope: altered text.",
        evidenceStartOffset: 7,
        evidenceEndOffset: 27,
      },
      {
        evidenceDocumentVersionId: "another-version",
        evidenceQuote: "Scope: research and design.",
        evidenceStartOffset: 7,
        evidenceEndOffset: 34,
      },
      {
        evidenceDocumentVersionId: agreement.versionId,
        evidenceQuote: "Scope: research and design.",
        evidenceStartOffset: 7,
        evidenceEndOffset: null,
      },
    ]) {
      expect(
        normalizePersistedProviderClaim(
          {
            claimIndex: 0,
            claim: "Untrusted result",
            verdict: "supported",
            ...claim,
          },
          agreement,
        ).evidence,
      ).toEqual({ state: "invalid" });
    }
  });
});
