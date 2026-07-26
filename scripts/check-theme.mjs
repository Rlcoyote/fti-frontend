#!/usr/bin/env node
// ─── check-theme.mjs — the THEME RATCHET (v28.438) ──────────────────────────
// Reggie, ratified 260724: "This isn't about aesthetics... a new customer
// wanting to universally change to their theme. We may even create 5 or 6
// different pre-loaded themes. This is about the entirety of the code being
// correct." A preloaded theme is just an alternate C palette — which only
// works if EVERYTHING reads C. Every raw hex or forced-light PANEL_* token
// in a component is a surface a customer's theme cannot reach.
//
// This is a RATCHET, not a ban: scripts/theme-baseline.json is the declared
// debt ledger (today's counts, file by file — also the cleanup queue). CI
// FAILS when any file's offense count INCREASES or a new offender appears.
// Counts can only go down; when they do, the script says so and the baseline
// gets tightened in the same commit. Drift is impossible; cleanup is
// incremental. Pattern-sibling of check-permission-parity and check-tutorial.
//
// Deliberately exempt (the palette/token homes + declared-intentional):
//   config.js       — IS the palette
//   SharedUI.jsx    — defines TINT/PANEL tokens
//   PublicSignPage  — customer-facing, raw-hex-intentional (ruled v28.29x)
//   BrandedSplash   — the brand mark is the brand mark
//   errorReporter/api internals — non-visual strings that happen to match

import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const baselinePath = join(root, "scripts", "theme-baseline.json");

const EXEMPT = new Set(["config.js", "SharedUI.jsx", "PublicSignPage.jsx", "BrandedSplash.jsx"]);

const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g;
const PANEL = /\bPANEL_(TEXT|MUTED|FAINT)\b/g;

const counts = {};
for (const f of readdirSync(srcDir).filter((x) => x.endsWith(".jsx") || x.endsWith(".js"))) {
  if (EXEMPT.has(f)) continue;
  const body = readFileSync(join(srcDir, f), "utf8");
  // Strip comments so documented history doesn't count as offense.
  const code = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const hex = (code.match(HEX) || []).length;
  const panel = (code.match(PANEL) || []).length;
  if (hex + panel > 0) counts[f] = { hex, panel };
}

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, JSON.stringify(counts, null, 2) + "\n");
  console.log(`baseline written: ${Object.keys(counts).length} files carrying theme debt.`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error("✗ no theme-baseline.json — run: node scripts/check-theme.mjs --write-baseline");
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

const errors = [];
let improved = 0;
for (const [f, c] of Object.entries(counts)) {
  const b = baseline[f];
  if (!b) {
    errors.push(`${f}: NEW theme offender (${c.hex} hex, ${c.panel} PANEL_*) — use C.* tokens, or justify + add to baseline`);
    continue;
  }
  if (c.hex > b.hex) errors.push(`${f}: raw hex grew ${b.hex} → ${c.hex} — new colors must come from the C palette`);
  if (c.panel > b.panel) errors.push(`${f}: PANEL_* grew ${b.panel} → ${c.panel} — PANEL is only for always-light TINT surfaces`);
  if (c.hex < b.hex || c.panel < b.panel) improved++;
}
for (const f of Object.keys(baseline)) {
  if (!counts[f]) improved++;
}

if (errors.length) {
  console.error(`✗ theme ratchet FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const totalHex = Object.values(counts).reduce((n, c) => n + c.hex, 0);
const totalPanel = Object.values(counts).reduce((n, c) => n + c.panel, 0);
console.log(
  `✓ theme ratchet — ${Object.keys(counts).length} files carry debt (${totalHex} hex, ${totalPanel} PANEL_*), none grew.` +
    (improved ? ` ${improved} file(s) IMPROVED — tighten the baseline: node scripts/check-theme.mjs --write-baseline` : ""),
);
