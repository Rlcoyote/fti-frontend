import { test, expect } from "@playwright/test";
import { mockApi, seedSession, TEST_USER } from "./fixtures.js";

// ─── Archive lifecycle strip (v28.433, Reggie's four gaps ruled "Killem all") ─
// Every closed thing answers the same questions: who started it, who ended
// it, and when — to the minute, on the face AND in the expanded record.

const ARCHIVE_ROW = {
  id: 1,
  entity_type: "job",
  entity_id: 300999,
  job_id: 300999,
  archive_reason: "job_closed",
  archived_at: "2026-07-23T21:15:00Z",
  archived_by: TEST_USER.id,
  archived_by_name: "E2E Tester",
  snapshot_created_by_name: "Field Hand",
  data_snapshot: JSON.stringify({ id: 300999, customer: "E2E OIL CO", created_at: "2026-07-01T13:00:00Z", created_by: "someone" }),
  line_items_snapshot: null,
  signature_snapshot: null,
};

test("archive card says who closed it and carries the lifecycle strip", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/archive": [ARCHIVE_ROW] } });
  await page.goto("/archive");

  await expect(page.getByText(/CLOSED .* by E2E Tester/)).toBeVisible();
  await page.getByText("E2E OIL CO").click();
  await expect(page.getByText("CREATED", { exact: true })).toBeVisible();
  await expect(page.getByText(/by Field Hand/)).toBeVisible();
});
