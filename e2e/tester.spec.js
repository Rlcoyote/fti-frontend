import { test, expect } from "@playwright/test";
import { mockApi, seedSession } from "./fixtures.js";

// ─── Tester (log-family) create actually saves (v28.331) ────────────────────
// Regression fence: the v28.276 FE validator returned a bare array for the
// log family while callers destructure {ok, errors} — CREATE TICKET crashed
// silently (errors.map on undefined) on EVERY Tester/Pumper save for ten
// days. This fence creates a Tester and asserts the POST actually leaves.

test("CREATE TICKET on a Tester posts the ticket", async ({ page }) => {
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  const posts = [];
  await seedSession(page);
  await mockApi(page, {
    posts: {
      "/api/tickets": (req) => {
        posts.push(req.postData());
        return { status: 201, json: { id: 9002, ticket_number: 2, week_start: "2026-07-13" } };
      },
    },
  });
  await page.goto("/");
  await page.getByText("300999", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ ADD TICKET" }).click();
  await page.getByRole("button", { name: "TESTER", exact: true }).click();
  await page.getByRole("button", { name: "CREATE TICKET" }).click();

  await expect.poll(() => posts.length, { timeout: 8000 }).toBeGreaterThan(0);
  expect(errs, "no page errors during save").toEqual([]);
  const sent = JSON.parse(posts[0]);
  expect(sent.type).toBe("Tester");

  // v28.332 - the create OPENS the ticket so the week/day grid is right
  // there (no save-hunt-reopen). The detail surface must appear.
  await expect(page.getByText(/WEEK OF|TOTAL TEST HOURS/i).first()).toBeVisible({ timeout: 8000 });
});
