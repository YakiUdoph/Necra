import { describe, expect, it, vi } from "vitest";

import {
  ClockedAdapterError,
  requestClockedCompare,
  requestClockedGrounding,
} from "../../src/server/integrations/clocked/adapter";
import {
  ClockedEvidenceIntegrityError,
  validateClockedClaims,
} from "../../src/server/analysis/clocked-result";
import {
  ProcessingAuthorizationError,
  requireProcessingAuthorization,
} from "../../src/server/analysis/processing-authorization";
import type { ClockedGroundingTextResponse } from "../../src/server/integrations/clocked/contract";

const versionId = "11111111-1111-4111-8111-111111111111";
const alias = `agreement-version:${versionId}`;

function responseBody(overrides: Partial<ClockedGroundingTextResponse> = {}) {
  return {
    model: "clocked-test-model",
    instructions_used: "default",
    grounded: 0.2,
    ungrounded: 0.8,
    verdict: "not_stated",
    threshold: 0.5,
    claims: [
      {
        claim: "Add the rocket 🚀 dashboard.",
        kind: "claim",
        counted: true,
        weight: 1,
        supported: 0.1,
        contradicted: 0.1,
        not_stated: 0.79,
        not_a_claim: 0.01,
        verdict: "not_stated" as const,
        sources: { [alias]: 1 },
        source: null,
        evidence: {
          document: alias,
          quote: "rocket 🚀 scope",
          start: 7,
          end: 21,
          confidence: 0.9,
        },
      },
    ],
    documents: [{ id: alias, share: 1, share_of_answer: 0.2, claims: [0] }],
    unsupported_claims: [0],
    not_claims: [],
    weakest_claim: { index: 0, supported: 0.1 },
    ...overrides,
  } satisfies ClockedGroundingTextResponse;
}

describe("Clocked server adapter with mocked transport", () => {
  it("sends the exact Grounding request identity and validates result metadata", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (_url, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer TEST_ONLY_KEY");
      expect(headers.get("idempotency-key")).toBe("22222222-2222-4222-8222-222222222222");
      expect(init?.body).toBe(
        JSON.stringify({
          documents: [{ id: alias, text: "Prefix rocket 🚀 scope suffix" }],
          answer: "Add the dashboard",
          evidence: "all",
        }),
      );
      return new Response(JSON.stringify(responseBody()), {
        status: 200,
        headers: {
          "X-Clocked-Model-Ms": "250",
          "X-Clocked-Credits": "10",
          "X-Clocked-Cost-Usd": "0.000123",
          "X-Clocked-Cost-Basis": "reference",
          "X-Clocked-Transport": "replay",
        },
      });
    });
    const result = await requestClockedGrounding({
      apiKey: "TEST_ONLY_KEY",
      baseUrl: "https://clocked.rezolve.ai/clocked",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      request: {
        documents: [{ id: alias, text: "Prefix rocket 🚀 scope suffix" }],
        answer: "Add the dashboard",
        evidence: "all",
      },
      fetchImplementation,
    });
    expect(fetchImplementation.mock.calls[0]?.[0].toString()).toBe(
      "https://clocked.rezolve.ai/clocked/grounding",
    );
    expect(result.transportMetadata).toEqual({
      modelMs: 250,
      credits: 10,
      costUsd: "0.000123",
      costBasis: "reference",
      transport: "replay",
    });
    expect(result.responseHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("classifies provider failures without exposing provider text", async () => {
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        fetchImplementation: async () =>
          new Response(
            JSON.stringify({ error: "PRIVATE PROVIDER DETAIL", retryAsNew: true }),
            { status: 409 },
          ),
      }),
    ).rejects.toMatchObject({
      kind: "conflict",
      message: "Clocked request did not produce a validated result",
      options: { status: 409, retryAsNew: true },
    });
  });

  it("rejects malformed successful responses", async () => {
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        fetchImplementation: async () =>
          new Response(JSON.stringify({ model: "incomplete" }), { status: 200 }),
      }),
    ).rejects.toBeInstanceOf(ClockedAdapterError);
  });

  it("rejects an invalid outbound request before the mocked transport is called", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "",
        },
        fetchImplementation,
      }),
    ).rejects.toMatchObject({ kind: "invalid_request" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects an invalid provider request identity before transport", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "not-a-uuid",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        fetchImplementation,
      }),
    ).rejects.toMatchObject({ kind: "invalid_request" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("uses the documented Compare endpoint with a validated text request", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Response.json({
        model: "clocked-test-model",
        verdict: "unrelated",
        threshold: 0.5,
        instructions_used: "default",
        evidence: "all",
        documents: [
          { id: "agreement", duplicates: [], overlaps: [], conflicts: [] },
          { id: "instruction", duplicates: [], overlaps: [], conflicts: [] },
        ],
        pairs: [
          {
            a: "agreement",
            b: "instruction",
            relation: "unrelated",
            related: 0.01,
            probabilities: {
              same: 0.01,
              overlapping: 0.01,
              conflicting: 0.01,
              unrelated: 0.97,
            },
            duplicates: [],
            conflicts: [],
          },
        ],
        duplicates: [],
        overlaps: [],
        conflicts: [],
        related_pairs: [],
      }),
    );
    const result = await requestClockedCompare({
      apiKey: "TEST_ONLY_KEY",
      baseUrl: "https://clocked.rezolve.ai/clocked",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      request: {
        documents: [
          { id: "agreement", text: "Design only." },
          { id: "instruction", text: "Add a dashboard." },
        ],
        evidence: "all",
      },
      fetchImplementation,
    });
    expect(fetchImplementation.mock.calls[0]?.[0].toString()).toBe(
      "https://clocked.rezolve.ai/clocked/compare",
    );
    expect(result.result.pairs[0]?.relation).toBe("unrelated");
  });

  it("rejects an oversized streamed response", async () => {
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        fetchImplementation: async () =>
          new Response("x".repeat(4 * 1024 * 1024 + 1), { status: 200 }),
      }),
    ).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it.each([
    [401, "authentication"],
    [402, "credits"],
    [422, "invalid_request"],
    [429, "rate_limited"],
    [503, "provider_unavailable"],
  ] as const)("classifies HTTP %i as %s", async (status, kind) => {
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        fetchImplementation: async () =>
          new Response(JSON.stringify({ error: "TEST ONLY" }), { status }),
      }),
    ).rejects.toMatchObject({ kind });
  });

  it("classifies a client timeout as an unknown outcome", async () => {
    await expect(
      requestClockedGrounding({
        apiKey: "TEST_ONLY_KEY",
        baseUrl: "https://clocked.rezolve.ai/clocked",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        request: {
          documents: [{ id: alias, text: "Agreement" }],
          answer: "Instruction",
        },
        timeoutMs: 1,
        fetchImplementation: async (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      }),
    ).rejects.toMatchObject({ kind: "timeout_unknown" });
  });
});

