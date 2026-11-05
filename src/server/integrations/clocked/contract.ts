import { z } from "zod";

export const CLOCKED_BASE_URL = "https://clocked.rezolve.ai/clocked" as const;
export const CLOCKED_COMPARE_PATH = "/compare" as const;
export const CLOCKED_GROUNDING_PATH = "/grounding" as const;

const probabilitySchema = z.number().min(0).max(1);
const indexSchema = z.number().int().nonnegative();
const evidenceModeSchema = z.enum(["all", "flagged", "none"]);

export const clockedTextDocumentSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

const clockedSourcePassageSchema = z
  .object({
    document: z.string().min(1),
    quote: z.string(),
    start: indexSchema,
    end: indexSchema,
    confidence: probabilitySchema,
  })
  .strict()
  .refine((passage) => passage.end >= passage.start, {
    message: "Clocked evidence end must not precede start",
    path: ["end"],
  });

function totalDocumentCharacters(documents: readonly { text: string }[]) {
  return documents.reduce((total, document) => total + document.text.length, 0);
}

export const clockedCompareTextRequestSchema = z
  .object({
    documents: z.array(clockedTextDocumentSchema).min(2).max(20),
    instructions: z.string().max(20_000).optional(),
    threshold: probabilitySchema.optional(),
    evidence: evidenceModeSchema.optional(),
    kinds: z.boolean().optional(),
    rotations: z.number().int().min(1).max(8).optional(),
    debug: z.boolean().optional(),
  })
  .strict()
  .refine((request) => totalDocumentCharacters(request.documents) <= 200_000, {
    message: "Compare documents exceed the documented 200,000-character limit",
    path: ["documents"],
  });

const clockedCompareFindingSchema = z
  .object({
    kind: z.string().optional(),
    kinds: z.record(z.string(), probabilitySchema).optional(),
    confidence: probabilitySchema.optional(),
    a: clockedSourcePassageSchema,
    b: clockedSourcePassageSchema,
  })
  .strict();

const clockedComparePairSchema = z
  .object({
    a: z.string().min(1),
    b: z.string().min(1),
    relation: z.enum(["same", "overlapping", "conflicting", "unrelated"]),
    related: probabilitySchema,
    probabilities: z
      .object({
        same: probabilitySchema,
        overlapping: probabilitySchema,
        conflicting: probabilitySchema,
        unrelated: probabilitySchema,
      })
      .strict(),
    duplicates: z.array(clockedCompareFindingSchema),
    conflicts: z.array(clockedCompareFindingSchema),
  })
  .strict();

export const clockedCompareTextResponseSchema = z
  .object({
    model: z.string().min(1),
    verdict: z.string().min(1),
    threshold: probabilitySchema,
    instructions_used: z.string().min(1),
    evidence: evidenceModeSchema,
    documents: z.array(
      z
        .object({
          id: z.string().min(1),
          duplicates: z.array(z.string()),
          overlaps: z.array(z.string()),
          conflicts: z.array(z.string()),
        })
        .strict(),
    ),
    pairs: z.array(clockedComparePairSchema),
    duplicates: z.array(indexSchema),
    overlaps: z.array(indexSchema),
    conflicts: z.array(indexSchema),
    related_pairs: z.array(indexSchema),
    stages: z.record(z.string(), z.unknown()).optional(),
    timing: z.record(z.string(), z.number()).optional(),
  })
  .strict();

export const clockedGroundingTextRequestSchema = z
  .object({
    documents: z.array(clockedTextDocumentSchema).min(1).max(20),
    answer: z.string().min(1).max(20_000),
    question: z.string().min(1).optional(),
    claims: z.array(z.string().min(1)).min(1).max(30).optional(),
    instructions: z.string().max(20_000).optional(),
    threshold: probabilitySchema.optional(),
    evidence: evidenceModeSchema.optional(),
    rotations: z.number().int().min(1).max(8).optional(),
  })
  .strict()
  .refine((request) => totalDocumentCharacters(request.documents) <= 200_000, {
    message: "Grounding documents exceed the documented 200,000-character limit",
    path: ["documents"],
  });

const clockedClaimVerdictSchema = z.enum([
  "supported",
  "contradicted",
  "not_stated",
  "not_a_claim",
]);

const clockedGroundingClaimSchema = z
  .object({
    claim: z.string(),
    kind: z.string(),
    counted: z.boolean(),
    weight: z.number().nonnegative(),
    supported: probabilitySchema,
    contradicted: probabilitySchema,
    not_stated: probabilitySchema,
    not_a_claim: probabilitySchema,
    verdict: clockedClaimVerdictSchema,
    sources: z.record(z.string(), probabilitySchema),
    source: z.string().nullable(),
    evidence: clockedSourcePassageSchema.optional(),
  })
  .strict();

export const clockedGroundingTextResponseSchema = z
  .object({
    model: z.string().min(1),
    instructions_used: z.string().min(1),
    grounded: probabilitySchema,
    ungrounded: probabilitySchema,
    verdict: z.string().min(1),
    threshold: probabilitySchema,
    claims: z.array(clockedGroundingClaimSchema),
    documents: z.array(
      z
        .object({
          id: z.string().min(1),
          share: probabilitySchema,
          share_of_answer: probabilitySchema,
          claims: z.array(indexSchema),
        })
        .strict(),
    ),
    unsupported_claims: z.array(indexSchema).optional(),
    not_claims: z.array(indexSchema).optional(),
    weakest_claim: z
      .object({ index: indexSchema, supported: probabilitySchema })
      .strict()
      .nullable()
      .optional(),
    answers_question: probabilitySchema.optional(),
    timing: z.record(z.string(), z.number()).optional(),
  })
  .strict();

export type ClockedCompareTextRequest = z.infer<typeof clockedCompareTextRequestSchema>;
export type ClockedCompareTextResponse = z.infer<typeof clockedCompareTextResponseSchema>;
export type ClockedGroundingTextRequest = z.infer<
  typeof clockedGroundingTextRequestSchema
>;
export type ClockedGroundingTextResponse = z.infer<
  typeof clockedGroundingTextResponseSchema
>;

export function sliceUnicodeCodePoints(source: string, start: number, end: number) {
  return Array.from(source).slice(start, end).join("");
}

export function unicodeCodePointOffsetToUtf16(source: string, offset: number) {
  return Array.from(source).slice(0, offset).join("").length;
}
