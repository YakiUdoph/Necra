import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { getApplicationUrl } from "./database";

test("real login, scoped access, expiry, and logout", async ({ browser, page }) => {
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
    realityCheckSection.getByText(
      "Analysis created. Clocked processing is not yet connected.",
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    realityCheckSection.getByText("No human approval recorded."),
  ).toBeVisible();
  await page.reload();
  await expect(
    realityCheckSection.getByText(
      "Analysis created. Clocked processing is not yet connected.",
    ),
  ).toBeVisible();

  const pool = new Pool({ connectionString: getApplicationUrl(), max: 1 });
  const owner = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = 'browser-owner@example.test'`,
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) {
    throw new Error("Test-only browser user was not persisted");
  }
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
  const projectAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(projectAccessibility.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/projects/${projectId}`);
  const menuSummary = page.locator(".mobile-menu summary");
  await menuSummary.focus();
  await page.keyboard.press("Enter");
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
