import { test, expect } from "@playwright/test";

// ─── Cache policy (v28.321) ──────────────────────────────────────────────────
// Regression fence for the 7/14 stale-bundle failure: no Cache-Control
// header existed, so mobile Safari heuristic-cached index.html and served
// PRE-FIX bundles to daily users. The suite runs against `serve dist` with
// dist/serve.json — the exact production serving path — so a regression in
// serve.json (or its absence from the build) fails here before it ships.

test("index.html revalidates on every load (no-cache)", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["cache-control"]).toContain("no-cache");
});

test("version.json revalidates on every load (no-cache)", async ({ request }) => {
  const res = await request.get("/version.json");
  expect(res.headers()["cache-control"]).toContain("no-cache");
  const body = await res.json();
  expect(body.commit).toBeTruthy();
});

test("hashed assets cache forever (immutable)", async ({ request, page }) => {
  await page.goto("/");
  const html = await (await request.get("/")).text();
  const asset = html.match(/assets\/index-[^"]+\.js/)?.[0];
  expect(asset, "index.html must reference a hashed bundle").toBeTruthy();
  const res = await request.get(`/${asset}`);
  expect(res.headers()["cache-control"]).toContain("immutable");
});

test("SPA rewrite serves the app on deep paths", async ({ request }) => {
  const res = await request.get("/reports");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("<div id=");
});
