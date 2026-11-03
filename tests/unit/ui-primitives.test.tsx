import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComparisonEmpty } from "../../src/components/product/comparison-empty";
import {
  Button,
  EmptyState,
  StatusLozenge,
  TextField,
} from "../../src/components/ui/primitives";

describe("T004 interface primitives", () => {
  it("renders status with text in addition to color", () => {
    const markup = renderToStaticMarkup(
      <StatusLozenge tone="planned">Not available yet</StatusLozenge>,
    );

    expect(markup).toContain("status-planned");
    expect(markup).toContain("Not available yet");
  });

  it("associates field guidance and errors with the control", () => {
    const markup = renderToStaticMarkup(
      <TextField
        description="Use a work address."
        error="Enter a valid address."
        id="account-email"
        label="Email address"
        name="email"
      />,
    );

    expect(markup).toContain('for="account-email"');
    expect(markup).toContain('aria-describedby="account-email-help account-email-error"');
    expect(markup).toContain('aria-invalid="true"');
  });

  it("gives empty states a stable accessible heading", () => {
    const markup = renderToStaticMarkup(
      <EmptyState title="No agreement available">
        <p>Add an agreement after evidence ingestion is implemented.</p>
      </EmptyState>,
    );

    expect(markup).toContain('aria-labelledby="empty-no-agreement-available"');
    expect(markup).toContain('id="empty-no-agreement-available"');
  });

  it("defaults buttons to a non-submitting type", () => {
    const markup = renderToStaticMarkup(<Button>Open details</Button>);
    expect(markup).toContain('type="button"');
  });

  it("keeps the comparison empty and separates findings from decisions", () => {
    const markup = renderToStaticMarkup(<ComparisonEmpty />);

    expect(markup).toContain("Nothing to compare");
    expect(markup).toContain("They will not be treated as decisions.");
    expect(markup).not.toContain("approved");
  });
});
