/* eslint-disable react-refresh/only-export-components -- v28.407 (audit F5
   resolution): this file exports non-component values ALONGSIDE components
   DELIBERATELY. LIFECYCLE_COLORS is shared with yards by design (v28.236).
   The warning is HMR-only (a full reload instead of hot refresh in dev);
   fragmenting the one-home to satisfy it would trade architecture for
   dev-loop sugar. Documented, not silenced blindly. */
import { C } from "./config.js";

// ─── LifecycleBadge (v28.236) ────────────────────────────────────────────────
// One home for the active/retired pill + its color map. Was duplicated across
// the vehicle split (vehicleDisplay + VehiclesTable) and YardsPage; shared here
// so every fleet entity renders the same badge from one source (Article XVII).

// Getters, not values (SharedUI idiom) — module-level + exported; eager C
// reads would freeze the load-time theme into every consumer's badges.
export const LIFECYCLE_COLORS = {
  active: {
    label: "ACTIVE",
    get color() {
      return C.green;
    },
    get bg() {
      return C.greenB;
    },
  },
  retired: {
    label: "RETIRED",
    get color() {
      return C.muted;
    },
    get bg() {
      return C.lightSteel;
    },
  },
};

export default function LifecycleBadge({ status }) {
  const cfg = LIFECYCLE_COLORS[status] || LIFECYCLE_COLORS.active;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 3,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: "0.06em",
        border: `1px solid ${cfg.color}33`,
      }}
    >
      {cfg.label}
    </span>
  );
}
