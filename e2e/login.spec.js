import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures.js";

// ─── Login form is password-manager-detectable (v28.324) ────────────────────
// Chrome offers to save credentials only when a real <form> containing a
// password field SUBMITS. The form was divs + a click handler for its whole
// life — no browser ever offered to remember the login. This fence pins the
// structural requirements so the save-prompt can't silently regress.

test("login is a real form: password field + submit button inside <form>", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  const form = page.locator("form").first();
  await expect(form).toBeVisible();
  await expect(form.locator('input[type="email"][autocomplete="username"][name]')).toBeVisible();
  await expect(form.locator('input[type="password"][autocomplete="current-password"][name]')).toBeVisible();
  await expect(form.locator('button[type="submit"]')).toBeVisible();
});

test("Enter in the password field submits the login (implicit submission)", async ({ page }) => {
  let loginPosted = false;
  await mockApi(page, {
    posts: {
      "/api/auth/login": () => {
        loginPosted = true;
        return { status: 401, json: { error: "Invalid credentials" } };
      },
    },
  });
  await page.goto("/");
  await page.locator('input[type="email"]').fill("e2e@flotest.com");
  await page.locator('input[type="password"]').fill("wrong-password");
  await page.locator('input[type="password"]').press("Enter");
  await expect(page.getByText("Invalid credentials")).toBeVisible();
  expect(loginPosted).toBe(true);
});
