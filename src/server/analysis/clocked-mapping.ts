import { createHash } from "node:crypto";

import {
  clockedGroundingTextRequestSchema,
  type ClockedGroundingTextRequest,
} from "../integrations/clocked/contract";

export function buildClockedGroundingRequest(input: {
  agreementVersionId: string;
  agreementText: string;
  instructionText: string;
}): ClockedGroundingTextRequest {
  return clockedGroundingTextRequestSchema.parse({
    documents: [
      {
        id: `agreement-version:${input.agreementVersionId}`,
        text: input.agreementText,
      },
    ],
    answer: input.instructionText,
    evidence: "all",
  });
}

export function hashClockedRequest(request: ClockedGroundingTextRequest) {
  return createHash("sha256").update(JSON.stringify(request), "utf8").digest("hex");
}
