import { z } from "zod";

export const MAX_DECISION_REQUEST_BYTES = 6 * 1024;

export const decisionCreationSchema = z
  .object({
    outcome: z.enum(["approved", "rejected"]),
    rationale: z.string().trim().max(2_000).optional(),
    idempotencyKey: z.uuid(),
    supersedesDecisionId: z.uuid().nullable().optional(),
    confirmReviewedExactRecord: z.literal(true),
  })
  .strict();

export type DecisionCreationInput = z.infer<typeof decisionCreationSchema>;

export class DecisionValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[] | undefined>) {
    super("Decision input is invalid");
    this.name = "DecisionValidationError";
  }
}

export function parseDecisionCreation(value: unknown): DecisionCreationInput {
  const parsed = decisionCreationSchema.safeParse(value);
  if (!parsed.success) {
    throw new DecisionValidationError(parsed.error.flatten().fieldErrors);
  }
  return {
    ...parsed.data,
    rationale: parsed.data.rationale || undefined,
    supersedesDecisionId: parsed.data.supersedesDecisionId ?? null,
  };
}
