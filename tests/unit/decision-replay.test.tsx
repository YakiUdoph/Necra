import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DecisionReplay } from "../../src/components/replay/decision-replay";
import {
  type ReplayDecisionEvent,
  type ReplayEvent,
  sortReplayEvents,
} from "../../src/server/replay/decision-replay-service";

const ids = {
  agreement: "10000000-0000-4000-8000-000000000001",
  request: "10000000-0000-4000-8000-000000000002",
  analysis: "10000000-0000-4000-8000-000000000003",
  provider: "10000000-0000-4000-8000-000000000004",
  firstDecision: "10000000-0000-4000-8000-000000000005",
  replacementDecision: "10000000-0000-4000-8000-000000000006",
  instruction: "10000000-0000-4000-8000-000000000007",
};

function baseDecision(id: string, occurredAt: Date): ReplayDecisionEvent {
  return {
    id,
    kind: "decision",
    occurredAt,
    actorLabel: "TEST ONLY Reviewer",
    origin: "human",
    audit: null,
    analysisRunId: ids.analysis,
    changeRequestId: ids.request,
    agreementVersionId: ids.agreement,
    instructionVersionId: ids.instruction,
    outcome: "approved",
    rationale: null,
    supersedesDecisionId: null,
    isCurrent: true,
  };
}

describe("T011 Decision Replay projection", () => {
  it("sorts timestamp ties by persisted-record kind and stable identifier", () => {
    const time = new Date("2026-11-07T12:00:00.000Z");
    const events: ReplayEvent[] = [
      baseDecision(ids.replacementDecision, time),
      {
        id: ids.request,
        kind: "change_request",
        occurredAt: time,
        actorLabel: "TEST ONLY Reviewer",
        origin: "human",
        audit: null,
        title: "TEST ONLY request",
        instructionVersionId: ids.instruction,
        status: "requested",
      },
      baseDecision(ids.firstDecision, time),
      {
        id: ids.agreement,
        kind: "evidence_version",
        occurredAt: time,
        actorLabel: "TEST ONLY Reviewer",
        origin: "human",
        audit: null,
        sourceDocumentId: "10000000-0000-4000-8000-000000000010",
        sourceKind: "agreement",
        title: "TEST ONLY agreement",
        sourceAttribution: null,
        sourceObservedAt: null,
        versionNumber: 1,
        contentHash: "a".repeat(64),
        content: "TEST ONLY exact agreement text",
      },
    ];

    expect(sortReplayEvents(events).map((event) => event.id)).toEqual([
      ids.agreement,
      ids.request,
      ids.firstDecision,
      ids.replacementDecision,
    ]);
  });

  it("renders UTC time, evidence links, explicit origin, gaps, and supersession", () => {
    const firstDecision = baseDecision(
      ids.firstDecision,
      new Date("2026-11-07T12:04:00.000Z"),
    );
    firstDecision.isCurrent = false;
    const replacementDecision = baseDecision(
      ids.replacementDecision,
      new Date("2026-11-07T12:05:00.000Z"),
    );
    replacementDecision.outcome = "rejected";
    replacementDecision.supersedesDecisionId = ids.firstDecision;
    const markup = renderToStaticMarkup(
      <DecisionReplay
        replay={{
          projectId: "10000000-0000-4000-8000-000000000011",
          events: [
            {
              id: ids.agreement,
              kind: "evidence_version",
              occurredAt: new Date("2026-11-07T12:00:00.000Z"),
              actorLabel: "TEST ONLY Reviewer",
              origin: "human",
              audit: {
                id: "10000000-0000-4000-8000-000000000012",
                occurredAt: new Date("2026-11-07T12:00:00.000Z"),
                relation: "direct",
              },
              sourceDocumentId: "10000000-0000-4000-8000-000000000010",
              sourceKind: "agreement",
              title: "TEST ONLY agreement",
              sourceAttribution: null,
              sourceObservedAt: null,
              versionNumber: 1,
              contentHash: "a".repeat(64),
              content: "TEST ONLY exact agreement text",
            },
            {
              id: ids.provider,
              kind: "provider_result",
              occurredAt: new Date("2026-11-07T12:03:00.000Z"),
              actorLabel: "clocked external provider",
              origin: "external",
              audit: null,
              analysisRunId: ids.analysis,
              provider: "clocked",
              adapterVersion: "clocked-text-v1",
              model: "clocked-test-model",
              responseHash: "b".repeat(64),
              findings: [
                {
                  claimIndex: 0,
                  claim: "TEST ONLY finding",
                  verdict: "supported",
                  category: "potential_change",
                  reviewState: "source_supported",
                  evidence: {
                    state: "verified",
                    documentId: "10000000-0000-4000-8000-000000000010",
                    documentVersionId: ids.agreement,
                    sourceTitle: "TEST ONLY agreement",
                    sourceVersionNumber: 1,
                    quote: "exact agreement",
                    startOffset: 10,
                    endOffset: 25,
                  },
                },
              ],
            },
            firstDecision,
            replacementDecision,
          ],
        }}
      />,
    );

    expect(markup).toContain("Replay is a factual record, not a generated narrative");
    expect(markup).toContain("2026-11-07 12:00:00.000 UTC");
    expect(markup).toContain("Provider record");
    expect(markup).toContain(`href="#replay-event-${ids.agreement}"`);
    expect(markup).toContain("No matching audit event is stored for this record");
    expect(markup).toContain("This decision was superseded");
    expect(markup).toContain(`href="#replay-event-${ids.firstDecision}"`);
    expect(markup).toContain("This is the current decision");
  });

  it("uses an honest empty state without sample activity", () => {
    const markup = renderToStaticMarkup(
      <DecisionReplay replay={{ projectId: ids.analysis, events: [] }} />,
    );
    expect(markup).toContain("No replayable project records yet");
    expect(markup).toContain("does not infer activity from silence");
  });
});
