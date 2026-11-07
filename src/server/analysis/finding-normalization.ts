export type FindingCategory =
  | "potential_change"
  | "possible_conflict"
  | "ambiguity"
  | "missing_evidence";

export type ProviderClaimVerdict =
  | "supported"
  | "contradicted"
  | "not_stated"
  | "not_a_claim";

export interface PersistedProviderClaim {
  claimIndex: number;
  claim: string;
  verdict: ProviderClaimVerdict;
  evidenceDocumentVersionId: string | null;
  evidenceQuote: string | null;
  evidenceStartOffset: number | null;
  evidenceEndOffset: number | null;
}

export interface FindingSourceVersion {
  documentId: string;
  versionId: string;
  title: string;
  versionNumber: number;
  contentHash: string;
  content: string;
}

export interface NormalizedFinding {
  claimIndex: number;
  claim: string;
  verdict: ProviderClaimVerdict;
  category: FindingCategory;
  reviewState: "source_supported" | "possible_conflict" | "unresolved";
  evidence:
    | {
        state: "verified";
        documentId: string;
        documentVersionId: string;
        sourceTitle: string;
        sourceVersionNumber: number;
        quote: string;
        startOffset: number;
        endOffset: number;
      }
    | { state: "unavailable" }
    | { state: "invalid" };
}

const categoryByVerdict: Record<ProviderClaimVerdict, FindingCategory> = {
  supported: "potential_change",
  contradicted: "possible_conflict",
  not_stated: "missing_evidence",
  not_a_claim: "ambiguity",
};

export function normalizePersistedProviderClaim(
  claim: PersistedProviderClaim,
  agreement: FindingSourceVersion,
): NormalizedFinding {
  const evidenceValues = [
    claim.evidenceDocumentVersionId,
    claim.evidenceQuote,
    claim.evidenceStartOffset,
    claim.evidenceEndOffset,
  ];
  const hasNoEvidence = evidenceValues.every((value) => value === null);
  const hasCompleteEvidence = evidenceValues.every((value) => value !== null);

  let evidence: NormalizedFinding["evidence"];
  if (hasNoEvidence) {
    evidence = { state: "unavailable" };
  } else if (
    hasCompleteEvidence &&
    claim.evidenceDocumentVersionId === agreement.versionId &&
    typeof claim.evidenceQuote === "string" &&
    typeof claim.evidenceStartOffset === "number" &&
    typeof claim.evidenceEndOffset === "number" &&
    claim.evidenceStartOffset >= 0 &&
    claim.evidenceEndOffset > claim.evidenceStartOffset &&
    claim.evidenceEndOffset <= agreement.content.length &&
    agreement.content.slice(claim.evidenceStartOffset, claim.evidenceEndOffset) ===
      claim.evidenceQuote
  ) {
    evidence = {
      state: "verified",
      documentId: agreement.documentId,
      documentVersionId: agreement.versionId,
      sourceTitle: agreement.title,
      sourceVersionNumber: agreement.versionNumber,
      quote: claim.evidenceQuote,
      startOffset: claim.evidenceStartOffset,
      endOffset: claim.evidenceEndOffset,
    };
  } else {
    evidence = { state: "invalid" };
  }

  return {
    claimIndex: claim.claimIndex,
    claim: claim.claim,
    verdict: claim.verdict,
    category: categoryByVerdict[claim.verdict],
    reviewState:
      claim.verdict === "supported" && evidence.state === "verified"
        ? "source_supported"
        : claim.verdict === "contradicted"
          ? "possible_conflict"
          : "unresolved",
    evidence,
  };
}
