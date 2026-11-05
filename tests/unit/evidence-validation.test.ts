import { describe, expect, it } from "vitest";

import {
  EvidenceValidationError,
  hashEvidenceContent,
  MAX_EVIDENCE_BYTES,
  parseEvidenceInput,
} from "../../src/server/evidence/validation";

const validInput = {
  format: "pasted_text",
  kind: "agreement",
  title: "Signed statement of work",
  content: "Exact scope — café ☕\nSecond line.",
  idempotencyKey: "74f1eb77-4d67-4f2e-bf89-579b14225b91",
} as const;

describe("evidence validation and hashing", () => {
  it("hashes the exact UTF-8 bytes without Unicode or whitespace normalization", () => {
    expect(hashEvidenceContent(validInput.content)).toBe(
      "dcc662415c7dc664dc4c3f1f20a4d155e5c9f9af52833e395d76e17ce3251344",
    );
    expect(hashEvidenceContent("é")).not.toBe(hashEvidenceContent("e\u0301"));
    expect(hashEvidenceContent("scope")).not.toBe(hashEvidenceContent("scope\n"));
  });

  it("accepts valid exact text and optional real provenance", () => {
    expect(
      parseEvidenceInput({
        ...validInput,
        sourceAttribution: "Client email",
        sourceObservedAt: "2026-11-03T10:15:00-01:00",
      }),
    ).toMatchObject({ title: validInput.title, content: validInput.content });
  });

  it.each([
    ["empty", { ...validInput, content: "" }],
    ["spaces", { ...validInput, content: "   \n" }],
    ["null byte", { ...validInput, content: "scope\u0000hidden" }],
    ["unpaired surrogate", { ...validInput, content: "scope\ud800" }],
    ["oversized", { ...validInput, content: "a".repeat(MAX_EVIDENCE_BYTES + 1) }],
    ["unknown field", { ...validInput, clientHash: "untrusted" }],
    ["unsupported format", { ...validInput, format: "pdf" }],
  ])("rejects %s evidence", (_label, input) => {
    expect(() => parseEvidenceInput(input)).toThrow(EvidenceValidationError);
  });
});
