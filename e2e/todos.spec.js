import { test, expect } from "@playwright/test";
import { mockApi, seedSession, TEST_USER } from "./fixtures.js";

// ─── Action Items scopes (v28.424) ───────────────────────────────────────────
// Regression fence for the v28.422 field report: EDIT must open the editor in
// EVERY scope — MINE, ALL, and BY PERSON — and a task assigned to me must
// appear under MINE.

const RAW_TODOS = [
  {
    id: 3,
    title: "Finished late task",
    description: "",
    job_id: null,
    priority: "normal",
    due_date: "2026-07-20",
    created_by: TEST_USER.id,
    created_by_name: "E2E Tester",
    assigned_to: TEST_USER.id,
    assigned_to_name: "E2E Tester",
    completed: true,
    completed_by: TEST_USER.id,
    completed_by_name: "E2E Tester",
    completed_at: "2026-07-23T15:04:00Z",
    completion_notes: "Handled after the rig moved",
    created_at: "2026-07-18T09:30:00Z",
  },
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
  // v28.429 — the scheduled-text field rides on every editor.
  await expect(page.getByText("TEXT ASSIGNEE AT")).toBeVisible();
  // v28.428 (Reggie: notes BEFORE the checkmark) — the editor shows the
  // COMPLETION NOTES field up front; MARK DONE stays disabled until a
  // reason is written, then completes directly.
  await expect(page.getByText(/COMPLETION NOTES/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "✓ MARK DONE" })).toBeDisabled();
  await page.getByPlaceholder(/Done because/).fill("Handled it on location");
  await expect(page.getByRole("button", { name: "✓ MARK DONE" })).toBeEnabled();
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
  // v28.426 — STATUS hides here (the cards already split open/done); TYPE applies.
  await expect(page.getByText("STATUS:")).not.toBeVisible();
  await page.getByRole("button", { name: "JOB-LINKED" }).click();
  await expect(page.getByText("Mine task")).not.toBeVisible(); // general-only fixture rows filter out
  await page.getByRole("button", { name: "GENERAL" }).click();
  await expect(page.getByText("Mine task")).toBeVisible();
  await page.getByRole("button", { name: "EDIT" }).first().click();
  await expect(page.getByRole("button", { name: /SAVE/ })).toBeVisible();
});

test("row DONE box: warning + notes land in ONE modal that completes", async ({ page }) => {
  await openTodos(page);
  await expect(page.getByText("Mine task")).toBeVisible();
  // the checkbox column carries the 'Mark task done' tooltip
  await page.locator('[title="Mark task done"]').first().click();
  // ONE modal: the not-deleted warning AND the notes field together
  await expect(page.getByText(/NOT deleted/i)).toBeVisible();
  const done = page.getByRole("button", { name: "MARK DONE", exact: true });
  await expect(done).toBeDisabled();
  await page.locator(".fti-modal-selectable textarea").fill("Wrapped on location");
  await expect(done).toBeEnabled();
  await done.click();
  await expect(page.getByText(/NOT deleted/i)).not.toBeVisible();
});

test("completed task carries the full closure record", async ({ page }) => {
  await openTodos(page);
  await page.getByRole("button", { name: "COMPLETED" }).click();
  await expect(page.getByText("Finished late task")).toBeVisible();
  await expect(page.getByText("CREATED", { exact: true })).toBeVisible();
  await expect(page.getByText("DUE", { exact: true })).toBeVisible();
  await expect(page.getByText("COMPLETED", { exact: true }).nth(0)).toBeVisible();
  await expect(page.getByText("LATE", { exact: true })).toBeVisible();
  await expect(page.getByText(/Handled after the rig moved/)).toBeVisible();
});

test("comment thread: post lands, chip renders, NEEDS RESPONSE flags", async ({ page }) => {
  let posted = null;
  await seedSession(page);
  await mockApi(page, {
    gets: {
      "/api/todos": RAW_TODOS.map((t) =>
        t.id === 1 ? { ...t, comment_count: 2, last_comment_at: "2026-07-24T04:00:00Z", last_comment_name: "Kyle Hand", needs_response_open: true } : t,
      ),
      "/api/todos/1/comments": [
        { id: 1, body: "Which yard is the spare in?", needs_response: true, created_at: "2026-07-24T04:00:00Z", user_id: "x", user_name: "Kyle Hand" },
      ],
    },
    posts: {
      "/api/todos/1/comments": (req) => {
        posted = JSON.parse(req.postData());
        return { status: 201, json: { id: 2, body: posted.body, needs_response: posted.needs_response, created_at: "2026-07-24T05:00:00Z" } };
      },
    },
  });
  await page.goto("/todos");
  await expect(page.getByText("💬 2", { exact: false })).toBeVisible();
  await expect(page.getByText("⚑ RESPONSE NEEDED").first()).toBeVisible();
  await page.getByRole("button", { name: "EDIT" }).first().click();
  await expect(page.getByText("Which yard is the spare in?")).toBeVisible();
  await page.getByPlaceholder(/Question, concern/).fill("Wickett yard, rack 3");
  await page.getByRole("button", { name: "POST COMMENT" }).click();
  await expect.poll(() => posted?.body).toBe("Wickett yard, rack 3");
});

test("Just DONE checkbox completes without typed notes", async ({ page }) => {
  await openTodos(page);
  await page.locator('[title="Mark task done"]').first().click();
  const done = page.getByRole("button", { name: "MARK DONE", exact: true });
  await expect(done).toBeDisabled();
  await page.getByText("Just DONE — no notes needed").click();
  await expect(done).toBeEnabled();
  await done.click();
  await expect(page.getByText(/NOT deleted/i)).not.toBeVisible();
});
