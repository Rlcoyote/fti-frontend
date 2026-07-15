import { test, expect } from "@playwright/test";
import { mockApi, seedSession, TEST_TICKET, TEST_JSA_ROW, REQUIRED_SIGNERS } from "./fixtures.js";

// ─── JSA modal seeds from the SERVER row (v28.323) ───────────────────────────
// Regression fence for the 7/14 "checkmarks differ per user" failure (raw-row
// pass-through rendered all PPE false — v28.313 normalizer) AND for the
// white-screen class this fence itself exposed: an unmocked required-signers
// shape crashed the whole app (no error boundary; v28.323 added one + a
// shape guard). The fence asserts the modal's PPE glyphs match the SERVER
// row exactly, with the signers panel rendering alongside.

test("opening a ticket's JSA shows the SAVED PPE flags, not defaults", async ({ page }) => {
  const ruTicket = { ...TEST_TICKET, type: "Rig Up" };
  await seedSession(page);
  await mockApi(page, {
    gets: {
      "/api/tickets?include_voided=true": [ruTicket],
      "/api/tickets?include_deleted=true": [],
      "/api/jsas/ticket/9001": TEST_JSA_ROW,
      [`/api/jsas/${TEST_JSA_ROW.id}/required-signers`]: REQUIRED_SIGNERS,
      "/api/jsas/ticket/9001/index": [{ id: TEST_JSA_ROW.id, date: TEST_JSA_ROW.date, completed_at: null }],
    },
  });
  await page.goto("/");

  await page.getByText("300999", { exact: true }).first().click();
  await page.getByText("#300999-1").first().click();
  await page.getByRole("button", { name: "✓ VIEW / EDIT JSA" }).click();

  // Modal open + signers panel rendered (the crash fence)
  await expect(page.getByText("PPE CHECK")).toBeVisible();
  await expect(page.getByText("FTI CREW BIOMETRIC SIGNATURES")).toBeVisible();

  // Saved flags — fr TRUE, tools TRUE, confined FALSE — render as saved.
  const ppe = await page.evaluate(() => {
    const out = {};
    for (const span of document.querySelectorAll("span")) {
      const t = span.textContent || "";
      for (const [key, needle] of [
        ["fr", "FR Clothing"],
        ["tools", "Trained in use of tools"],
        ["confined", "Confined space permit"],
      ]) {
        if (t.startsWith(needle)) out[key] = (span.parentElement?.textContent || "").includes("✓");
      }
    }
    return out;
  });
  expect(ppe.fr, "FR Clothing must show SAVED true").toBe(true);
  expect(ppe.tools, "Tools trained must show SAVED true").toBe(true);
  expect(ppe.confined, "Confined space must show SAVED false").toBe(false);
});

test("a bad signers response shows an error card — never a white screen", async ({ page }) => {
  const ruTicket = { ...TEST_TICKET, type: "Rig Up" };
  await seedSession(page);
  await mockApi(page, {
    gets: {
      "/api/tickets?include_voided=true": [ruTicket],
      "/api/tickets?include_deleted=true": [],
      "/api/jsas/ticket/9001": TEST_JSA_ROW,
      [`/api/jsas/${TEST_JSA_ROW.id}/required-signers`]: { totally: "wrong shape" },
      "/api/jsas/ticket/9001/index": [{ id: TEST_JSA_ROW.id, date: TEST_JSA_ROW.date, completed_at: null }],
    },
  });
  await page.goto("/");
  await page.getByText("300999", { exact: true }).first().click();
  await page.getByText("#300999-1").first().click();
  await page.getByRole("button", { name: "✓ VIEW / EDIT JSA" }).click();

  await expect(page.getByText("PPE CHECK")).toBeVisible();
  await expect(page.getByText("Could not load signers (unexpected response)")).toBeVisible();
  // The app is ALIVE — the modal and page still render around the error.
  expect(((await page.textContent("body")) || "").length).toBeGreaterThan(500);
});
