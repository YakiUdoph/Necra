import { describe, expect, it } from "vitest";

import {
  readBoundedJson,
  RequestTooLargeError,
} from "../../src/server/http/bounded-json";

describe("bounded JSON request parsing", () => {
  it("parses valid UTF-8 JSON within the byte limit", async () => {
    const request = new Request("http://localhost.test/evidence", {
      method: "POST",
      body: JSON.stringify({ content: "café ☕" }),
    });

    await expect(readBoundedJson(request, 128)).resolves.toEqual({
      content: "café ☕",
    });
  });

  it("rejects a declared body larger than the configured limit", async () => {
    const request = new Request("http://localhost.test/evidence", {
      method: "POST",
      headers: { "Content-Length": "129" },
      body: "{}",
    });

    await expect(readBoundedJson(request, 128)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
  });

  it("rejects a streamed body that exceeds the configured limit", async () => {
    const request = new Request("http://localhost.test/evidence", {
      method: "POST",
      body: JSON.stringify({ content: "x".repeat(128) }),
    });

    await expect(readBoundedJson(request, 64)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
  });

  it("rejects malformed UTF-8 instead of replacing invalid bytes", async () => {
    const request = new Request("http://localhost.test/evidence", {
      method: "POST",
      body: new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x22, 0x7d]),
    });

    await expect(readBoundedJson(request, 128)).rejects.toBeInstanceOf(TypeError);
  });
});
