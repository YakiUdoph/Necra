import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import {
  CLOCKED_COMPARE_PATH,
  CLOCKED_GROUNDING_PATH,
  clockedCompareTextRequestSchema,
  clockedCompareTextResponseSchema,
  clockedGroundingTextResponseSchema,
  clockedGroundingTextRequestSchema,
  type ClockedCompareTextRequest,
  type ClockedCompareTextResponse,
  type ClockedGroundingTextRequest,
  type ClockedGroundingTextResponse,
} from "./contract";

export const CLOCKED_ADAPTER_VERSION = "grounding-v1";
export const CLOCKED_REQUEST_TIMEOUT_MS = 115_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

const clockedErrorSchema = z
  .object({
    error: z.string().min(1),
    retryAsNew: z.boolean().optional(),
  })
  .passthrough();

export type ClockedFailureKind =
  | "authentication"
  | "credits"
  | "invalid_request"
  | "conflict"
  | "rate_limited"
  | "provider_unavailable"
  | "network_unknown"
  | "timeout_unknown"
  | "invalid_response";

export class ClockedAdapterError extends Error {
  constructor(
    readonly kind: ClockedFailureKind,
    readonly options: {
      status?: number;
      retryAsNew?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super("Clocked request did not produce a validated result", {
      cause: options.cause,
    });
    this.name = "ClockedAdapterError";
  }
}

export interface ClockedTransportMetadata {
  modelMs?: number;
  credits?: number;
  costUsd?: string;
  costBasis?: string;
  transport?: string;
  serverTiming?: string;
}

export interface ClockedGroundingResult {
  result: ClockedGroundingTextResponse;
  rawResponse: Record<string, unknown>;
  responseHash: string;
  transportMetadata: ClockedTransportMetadata;
}

export interface ClockedCompareResult {
  result: ClockedCompareTextResponse;
  rawResponse: Record<string, unknown>;
  responseHash: string;
  transportMetadata: ClockedTransportMetadata;
}

export async function requestClockedGrounding(input: {
  apiKey: string;
  baseUrl: string;
  idempotencyKey: string;
  request: ClockedGroundingTextRequest;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}): Promise<ClockedGroundingResult> {
  const request = parseOutboundRequest(clockedGroundingTextRequestSchema, input.request);
  const response = await requestClocked({
    ...input,
    path: CLOCKED_GROUNDING_PATH,
    request,
  });
  const parsed = clockedGroundingTextResponseSchema.safeParse(response.rawResponse);
  if (!parsed.success) {
    throw new ClockedAdapterError("invalid_response", { cause: parsed.error });
  }
  return { ...response, result: parsed.data };
}

export async function requestClockedCompare(input: {
  apiKey: string;
  baseUrl: string;
  idempotencyKey: string;
  request: ClockedCompareTextRequest;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}): Promise<ClockedCompareResult> {
  const request = parseOutboundRequest(clockedCompareTextRequestSchema, input.request);
  const response = await requestClocked({
    ...input,
    path: CLOCKED_COMPARE_PATH,
    request,
  });
  const parsed = clockedCompareTextResponseSchema.safeParse(response.rawResponse);
  if (!parsed.success) {
    throw new ClockedAdapterError("invalid_response", { cause: parsed.error });
  }
  return { ...response, result: parsed.data };
}

async function requestClocked(input: {
  apiKey: string;
  baseUrl: string;
  idempotencyKey: string;
  path: string;
  request: ClockedGroundingTextRequest | ClockedCompareTextRequest;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}): Promise<Omit<ClockedGroundingResult, "result">> {
  if (!input.apiKey.trim()) {
    throw new ClockedAdapterError("authentication");
  }
  if (!z.uuid().safeParse(input.idempotencyKey).success) {
    throw new ClockedAdapterError("invalid_request");
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? CLOCKED_REQUEST_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await (input.fetchImplementation ?? fetch)(
      new URL(`${input.baseUrl.replace(/\/$/, "")}${input.path}`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify(input.request),
        signal: controller.signal,
      },
    );
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new ClockedAdapterError("timeout_unknown", { cause: error });
    }
    throw new ClockedAdapterError("network_unknown", { cause: error });
  }

  let responseText: string;
  try {
    responseText = await readBoundedResponse(response);
  } catch (error) {
    if (error instanceof ClockedAdapterError) throw error;
    if (controller.signal.aborted) {
      throw new ClockedAdapterError("timeout_unknown", { cause: error });
    }
    throw new ClockedAdapterError("network_unknown", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const providerError = parseProviderError(responseText);
    throw new ClockedAdapterError(classifyHttpFailure(response.status), {
      status: response.status,
      retryAsNew: providerError?.retryAsNew,
    });
  }

  let rawResponse: unknown;
  try {
    rawResponse = JSON.parse(responseText);
  } catch (error) {
    throw new ClockedAdapterError("invalid_response", { cause: error });
  }
  if (!isRecord(rawResponse)) throw new ClockedAdapterError("invalid_response");
  return {
    rawResponse,
    responseHash: createHash("sha256").update(responseText, "utf8").digest("hex"),
    transportMetadata: readTransportMetadata(response.headers),
  };
}

async function readBoundedResponse(response: Response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new ClockedAdapterError("invalid_response");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ClockedAdapterError("invalid_response");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } catch (error) {
    if (error instanceof ClockedAdapterError) throw error;
    throw new ClockedAdapterError("invalid_response", { cause: error });
  }
  return chunks.join("");
}

function parseOutboundRequest<T>(schema: z.ZodType<T>, request: unknown): T {
  const parsed = schema.safeParse(request);
  if (!parsed.success) {
    throw new ClockedAdapterError("invalid_request", { cause: parsed.error });
  }
  return parsed.data;
}

function parseProviderError(value: string) {
  try {
    const parsed = clockedErrorSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function classifyHttpFailure(status: number): ClockedFailureKind {
  if (status === 401 || status === 403) return "authentication";
  if (status === 402) return "credits";
  if (status === 400 || status === 413 || status === 422) return "invalid_request";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  return status >= 500 ? "provider_unavailable" : "invalid_response";
}

function readTransportMetadata(headers: Headers): ClockedTransportMetadata {
  const metadata: ClockedTransportMetadata = {};
  readNonnegativeNumber(headers, "x-clocked-model-ms", (value) => {
    metadata.modelMs = value;
  });
  readNonnegativeNumber(headers, "x-clocked-credits", (value) => {
    metadata.credits = value;
  });
  const costUsd = headers.get("x-clocked-cost-usd");
  if (costUsd && /^\d+(?:\.\d{1,6})?$/.test(costUsd)) metadata.costUsd = costUsd;
  const costBasis = headers.get("x-clocked-cost-basis");
  if (costBasis) metadata.costBasis = costBasis;
  const transport = headers.get("x-clocked-transport");
  if (transport) metadata.transport = transport;
  const serverTiming = headers.get("server-timing");
  if (serverTiming) metadata.serverTiming = serverTiming;
  return metadata;
}

function readNonnegativeNumber(
  headers: Headers,
  name: string,
  assign: (value: number) => void,
) {
  const raw = headers.get(name);
  if (raw === null) return;
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) assign(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