describe("Clocked processing authorization", () => {
  it("requires an explicit true confirmation and rejects extra fields", () => {
    expect(() =>
      requireProcessingAuthorization({ confirmExternalProcessing: true }),
    ).not.toThrow();
    expect(() =>
      requireProcessingAuthorization({ confirmExternalProcessing: false }),
    ).toThrow(ProcessingAuthorizationError);
    expect(() =>
      requireProcessingAuthorization({
        confirmExternalProcessing: true,
        actorUserId: "spoofed",
      }),
    ).toThrow(ProcessingAuthorizationError);
  });
});

describe("Clocked evidence validation", () => {
  it("converts code-point offsets to exact UTF-16 offsets", () => {
    const source = "Prefix rocket 🚀 scope suffix";
    const [claim] = validateClockedClaims({
      response: responseBody(),
      agreementVersionId: versionId,
      agreementText: source,
    });
    expect(claim?.evidence).toMatchObject({
      quote: "rocket 🚀 scope",
      startOffset: 7,
      endOffset: 22,
      documentVersionId: versionId,
    });
    expect(source.slice(claim?.evidence?.startOffset, claim?.evidence?.endOffset)).toBe(
      "rocket 🚀 scope",
    );
  });

  it("rejects mismatched aliases and quotations", () => {
    const invalid = responseBody();
    if (!invalid.claims[0]?.evidence) throw new Error("Test evidence missing");
    invalid.claims[0].evidence.quote = "invented quotation";
    expect(() =>
      validateClockedClaims({
        response: invalid,
        agreementVersionId: versionId,
        agreementText: "Prefix rocket 🚀 scope suffix",
      }),
    ).toThrow(ClockedEvidenceIntegrityError);
  });

  it("rejects provider indexes that do not resolve to returned claims", () => {
    const invalid = responseBody({ unsupported_claims: [1] });
    expect(() =>
      validateClockedClaims({
        response: invalid,
        agreementVersionId: versionId,
        agreementText: "Prefix rocket 🚀 scope suffix",
      }),
    ).toThrow(ClockedEvidenceIntegrityError);
  });
});
