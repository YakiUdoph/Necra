import { createHash } from "node:crypto";

import { z } from "zod";

export const MAX_EVIDENCE_BYTES = 256 * 1024;
export const MAX_EVIDENCE_REQUEST_BYTES = 300 * 1024;
export const PASTED_TEXT_MEDIA_TYPE = "text/plain";

const evidenceContentSchema = z
  .string()
  .min(1, "Enter the evidence text.")
  .refine((value) => value.trim().length > 0, "Enter evidence text, not only spaces.")
  .refine(
    (value) => !value.includes("\u0000"),
    "Evidence text cannot contain null bytes.",
  )
  .refine(
    (value) => !hasUnpairedSurrogate(value),
    "Evidence text must contain valid Unicode.",
  )
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= MAX_EVIDENCE_BYTES,
    `Evidence text must be ${MAX_EVIDENCE_BYTES} UTF-8 bytes or fewer.`,
  );

export const evidenceInputSchema = z
  .object({
    format: z.literal("pasted_text"),
    kind: z.enum(["agreement", "instruction"]),
    title: z.string().trim().min(1).max(160),
    sourceAttribution: z.string().trim().min(1).max(240).optional(),
    sourceObservedAt: z.iso.datetime({ offset: true }).optional(),
    content: evidenceContentSchema,
    idempotencyKey: z.uuid(),
  })
  .strict();

export const evidenceVersionInputSchema = z
  .object({
    format: z.literal("pasted_text"),
    content: evidenceContentSchema,
    idempotencyKey: z.uuid(),
  })
  .strict();

export type EvidenceInput = z.infer<typeof evidenceInputSchema>;
export type EvidenceVersionInput = z.infer<typeof evidenceVersionInputSchema>;

export class EvidenceValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[] | undefined>) {
    super("Evidence input is invalid");
    this.name = "EvidenceValidationError";
  }
}

export function parseEvidenceInput(value: unknown): EvidenceInput {
  const result = evidenceInputSchema.safeParse(value);
  if (!result.success) {
    throw new EvidenceValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseEvidenceVersionInput(value: unknown): EvidenceVersionInput {
  const result = evidenceVersionInputSchema.safeParse(value);
  if (!result.success) {
    throw new EvidenceValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function hashEvidenceContent(content: string) {
  return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
}

function hasUnpairedSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) {
        return true;
      }
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}
