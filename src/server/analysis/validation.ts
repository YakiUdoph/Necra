import { z } from "zod";

export const MAX_ANALYSIS_REQUEST_BYTES = 4 * 1024;

export const analysisCreationSchema = z
  .object({
    agreementVersionId: z.uuid(),
    instructionVersionId: z.uuid(),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .refine((value) => value.agreementVersionId !== value.instructionVersionId, {
    message: "Choose two different evidence versions.",
    path: ["instructionVersionId"],
  });

export type AnalysisCreationInput = z.infer<typeof analysisCreationSchema>;

export class AnalysisValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[] | undefined>) {
    super("Reality Check input is invalid");
    this.name = "AnalysisValidationError";
  }
}

export function parseAnalysisCreation(value: unknown): AnalysisCreationInput {
  const parsed = analysisCreationSchema.safeParse(value);
  if (!parsed.success) {
    throw new AnalysisValidationError(parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}
