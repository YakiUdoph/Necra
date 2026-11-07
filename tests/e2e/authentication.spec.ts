import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { getApplicationUrl } from "./database";

test("real login, scoped access, expiry, and logout", async ({ browser, page }) => {
  const clockedLiveTest = process.env.CLOCKED_LIVE_TEST === "true";
  test.setTimeout(120_000);
  const unauthenticated = await page.request.get(`/api/projects/${randomUUID()}`);
  expect(unauthenticated.status()).toBe(401);
  expect(
    (await page.request.get(`/api/projects/${randomUUID()}/evidence`)).status(),
  ).toBe(401);
  expect((await page.request.get(`/api/projects/${randomUUID()}/checks`)).status()).toBe(
    401,
  );

  const invalidApiContext = await browser.newContext({
    extraHTTPHeaders: { cookie: "better-auth.session_token=invalid" },
  });
  expect(
    (await invalidApiContext.request.get(`/api/projects/${randomUUID()}`)).status(),
  ).toBe(401);
  await invalidApiContext.close();

  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  const signUpAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(signUpAccessibility.violations).toEqual([]);
  await page.getByLabel("Name").fill("TEST ONLY Browser Owner");
  await page.getByLabel("Email address").fill("browser-owner@example.test");
  await page.getByLabel("Password").fill("test-only-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Your account is ready.")).toBeVisible({
    timeout: 20_000,
  });

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("browser-owner@example.test");
  await page.getByLabel("Password").fill("test-only-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole("heading", { name: "Create your first private project" }),
  ).toBeVisible();

  await page.getByLabel("Workspace name").fill("TEST ONLY Browser Workspace");
  await page.getByLabel("Project name").fill("TEST ONLY Browser Project");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 20_000 });
  const projectId = page.url().split("/").at(-1);
  if (!projectId) {
    throw new Error("Browser-created project ID was unavailable");
  }

  const agreementSection = page.locator("#agreement");
  await agreementSection.getByLabel("Document title").fill("TEST ONLY Signed SOW");
  await agreementSection.getByLabel("Source attribution").fill("Client email");
  await agreementSection
    .getByLabel("Exact source text")
    .fill("Original scope: research and design.\nFee: €4,000.");
  await agreementSection.getByRole("button", { name: "Save agreement" }).click();
  await expect(
    agreementSection.getByRole("heading", { name: "TEST ONLY Signed SOW" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(agreementSection.getByText("Version 1")).toBeVisible();

  const instructionSection = page.locator("#requests");
  await instructionSection
    .getByLabel("Document title")
    .fill("TEST ONLY Dashboard request");
  await instructionSection
    .getByLabel("Exact source text")
    .fill("Please add a reporting dashboard to the delivery.");
  await instructionSection.getByRole("button", { name: "Save instruction" }).click();
  await expect(
    instructionSection.getByRole("heading", { name: "TEST ONLY Dashboard request" }),
  ).toBeVisible({ timeout: 20_000 });

  await agreementSection.getByText("Create a revision").click();
  await agreementSection
    .getByLabel("Exact revised text")
    .fill("Original scope: research, design, and build.\nFee: €5,000.");
  await agreementSection.getByRole("button", { name: "Create new version" }).click();
  await expect(agreementSection.getByText("Version 2")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(agreementSection.getByText("Version 1")).toBeVisible();
  await expect(agreementSection.getByText("Version 2")).toBeVisible();
  await expect(
    instructionSection.getByRole("heading", { name: "TEST ONLY Dashboard request" }),
  ).toBeVisible();

  const realityCheckSection = page.locator("#reality-check");
  await expect(realityCheckSection.getByLabel("Agreement version")).toHaveValue(/.+/);
  await expect(realityCheckSection.getByLabel("Instruction version")).toHaveValue(/.+/);
  await realityCheckSection.getByRole("button", { name: "Create Reality Check" }).click();
  await expect(
    realityCheckSection.getByText("Analysis created. It has not been sent to Clocked."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    realityCheckSection.getByText("No human approval recorded."),
  ).toBeVisible();
  await page.reload();
  await expect(realityCheckSection.getByText("Created, not processed.")).toBeVisible();
  const checksResponse = await page.request.get(`/api/projects/${projectId}/checks`);
  expect(checksResponse.status()).toBe(200);
  const checksBody = (await checksResponse.json()) as { checks: Array<{ id: string }> };
  const checkId = checksBody.checks[0]?.id;
  if (!checkId) throw new Error("Test-only Reality Check was not persisted");
  const pool = new Pool({ connectionString: getApplicationUrl(), max: 1 });
  const owner = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = 'browser-owner@example.test'`,
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) {
    throw new Error("Test-only browser user was not persisted");
  }
  if (clockedLiveTest) {
    await realityCheckSection.getByLabel(/authorized for processing by Clocked/).check();
    await realityCheckSection
      .getByRole("button", { name: "Start Clocked processing" })
      .click();
    await expect(
      realityCheckSection.getByText(/Clocked returned a validated result with \d+ claim/),
    ).toBeVisible({ timeout: 140_000 });
    await expect(
      realityCheckSection.getByRole("heading", { name: "What the analysis found" }),
    ).toBeVisible();
  } else {
    await expect(
      realityCheckSection.getByText(
        "Real Clocked processing is unavailable because the server credential is not configured.",
      ),
    ).toBeVisible();
    const unconfiguredProcessing = await page.request.post(
      `/api/projects/${projectId}/checks/${checkId}/process`,
      {
        headers: { origin: "http://localhost:3000" },
        data: { confirmExternalProcessing: true },
      },
    );
    expect(unconfiguredProcessing.status()).toBe(503);

    const analysisInput = await pool.query<{
      project_id: string;
      workspace_id: string;
      agreement_version_id: string;
    }>(
      `SELECT project_id, workspace_id, agreement_version_id
       FROM analysis_runs WHERE id=$1`,
      [checkId],
    );
    const input = analysisInput.rows[0];
    if (!input) throw new Error("Test-only analysis input was not persisted");
    const providerResultId = randomUUID();
    await pool.query(
      `UPDATE analysis_runs
       SET status='running', lifecycle_revision=1, processing_started_at=now(),
           last_attempt_at=now()
       WHERE id=$1 AND status='pending'`,
      [checkId],
    );
    await pool.query(
      `INSERT INTO analysis_provider_results
         (id, analysis_run_id, project_id, workspace_id, provider, adapter_version,
          model, response_hash, raw_response, transport_metadata)
       VALUES ($1, $2, $3, $4, 'clocked', 'clocked-text-v1',
               'TEST ONLY persisted model', $5, $6::jsonb, $7::jsonb)`,
      [
        providerResultId,
        checkId,
        input.project_id,
        input.workspace_id,
        "c".repeat(64),
        JSON.stringify({ testOnly: true }),
        JSON.stringify({}),
      ],
    );
    await pool.query(
      `INSERT INTO provider_claim_results
         (provider_result_id, analysis_run_id, project_id, workspace_id,
          claim_index, claim, kind, counted, weight, supported, contradicted,
          not_stated, not_a_claim, verdict, source_alias,
          evidence_document_version_id, evidence_quote, evidence_start_offset,
          evidence_end_offset, evidence_confidence)
       VALUES
         ($1, $2, $3, $4, 0, 'TEST ONLY Research is included.', 'claim', true,
          1, 0.92, 0.02, 0.04, 0.02, 'supported', $5, $6,
          'Original scope', 0, 14, 0.91),
         ($1, $2, $3, $4, 1, 'TEST ONLY Dashboard is included.', 'claim', true,
          1, 0.03, 0.02, 0.94, 0.01, 'not_stated', NULL, NULL,
          NULL, NULL, NULL, NULL)`,
      [
        providerResultId,
        checkId,
        input.project_id,
        input.workspace_id,
        `agreement-version:${input.agreement_version_id}`,
        input.agreement_version_id,
      ],
    );
    await pool.query(
      `UPDATE analysis_runs
       SET status='completed', lifecycle_revision=2, provider='clocked',
           adapter_version='clocked-text-v1', validated_result_at=now(),
           provider_response_hash=$2, completed_at=now()
       WHERE id=$1 AND status='running'`,
      [checkId, "c".repeat(64)],
    );

    await page.reload();
    await expect(
      realityCheckSection.getByRole("heading", { name: "What the system evaluated" }),
    ).toBeVisible();
    await expect(
      realityCheckSection.getByRole("heading", { name: "What the analysis found" }),
    ).toBeVisible();
    await expect(
      realityCheckSection.getByText("TEST ONLY Research is included."),
    ).toBeVisible();
    await expect(
      realityCheckSection.getByText("Supported by the selected agreement", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      realityCheckSection.locator("blockquote").filter({ hasText: "Original scope" }),
    ).toBeVisible();
    await expect(
      realityCheckSection.getByText("No verified source passage was returned"),
    ).toBeVisible();
    await expect(
      realityCheckSection.getByText(/Missing evidence does not establish/),
    ).toBeVisible();
    const sourceContext = realityCheckSection.getByText(
      "Inspect this passage in the original agreement context",
    );
    await sourceContext.focus();
    await expect(sourceContext).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(realityCheckSection.locator(".document-context")).toBeVisible();
    await expect(
      realityCheckSection.getByText("No human approval recorded."),
    ).toBeVisible();
    await page.reload();
    await expect(
      realityCheckSection.getByText("TEST ONLY Dashboard is included."),
    ).toBeVisible();
  }
  await expect(
    realityCheckSection.getByText("No human approval recorded."),
  ).toBeVisible();

  await pool.query(
    `UPDATE project_memberships SET can_decide=true
     WHERE project_id=$1 AND user_id=$2`,
    [projectId, ownerId],
  );
  await page.reload();
  await expect(
    realityCheckSection.getByRole("heading", {
      name: "What an authorized person decided",
    }),
  ).toBeVisible();
  await realityCheckSection
    .getByRole("button", { name: "Record the human decision" })
    .click();
  const decisionDialog = page.getByRole("dialog", {
    name: "Decide this proposed change",
  });
  await expect(decisionDialog).toBeVisible();
  await expect(
    decisionDialog.getByText(/unresolved or unsupported finding/),
  ).toBeVisible();
  await expect(
    decisionDialog.getByLabel("Approve the proposed change"),
  ).not.toBeChecked();
  await expect(decisionDialog.getByLabel("Reject the proposed change")).not.toBeChecked();
  await decisionDialog.getByLabel("Approve the proposed change").check();
  await decisionDialog.getByLabel(/I reviewed the exact agreement/).check();
  await decisionDialog
    .getByLabel("Rationale (optional)")
    .fill("TEST ONLY browser-authorized decision");
  await decisionDialog
    .getByRole("button", { name: "Confirm and record decision" })
    .click();
  await expect(realityCheckSection.getByText("Proposed change approved")).toBeVisible({
    timeout: 20_000,
  });
  await expect(realityCheckSection.getByText("TEST ONLY Browser Owner")).toBeVisible();
  await page.reload();
  await expect(realityCheckSection.getByText("Proposed change approved")).toBeVisible();
  const replaySection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Decisions & Decision Replay" }),
  });
  await expect(
    replaySection.getByText("Replay is a factual record, not a generated narrative"),
  ).toBeVisible();
  await expect(
    replaySection.getByRole("heading", { name: "TEST ONLY Signed SOW, version 1" }),
  ).toBeVisible();
  await expect(
    replaySection.getByRole("heading", { name: "Validated provider result recorded" }),
  ).toBeVisible();
  await expect(
    replaySection.getByRole("heading", { name: "Decision recorded" }),
  ).toBeVisible();
  await expect(replaySection.getByText("Provider record", { exact: true })).toBeVisible();
  await expect(replaySection.getByText(/UTC/).first()).toBeVisible();
  const replaySource = replaySection
    .getByText("Inspect exact stored source version")
    .first();
  await replaySource.focus();
  await expect(replaySource).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    replaySection.getByText(/Original scope: research and design/),
  ).toBeVisible();
  const persistedDecision = await pool.query<{
    id: string;
    analysis_run_id: string;
    agreement_version_id: string;
    instruction_version_id: string;
  }>(
    `SELECT id, analysis_run_id, agreement_version_id, instruction_version_id
     FROM decisions WHERE analysis_run_id=$1`,
    [checkId],
  );
  expect(persistedDecision.rows).toHaveLength(1);
  expect(persistedDecision.rows[0]?.analysis_run_id).toBe(checkId);

  await pool.query(
    `UPDATE project_memberships SET can_decide=false
     WHERE project_id=$1 AND user_id=$2`,
    [projectId, ownerId],
  );
  const unauthorizedReplacement = await page.request.post(
    `/api/projects/${projectId}/checks/${checkId}/decisions`,
    {
      headers: { origin: "http://localhost:3000", "x-user-id": randomUUID() },
      data: {
        outcome: "rejected",
        rationale: "Must not persist",
        idempotencyKey: randomUUID(),
        supersedesDecisionId: persistedDecision.rows[0]?.id,
        confirmReviewedExactRecord: true,
      },
    },
  );
  expect(unauthorizedReplacement.status()).toBe(404);
  expect(
    (
      await pool.query(
        `SELECT count(*)::int AS count FROM decisions WHERE analysis_run_id=$1`,
        [checkId],
      )
    ).rows[0].count,
  ).toBe(1);

  const createdProject = await pool.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM projects WHERE id = $1`,
    [projectId],
  );
  const workspaceId = createdProject.rows[0]?.workspace_id;
  if (!workspaceId) {
    throw new Error("Browser-created project was not persisted");
  }
  const otherUserId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const otherProjectId = randomUUID();
  await pool.query(`INSERT INTO users (id) VALUES ($1)`, [otherUserId]);
  await pool.query(
    `INSERT INTO workspaces (id, name) VALUES ($1, 'TEST ONLY Other Workspace')`,
    [otherWorkspaceId],
  );
  await pool.query(
    `INSERT INTO workspace_memberships (workspace_id, user_id, role)
     VALUES ($1, $2, 'administrator')`,
    [otherWorkspaceId, otherUserId],
  );
  await pool.query(
    `INSERT INTO projects (id, workspace_id, name, created_by_user_id)
     VALUES ($1, $2, 'TEST ONLY Hidden Project', $3)`,
    [otherProjectId, otherWorkspaceId, otherUserId],
  );
  await pool.query(
    `INSERT INTO project_memberships
       (project_id, workspace_id, user_id, role, can_decide)
     VALUES ($1, $2, $3, 'manager', true)`,
    [otherProjectId, otherWorkspaceId, otherUserId],
  );

  await page.goto(`/projects/${projectId}`);
  await expect(
    page.getByRole("heading", { name: "TEST ONLY Browser Project", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Pasted agreement and instruction text")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const projectAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(projectAccessibility.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState("networkidle");
  const menuSummary = page.locator(".mobile-menu summary");
  await expect(menuSummary).toBeVisible();
  await menuSummary.press("Enter");
  await expect(page.locator(".mobile-menu-panel")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });

  const authorized = await page.request.get(`/api/projects/${projectId}`);
  expect(authorized.status()).toBe(200);
  const hidden = await page.request.get(`/api/projects/${otherProjectId}`, {
    headers: { "x-user-id": otherUserId },
  });
  expect(hidden.status()).toBe(404);
  expect(
    (
      await page.request.get(`/api/projects/${otherProjectId}/evidence`, {
        headers: { "x-user-id": otherUserId },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get(`/api/projects/${otherProjectId}/checks`, {
        headers: { "x-user-id": otherUserId },
      })
    ).status(),
  ).toBe(404);
  const forgedEvidence = await page.request.post(`/api/projects/${projectId}/evidence`, {
    headers: { origin: "https://attacker.test", "x-user-id": otherUserId },
    data: {
      format: "pasted_text",
      kind: "agreement",
      title: "Forged",
      content: "Must not persist",
      idempotencyKey: randomUUID(),
    },
  });
  expect(forgedEvidence.status()).toBe(403);
  const forgedCheck = await page.request.post(`/api/projects/${projectId}/checks`, {
    headers: { origin: "https://attacker.test", "x-user-id": otherUserId },
    data: {
      agreementVersionId: randomUUID(),
      instructionVersionId: randomUUID(),
      idempotencyKey: randomUUID(),
    },
  });
  expect(forgedCheck.status()).toBe(403);
  const forgedDecision = await page.request.post(
    `/api/projects/${projectId}/checks/${checkId}/decisions`,
    {
      headers: { origin: "https://attacker.test", "x-user-id": otherUserId },
      data: {
        outcome: "approved",
        idempotencyKey: randomUUID(),
        supersedesDecisionId: null,
        confirmReviewedExactRecord: true,
      },
    },
  );
  expect(forgedDecision.status()).toBe(403);
  const forgedMutation = await page.request.patch(
    `/api/projects/${projectId}/members/${ownerId}`,
    {
      headers: { origin: "https://attacker.test", "x-user-id": otherUserId },
      data: { role: "manager", canDecide: true, status: "active" },
    },
  );
  expect(forgedMutation.status()).toBe(403);

  await pool.query(
    `UPDATE project_memberships SET status = 'suspended'
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, ownerId],
  );
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(404);
  expect((await page.request.get(`/api/projects/${projectId}/evidence`)).status()).toBe(
    404,
  );
  expect((await page.request.get(`/api/projects/${projectId}/checks`)).status()).toBe(
    404,
  );
  await pool.query(
    `UPDATE project_memberships SET status = 'active'
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, ownerId],
  );

  await pool.query(
    `UPDATE auth_sessions SET expires_at = now() - interval '1 minute'
     WHERE user_id = $1`,
    [ownerId],
  );
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(401);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email address").fill("browser-owner@example.test");
  await page.getByLabel("Password").fill("test-only-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
  const signOut = page.getByRole("button", { name: "Sign out" });
  await signOut.focus();
  await expect(signOut).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(401);

  const invalidContext = await browser.newContext({
    extraHTTPHeaders: { cookie: "better-auth.session_token=invalid" },
  });
  const invalidPage = await invalidContext.newPage();
  await invalidPage.goto("/projects");
  await expect(invalidPage).toHaveURL(/\/sign-in$/);
  await invalidContext.close();
  await pool.end();
});
