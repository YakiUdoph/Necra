import { createHash } from "node:crypto";

import type { ClockedGroundingTextResponse } from "../integrations/clocked/contract";
import {
  sliceUnicodeCodePoints,
  unicodeCodePointOffsetToUtf16,
} from "../integrations/clocked/contract";

export class ClockedEvidenceIntegrityError extends Error {
  constructor() {
    super("Clocked result did not match the immutable analysis evidence");
    this.name = "ClockedEvidenceIntegrityError";
  }
}

export interface ValidatedProviderClaim {
  claimIndex: number;
  claim: string;
  kind: string;
  counted: boolean;
  weight: number;
  supported: number;
  contradicted: number;
  notStated: number;
  notAClaim: number;
  verdict: "supported" | "contradicted" | "not_stated" | "not_a_claim";
  sourceAlias: string | null;
  evidence: {
    documentVersionId: string;
    quote: string;
    startOffset: number;
    endOffset: number;
    confidence: number;
  } | null;
}

export function verifyContentHash(content: string, expectedHash: string) {
  const actual = createHash("sha256").update(content, "utf8").digest("hex");
  if (actual !== expectedHash) throw new ClockedEvidenceIntegrityError();
}

export function validateClockedClaims(input: {
  response: ClockedGroundingTextResponse;
  agreementVersionId: string;
  agreementText: string;
}): ValidatedProviderClaim[] {
  const expectedAlias = `agreement-version:${input.agreementVersionId}`;
  if (
    input.response.documents.length !== 1 ||
    input.response.documents[0]?.id !== expectedAlias
  ) {
    throw new ClockedEvidenceIntegrityError();
  }

  validateClaimIndexes(input.response);

  return input.response.claims.map((claim, claimIndex) => {
    if (
      (claim.source !== null && claim.source !== expectedAlias) ||
      Object.keys(claim.sources).some((source) => source !== expectedAlias)
    ) {
      throw new ClockedEvidenceIntegrityError();
    }
    let evidence: ValidatedProviderClaim["evidence"] = null;
    if (claim.evidence) {
      const { document, quote, start, end, confidence } = claim.evidence;
      const codePoints = Array.from(input.agreementText);
      if (
        document !== expectedAlias ||
        start < 0 ||
        end <= start ||
        end > codePoints.length ||
        sliceUnicodeCodePoints(input.agreementText, start, end) !== quote
      ) {
        throw new ClockedEvidenceIntegrityError();
      }
      const startOffset = unicodeCodePointOffsetToUtf16(input.agreementText, start);
      const endOffset = unicodeCodePointOffsetToUtf16(input.agreementText, end);
      if (input.agreementText.slice(startOffset, endOffset) !== quote) {
        throw new ClockedEvidenceIntegrityError();
      }
      evidence = {
        documentVersionId: input.agreementVersionId,
        quote,
        startOffset,
        endOffset,
        confidence,
      };
    }
    return {
      claimIndex,
      claim: claim.claim,
      kind: claim.kind,
      counted: claim.counted,
      weight: claim.weight,
      supported: claim.supported,
      contradicted: claim.contradicted,
      notStated: claim.not_stated,
      notAClaim: claim.not_a_claim,
      verdict: claim.verdict,
      sourceAlias: claim.source,
      evidence,
    };
  });
}

function validateClaimIndexes(response: ClockedGroundingTextResponse) {
  const claimCount = response.claims.length;
  const indexes = [
    ...response.documents.flatMap((document) => document.claims),
    ...(response.unsupported_claims ?? []),
    ...(response.not_claims ?? []),
    ...(response.weakest_claim ? [response.weakest_claim.index] : []),
  ];
  if (indexes.some((index) => index >= claimCount)) {
    throw new ClockedEvidenceIntegrityError();
  }
}
