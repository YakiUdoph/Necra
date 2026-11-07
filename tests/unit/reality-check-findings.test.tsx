import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { RealityCheckList } from "../../src/components/analysis/reality-check-list";
import type { AnalysisRecord } from "../../src/server/analysis/analysis-service";
import { normalizePersistedProviderClaim } from "../../src/server/analysis/finding-normalization";

function completedCheck(withEvidence: boolean): AnalysisRecord {
  const agreementSource = {
    documentId: "11111111-1111-4111-8111-111111111111",
    versionId: "22222222-2222-4222-8222-222222222222",
    title: "<script>agreement title</script>",
    versionNumber: 3,
    contentHash: "a".repeat(64),
    content: "Scope: design only. <img src=x onerror=alert(1)>",
  };
  const quote = "Scope: design only.";
  const claim = {
    claimIndex: 0,
    claim: "<script>Dashboard is included.</script>",
    verdict: "not_stated" as const,
    evidenceDocumentVersionId: withEvidence ? agreementSource.versionId : null,
    evidenceQuote: withEvidence ? quote : null,
    evidenceStartOffset: withEvidence ? 0 : null,
    evidenceEndOffset: withEvidence ? quote.length : null,
  };
  return {
    id: "33333333-3333-4333-8333-333333333333",
    projectId: "44444444-4444-4444-8444-444444444444",
    workspaceId: "55555555-5555-4555-8555-555555555555",
    changeRequestId: "99999999-9999-4999-8999-999999999999",
    agreementDocumentId: agreementSource.documentId,
    agreementVersionId: agreementSource.versionId,
    agreementContentHash: agreementSource.contentHash,
    agreementTitle: agreementSource.title,
    agreementVersionNumber: agreementSource.versionNumber,
    instructionDocumentId: "66666666-6666-4666-8666-666666666666",
    instructionVersionId: "77777777-7777-4777-8777-777777777777",
    instructionContentHash: "b".repeat(64),
    instructionTitle: "Dashboard request",
    instructionVersionNumber: 1,
    status: "completed",
    lifecycleRevision: 2,
    attemptNumber: 1,
    failureCode: null,
    createdByUserId: "88888888-8888-4888-8888-888888888888",
    createdAt: new Date("2026-11-06T12:00:00.000Z"),
    queuedAt: new Date("2026-11-06T12:00:00.000Z"),
    processingStartedAt: new Date("2026-11-06T12:00:01.000Z"),
    completedAt: new Date("2026-11-06T12:00:02.000Z"),
    failedAt: null,
    reconciliationRequiredAt: null,
    providerOrigin: {
      provider: "clocked",
      adapterVersion: "clocked-text-v1",
      model: "clocked-test-model",
      validatedAt: new Date("2026-11-06T12:00:02.000Z"),
    },
    agreementSource,
    instructionSource: {
      documentId: "66666666-6666-4666-8666-666666666666",
      versionId: "77777777-7777-4777-8777-777777777777",
      title: "Dashboard request",
      versionNumber: 1,
      contentHash: "b".repeat(64),
      content: "Please add a dashboard.",
    },
    findings: [normalizePersistedProviderClaim(claim, agreementSource)],
    providerClaims: [
      {
        ...claim,
        supported: 0.05,
        contradicted: 0.05,
        notStated: 0.89,
        notAClaim: 0.01,
      },
    ],
    reviewActions: [],
    decisions: [],
  };
}

describe("T009 Reality Check findings interface", () => {
  it("renders genuine evidence, exact version identity, context navigation, and no approval", () => {
    const markup = renderToStaticMarkup(
      <RealityCheckList
        canDecide={false}
        checks={[completedCheck(true)]}
        processingConfigured={false}
      />,
    );

    expect(markup).toContain("What the system evaluated");
    expect(markup).toContain("22222222-2222-4222-8222-222222222222");
    expect(markup).toContain("Verified source passage");
    expect(markup).toContain("Scope: design only.");
    expect(markup).toContain("Inspect this passage in the original agreement context");
    expect(markup).toContain("No decision or approval is recorded");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("<img src=x onerror=alert(1)>");
    expect(markup).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(markup).toContain("&lt;script&gt;");
  });

  it("renders the zero-citation state without a quotation or fabricated confidence", () => {
    const markup = renderToStaticMarkup(
      <RealityCheckList
        canDecide={false}
        checks={[completedCheck(false)]}
        processingConfigured={false}
      />,
    );

    expect(markup).toContain("No verified source passage was returned");
    expect(markup).toContain("has not created a quotation or citation");
    expect(markup).toContain("does not establish that the claim is false");
    expect(markup).not.toContain("Verified source passage");
    expect(markup).not.toContain("confidence");
  });
});

describe("T010 decision record interface", () => {
  it("shows persisted actor, time, exact versions, and supersession without erasing history", () => {
    const check = completedCheck(false);
    check.reviewActions = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        action: "confirmed",
        actorLabel: "Authorized Reviewer",
        createdAt: new Date("2026-11-06T14:00:00.000Z"),
      },
    ];
    check.decisions = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        outcome: "approved",
        rationale: "Proceed with the requested dashboard.",
        actorLabel: "Authorized Reviewer",
        decidedAt: new Date("2026-11-06T14:00:00.000Z"),
        supersedesDecisionId: null,
        isCurrent: false,
        analysisRunId: check.id,
        changeRequestId: check.changeRequestId,
        agreementVersionId: check.agreementVersionId,
        instructionVersionId: check.instructionVersionId,
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        outcome: "rejected",
        rationale: null,
        actorLabel: "Authorized Reviewer",
        decidedAt: new Date("2026-11-06T15:00:00.000Z"),
        supersedesDecisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        isCurrent: true,
        analysisRunId: check.id,
        changeRequestId: check.changeRequestId,
        agreementVersionId: check.agreementVersionId,
        instructionVersionId: check.instructionVersionId,
      },
    ];

    const markup = renderToStaticMarkup(
      <RealityCheckList canDecide checks={[check]} processingConfigured={false} />,
    );

    expect(markup).toContain("Proposed change approved");
    expect(markup).toContain("Proposed change rejected");
    expect(markup).toContain("Superseded");
    expect(markup).toContain("Current decision");
    expect(markup).toContain("Authorized Reviewer");
    expect(markup).toContain(check.agreementVersionId);
    expect(markup).toContain(check.instructionVersionId);
    expect(markup).toContain("Record a replacement decision");
    expect(markup).toContain("not an electronic signature");
  });

  it("offers approve and reject with neither outcome preselected", () => {
    const markup = renderToStaticMarkup(
      <RealityCheckList
        canDecide
        checks={[completedCheck(false)]}
        processingConfigured={false}
      />,
    );

    expect(markup).toContain("Approve the proposed change");
    expect(markup).toContain("Reject the proposed change");
    expect(markup).not.toContain('checked=""');
    expect(markup).toContain("unresolved or unsupported finding");
  });
});
