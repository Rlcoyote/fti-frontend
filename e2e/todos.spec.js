import { test, expect } from "@playwright/test";
import { mockApi, seedSession, TEST_USER } from "./fixtures.js";

// ─── Action Items scopes (v28.424) ───────────────────────────────────────────
// Regression fence for the v28.422 field report: EDIT must open the editor in
// EVERY scope — MINE, ALL, and BY PERSON — and a task assigned to me must
// appear under MINE.

const RAW_TODOS = [
  {
    id: 1,
    title: "Mine task",
    description: "",
    job_id: null,
    priority: "normal",
    due_date: null,
    created_by: TEST_USER.id,
    created_by_name: "E2E Tester",
    assigned_to: TEST_USER.id,
    assigned_to_name: "E2E Tester",
    completed: false,
  },
  {
    id: 2,
    title: "Someone elses task",
    description: "",
    job_id: null,
    priority: "normal",
    due_date: null,
    created_by: "e2e00000-0000-0000-0000-000000000002",
    created_by_name: "Other Guy",
    assigned_to: "e2e00000-0000-0000-0000-000000000002",
    assigned_to_name: "Other Guy",
    completed: false,
  },
];

async function openTodos(page) {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/todos": RAW_TODOS } });
  await page.goto("/todos");
}

test("MINE shows my task and EDIT opens the editor there", async ({ page }) => {
  await openTodos(page);
  await expect(page.getByText("Mine task")).toBeVisible();
  await expect(page.getByText("Someone elses task")).not.toBeVisible();
  await page.getByRole("button", { name: "EDIT" }).first().click();
  await expect(page.getByRole("button", { name: /SAVE/ })).toBeVisible();
});

test("ALL shows everything and EDIT opens the editor there", async ({ page }) => {
  await openTodos(page);
  await page.getByRole("button", { name: "ALL", exact: true }).first().click();
  await expect(page.getByText("Someone elses task")).toBeVisible();
  await page.getByRole("button", { name: "EDIT" }).first().click();
  await expect(page.getByRole("button", { name: /SAVE/ })).toBeVisible();
});

test("BY PERSON groups by assignee and EDIT opens the editor there", async ({ page }) => {
  await openTodos(page);
  await page.getByRole("button", { name: "BY PERSON" }).click();
  await expect(page.getByText("Other Guy", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "EDIT" }).first().click();
  await expect(page.getByRole("button", { name: /SAVE/ })).toBeVisible();
});
