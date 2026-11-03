import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { getApplicationUrl } from "./database";

test("real login, scoped access, expiry, and logout", async ({ browser, page }) => {
  test.setTimeout(90_000);
  const unauthenticated = await page.request.get(`/api/projects/${randomUUID()}`);
  expect(unauthenticated.status()).toBe(401);

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
  await expect(page.getByText("Your account is ready.")).toBeVisible();

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("browser-owner@example.test");
  await page.getByLabel("Password").fill("test-only-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole("heading", { name: "No project access yet" }),
  ).toBeVisible();

  const pool = new Pool({ connectionString: getApplicationUrl(), max: 1 });
  const owner = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = 'browser-owner@example.test'`,
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) {
    throw new Error("Test-only browser user was not persisted");
  }
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const otherUserId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const otherProjectId = randomUUID();
  await pool.query(`INSERT INTO users (id) VALUES ($1)`, [otherUserId]);
  await pool.query(
    `INSERT INTO workspaces (id, name)
     VALUES ($1, 'TEST ONLY Browser Workspace'), ($2, 'TEST ONLY Other Workspace')`,
    [workspaceId, otherWorkspaceId],
  );
  await pool.query(
    `INSERT INTO workspace_memberships (workspace_id, user_id, role)
     VALUES ($1, $2, 'administrator'), ($3, $4, 'administrator')`,
    [workspaceId, ownerId, otherWorkspaceId, otherUserId],
  );
  await pool.query(
    `INSERT INTO projects (id, workspace_id, name, created_by_user_id)
     VALUES ($1, $2, 'TEST ONLY Browser Project', $3),
            ($4, $5, 'TEST ONLY Hidden Project', $6)`,
    [projectId, workspaceId, ownerId, otherProjectId, otherWorkspaceId, otherUserId],
  );
  await pool.query(
    `INSERT INTO project_memberships
       (project_id, workspace_id, user_id, role, can_decide)
     VALUES ($1, $2, $3, 'manager', true), ($4, $5, $6, 'manager', true)`,
    [projectId, workspaceId, ownerId, otherProjectId, otherWorkspaceId, otherUserId],
  );

  await page.goto(`/projects/${projectId}`);
  await expect(
    page.getByRole("heading", { name: "TEST ONLY Browser Project", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Agreement evidence, change requests")).toBeVisible();
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
  await page.waitForLoadState("networkidle");
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
