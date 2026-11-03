import { describe, expect, it } from "vitest";

import { isTrustedMutationRequest } from "../../src/server/authorization/csrf-policy";

describe("custom mutation origin policy", () => {
  it("accepts the exact configured origin", () => {
    const request = new Request("https://necra.example/api/projects/1", {
      method: "PATCH",
      headers: { origin: "https://necra.example", "sec-fetch-site": "same-origin" },
    });
    expect(isTrustedMutationRequest(request, "https://necra.example")).toBe(true);
  });

  it("rejects missing, malformed, sibling, and cross-site origins", () => {
    const base = "https://necra.example";
    expect(isTrustedMutationRequest(new Request(`${base}/api`), base)).toBe(false);
    expect(
      isTrustedMutationRequest(
        new Request(`${base}/api`, { headers: { origin: "not-a-url" } }),
        base,
      ),
    ).toBe(false);
    expect(
      isTrustedMutationRequest(
        new Request(`${base}/api`, {
          headers: { origin: "https://app.necra.example" },
        }),
        base,
      ),
    ).toBe(false);
    expect(
      isTrustedMutationRequest(
        new Request(`${base}/api`, {
          headers: { origin: base, "sec-fetch-site": "cross-site" },
        }),
        base,
      ),
    ).toBe(false);
  });
});
