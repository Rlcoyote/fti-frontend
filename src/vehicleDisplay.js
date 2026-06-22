import { C } from "./config.js";

// ─── Vehicle display helpers (extracted from VehiclesPage v28.235) ───────────
// Pure label maps + derivations shared by the page, table, and cards.

// Human-readable Type string from the structured columns. Mirrors the section
// labels on the MASTER spreadsheet.
export const KIND_LABELS = {
  pickup: "Pickups",
  tractor: "Tractors",
  trailer: "Trailers",
  straight_truck: "Straight Trucks",
  other: "Other",
};
export const HITCH_LABELS = {
  tongue_pull: "Tongue Pull",
  gooseneck: "Gooseneck",
  n_a: null,
};
export const SUBTYPE_LABELS = {
  "3_4_ton": "3/4 Ton",
  "1_ton": "1 Ton",
  heavy_duty: "Heavy Duty",
  rig_up_truck: "Rig-Up Truck",
  rig_up_pole: "Rig-Up Pole",
  rig_up: "Rig-Up Equipment",
  sand_trap: "Sand Trap",
  travel: "Travel Trailers",
  utility: "Utility Trailers",
  separator: "Separators",
  pipe: "Pipe Trailers",
  flare_stack: "Flare Stacks",
  light_tower_water_tank: "Light Towers & Water Tanks",
  tester: "Tester Trailers",
  light_tower: "Light Towers",
};

export function vehicleTypeDisplay(v) {
  const parts = [KIND_LABELS[v.vehicle_kind] || v.vehicle_kind || "Unclassified"];
  const h = HITCH_LABELS[v.hitch_type];
  if (h) parts.push(h);
  const s = SUBTYPE_LABELS[v.subtype];
  if (s) parts.push(s);
  return parts.join(" — ");
}

// Registration status from a YYYY-MM string. Registrations expire on the LAST
// day of the month given (master-spreadsheet convention) → month-granularity.
export function regStatus(regExpires) {
  if (!regExpires) return "unknown";
  const m = String(regExpires).match(/^(\d{4})-(\d{2})/);
  if (!m) return "unknown";
  const exp = parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
  const today = new Date();
  const cur = today.getFullYear() * 12 + (today.getMonth() + 1);
  if (exp < cur) return "expired";
  if (exp === cur) return "due"; // current month — runs out at month-end
  if (exp === cur + 1) return "due_soon"; // next month — heads-up
  return "ok";
}

export const REG_FILL = {
  expired: "#fdecea",
  due: "#fff2cc",
  due_soon: "#fff8e1",
  ok: "transparent",
  unknown: "transparent",
};
export const REG_LABEL_COLOR = {
  expired: C.red,
  due: "#8a6500",
  due_soon: "#9a7400",
  ok: C.muted,
  unknown: C.muted,
};
export const LIFECYCLE_COLORS = {
  active: { color: C.green, bg: "#e6f5ec", label: "ACTIVE" },
  retired: { color: C.muted, bg: "#eeeeee", label: "RETIRED" },
};
