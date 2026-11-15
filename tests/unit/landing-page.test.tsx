import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "../../src/app/page";

describe("premium public landing page", () => {
  it("keeps the product boundary explicit and every primary CTA on the supported access path", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("A request");
    expect(markup).toContain("An approval");
    expect(markup).toContain("A finding");
    expect(markup).toContain("A decision");
    expect(markup).toContain("Illustrative interface");
    expect(markup).not.toContain('href="/sign-up"');
    expect(markup.match(/href="\/sign-in"/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("exposes working in-page navigation targets", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain('href="#method"');
    expect(markup).toContain('id="method"');
    expect(markup).toContain('href="#workspace"');
    expect(markup).toContain('id="workspace"');
  });
});
