#!/usr/bin/env node
// ─── check-tutorial.mjs — the NO-ROTTING gate (v28.420) ─────────────────────
// Reggie's standing rule, ratified 260723: "any version that ships a
// teachable feature updates its lesson in the same version. No rotting.
// Burn it into the code." This script IS the burn — it runs in CI (and
// `npm run check:tutorial`) and FAILS the build when the tutorial and the
// app drift apart. Pattern-sibling of the backend's
// check-permission-parity.mjs.
//
// Three tripwires:
//   1. NAV COVERAGE — every nav label in navMap.NAV must be MENTIONED
//      somewhere in tutorial content. Add a page without teaching it → red.
//   2. TOUR ANCHORS — every DASHBOARD_TOUR_STEPS tut key must exist as a
//      data-tut="..." attribute somewhere in src/. Rename or delete an
//      anchored element without updating the tour → red.
//   3. GATE KEYS — every module gate.perm must be a permission key the app
//      actually checks (a can("...") call in src/). A stale gate would
//      silently hide a module from everyone → red.
//
// What this CANNOT catch: a new feature on an EXISTING page shipping without
// its lesson. That stays a review-discipline rule (stated in the commit
// template + tutorialContent.js header); these tripwires catch the
// structural rot that scripts can see.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");

const { TUTORIAL_MODULES, DASHBOARD_TOUR_STEPS } = await import(join(srcDir, "tutorialContent.js"));
const navSource = readFileSync(join(srcDir, "navMap.js"), "utf8");

// All src text (jsx + js) for anchor + can() sweeps.
const srcFiles = readdirSync(srcDir).filter((f) => f.endsWith(".js") || f.endsWith(".jsx"));
const allSrc = srcFiles.map((f) => readFileSync(join(srcDir, f), "utf8")).join("\n");

const errors = [];

// ── 1. NAV coverage ──────────────────────────────────────────────────────────
const navLabels = [...navSource.matchAll(/^\s*\["([^"]+)",\s*"[^"]+",\s*"[^"]+"\]/gm)].map((m) => m[1]);
if (navLabels.length < 10) errors.push(`navMap parse looks wrong — only ${navLabels.length} labels found`);
const contentHay = JSON.stringify(TUTORIAL_MODULES).toLowerCase();
for (const label of navLabels) {
  if (label === "Tutorial") continue; // the tutorial needn't teach itself
  if (!contentHay.includes(label.toLowerCase())) {
    errors.push(`NAV page "${label}" is never mentioned in tutorialContent.js — teach it or it rots`);
  }
}

// ── 2. Tour anchors ──────────────────────────────────────────────────────────
for (const step of DASHBOARD_TOUR_STEPS) {
  if (!allSrc.includes(`data-tut="${step.tut}"`) && !allSrc.includes(`"${step.tut}" : undefined`) && !allSrc.includes(`? "${step.tut}"`)) {
    errors.push(`Tour step "${step.tut}" has no data-tut="${step.tut}" anchor anywhere in src/`);
  }
}

// ── 3. Gate keys ─────────────────────────────────────────────────────────────
const canKeys = new Set([...allSrc.matchAll(/can\("([a-z_]+)"\)/g)].map((m) => m[1]));
for (const m of TUTORIAL_MODULES) {
  if (m.gate?.perm && !canKeys.has(m.gate.perm)) {
    errors.push(`Module "${m.title}" gates on perm "${m.gate.perm}" but no can("${m.gate.perm}") exists in src/ — stale key hides the module from everyone`);
  }
}

if (errors.length) {
  console.error(`✗ tutorial parity FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ tutorial parity — ${navLabels.length} nav pages covered, ${DASHBOARD_TOUR_STEPS.length} tour anchors present, ${TUTORIAL_MODULES.length} module gates valid.`);
