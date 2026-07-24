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
  // v28.333 - selection containment: with the modal open, the page behind
  // leaves the selection surface (Ctrl+A copies only the modal).
  const sel = await page.evaluate(() => ({
    body: getComputedStyle(document.body).userSelect,
    modal: getComputedStyle(document.querySelector(".fti-modal-selectable")).userSelect,
  }));
  expect(sel.body).toBe("none");
  expect(sel.modal).toBe("text");

  // v28.418 — wells are confirmed on EVERY ticket since v28.412 (Reggie:
  // single-well WOs never asked). Log types don't preselect, so pick the
  // fixture's one well, confirm, then the form proper renders.
  await page
    .locator(".fti-modal-selectable")
    .locator("span")
    .filter({ hasText: /^TEST WELL 1H$/ })
    .click();
  await page.getByRole("button", { name: /CONFIRM — 1 WELL/ }).click();

  await page.getByRole("button", { name: "CREATE TICKET" }).click();

  await expect.poll(() => posts.length, { timeout: 8000 }).toBeGreaterThan(0);
  expect(errs, "no page errors during save").toEqual([]);
  const sent = JSON.parse(posts[0]);
  expect(sent.type).toBe("Tester");

  // v28.332 - the create OPENS the ticket so the week/day grid is right
  // there (no save-hunt-reopen). The detail surface must appear.
  await expect(page.getByText(/WEEK OF|TOTAL TEST HOURS/i).first()).toBeVisible({ timeout: 8000 });
});
