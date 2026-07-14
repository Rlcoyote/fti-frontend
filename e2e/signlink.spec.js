import { test, expect } from "@playwright/test";
import { mockApi, seedSession, SIGN_LANDING } from "./fixtures.js";

// ─── Sign-link workflow (v28.321) ────────────────────────────────────────────
// Regression fence for the 7/10–7/14 field failures:
//   - v28.311: a logged-in phone rendered the dashboard and IGNORED the link
//   - v28.301/318: the signer sees WHAT they're signing, in Reggie's order
//   - v28.303: CONFIRM refreshes the session at click time

const SIGN_URL = "/?jsa_sign=e2e-token&uid=e2e-uid&jsa=e2e-jsa";

test("logged-OUT phone: sign link lands on the JSA panel with the card", async ({ page }) => {
  await mockApi(page, { posts: { "/api/jsas/sign-options": { json: SIGN_LANDING } } });
  await page.goto(SIGN_URL);

  await expect(page.getByText("THE JSA YOU ARE SIGNING")).toBeVisible();
  // Reggie's ratified card order/content
  await expect(page.getByText("TYPE", { exact: true })).toBeVisible();
  await expect(page.getByText("Tester", { exact: true })).toBeVisible();
  await expect(page.getByText("#300999-1")).toBeVisible();
  await expect(page.getByText("E2E OIL CO")).toBeVisible();
  await expect(page.getByText("TEST LEASE, PECOS COUNTY")).toBeVisible();
  await expect(page.getByText("TEST WELL 1H")).toBeVisible();
  await expect(page.getByRole("button", { name: "CONFIRM WITH BIOMETRIC" })).toBeVisible();
  // The login form must NOT be presented alongside the sign panel
  await expect(page.getByRole("button", { name: "SIGN IN" })).toHaveCount(0);
});

test("logged-IN phone: sign link STILL lands on the JSA panel (v28.311 regression)", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { posts: { "/api/jsas/sign-options": { json: SIGN_LANDING } } });
  await page.goto(SIGN_URL);

  // The dashboard must NOT swallow the link.
  await expect(page.getByText("THE JSA YOU ARE SIGNING")).toBeVisible();
  await expect(page.getByRole("button", { name: "CONFIRM WITH BIOMETRIC" })).toBeVisible();
});

test("dead link: the page says so instead of doing nothing", async ({ page }) => {
  await mockApi(page, {
    posts: { "/api/jsas/sign-options": { status: 400, json: { error: "Invalid or unknown sign link" } } },
  });
  await page.goto(SIGN_URL);
  await expect(page.getByText("Invalid or unknown sign link")).toBeVisible();
});

test("CONFIRM refreshes the sign session at click time (v28.303 regression)", async ({ page }) => {
  let refreshBody = null;
  await mockApi(page, {
    posts: {
      "/api/jsas/sign-options": { json: SIGN_LANDING },
      "/api/jsas/sign-options-refresh": (req) => {
        refreshBody = req.postData();
        return { status: 401, json: { error: "Sign session expired — ask the lead to send a new link" } };
      },
      "/api/jsas/sign-step": { json: { ok: true } },
    },
  });
  await page.goto(SIGN_URL);
  await page.getByRole("button", { name: "CONFIRM WITH BIOMETRIC" }).click();

  // Refresh was called from the click, and its rejection surfaced on screen —
  // the flow can no longer die silently.
  await expect(page.getByText("Sign session expired — ask the lead to send a new link", { exact: true })).toBeVisible();
  expect(JSON.parse(refreshBody).pending_token).toBe("e2e-pending-token");
  await expect(page.getByText(/step: refresh-rejected/)).toBeVisible();
});
