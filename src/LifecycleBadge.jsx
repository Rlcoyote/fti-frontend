import { C } from "./config.js";

// ─── LifecycleBadge (v28.236) ────────────────────────────────────────────────
// One home for the active/retired pill + its color map. Was duplicated across
// the vehicle split (vehicleDisplay + VehiclesTable) and YardsPage; shared here
// so every fleet entity renders the same badge from one source (Article XVII).

export const LIFECYCLE_COLORS = {
  active: { color: C.green, bg: "#e6f5ec", label: "ACTIVE" },
  retired: { color: C.muted, bg: "#eeeeee", label: "RETIRED" },
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
