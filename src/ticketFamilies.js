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
