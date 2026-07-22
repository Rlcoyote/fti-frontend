// ─── Ticket families (v28.258+, master-ticket merge) ────────────────────────
// One type selector, TWO shapes behind it (FTI_Master_Ticket_Spec.md §1):
//   visit — Rig Up / Rig Down / Rental: one date, 5 time stamps + mileage,
//           equipment-in-field section, line items rate × qty × days.
//   log   — Tester / Pumper: Mon–Sun week (week_start anchor), per-day
//           IN/OUT/IN/OUT rows, well log, one JSA per day, signed week-end.
//
// MUST STAY IN SYNC with fti-backend/src/ticketFamilies.js — the BE enforces
// what this file shapes. fti-backend scripts/check-permission-parity.mjs
// verifies the mirror (extended v28.258).

export const TICKET_FAMILY = {
  "Rig Up": "visit",
  "Rig Down": "visit",
  Rental: "visit",
  Tester: "log",
  Pumper: "log",
};

export const isLogType = (type) => TICKET_FAMILY[type] === "log";
export const isVisitType = (type) => TICKET_FAMILY[type] === "visit";

// Inclusive day count of a rental window: 07-01 → 07-03 = 3 days. Null when
// either date is missing/invalid or the range is backwards. Option 2 (Reggie):
// the window FILLS each line's DAYS; a hand edit per line still overrides.
export const windowDaysInclusive = (from, to) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return null;
  const ms = new Date(to + "T00:00:00Z") - new Date(from + "T00:00:00Z");
  if (ms < 0) return null;
  return Math.round(ms / 86400000) + 1;
};

// Per-type capability flags — ONE home for the section gates that used to be
// scattered `type === "Rental"` checks across 7 files (the v28.182 bug class:
// scattered gates drift). Faithful to pre-v28.262 behavior: Rental hides JSA
// in the create modal + treats JSA as optional at signing, hides GPS + the
// time/mileage block, and runs the cycle machinery instead of a From/To
// window. Log types keep the visit-style form until Phase 4 builds theirs.
const TYPE_CAPS = {
  "Rig Up": { jsaInCreate: true, jsaOptional: false, gps: true, times: true, window: true, cycle: false },
  "Rig Down": { jsaInCreate: true, jsaOptional: false, gps: true, times: true, window: true, cycle: false },
  Rental: { jsaInCreate: false, jsaOptional: true, gps: false, times: false, window: false, cycle: true },
  Tester: { jsaInCreate: true, jsaOptional: false, gps: true, times: true, window: false, cycle: false },
  Pumper: { jsaInCreate: true, jsaOptional: false, gps: true, times: true, window: false, cycle: false },
};
export const typeCaps = (type) => TYPE_CAPS[type] || { jsaInCreate: false, jsaOptional: true, gps: false, times: false, window: false, cycle: false };
