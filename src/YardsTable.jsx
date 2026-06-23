import { C } from "./config.js";
import LifecycleBadge from "./LifecycleBadge.jsx";

// ─── YardsTable (extracted from YardsPage v28.236) ───────────────────────────
// Desktop grid + mobile cards for the yard list. Row click → onRowClick(y).

const COLS = "1.6fr 1.8fr 80px 100px 1.4fr 100px 90px";
const HEADERS = ["NAME", "ADDRESS", "RADIUS", "DEFAULT", "GPS GEOFENCE", "STATUS", ""];

const addr = (y) => [y.address, y.city, y.state, y.zip].filter(Boolean).join(", ") || "—";

export default function YardsTable({ yards, isMob, onRowClick }) {
  if (isMob) {
    return (
      <div>
        {yards.map((y) => (
          <div
            key={y.id}
            onClick={() => onRowClick(y)}
            style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10, cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {y.is_default && <span style={{ color: C.blue, marginRight: 6 }}>★</span>}
                {y.name}
              </span>
              <LifecycleBadge status={y.lifecycle_status} />
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{addr(y)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {y.radius_ft ? `${y.radius_ft} ft radius` : "no radius"} · {y.gps_geofence_id ? `GPS: ${y.gps_geofence_id}` : "no GPS link"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, background: C.darkBlue, padding: "10px 16px", gap: 8 }}>
        {HEADERS.map((h) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
            {h}
          </div>
        ))}
      </div>
      {yards.map((y, i) => (
        <div
          key={y.id}
          onClick={() => onRowClick(y)}
          style={{
            display: "grid",
            gridTemplateColumns: COLS,
            padding: "10px 16px",
            gap: 8,
            alignItems: "center",
            borderBottom: `1px solid ${C.border}22`,
            background: i % 2 === 0 ? C.cardBg : C.steel,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{y.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{addr(y)}</div>
          <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{y.radius_ft ? `${y.radius_ft} ft` : "—"}</div>
          <div style={{ fontSize: 11 }}>
            {y.is_default ? <span style={{ color: C.blue, fontWeight: 700 }}>★ DEFAULT</span> : <span style={{ color: C.muted }}>—</span>}
          </div>
          <div
            style={{
              fontSize: 10,
              color: y.gps_geofence_id ? C.text : C.muted,
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {y.gps_geofence_id || "no GPS link"}
          </div>
          <div>
            <LifecycleBadge status={y.lifecycle_status} />
          </div>
          <div style={{ fontSize: 10, color: C.muted, textAlign: "right" }}>edit ›</div>
        </div>
      ))}
    </div>
  );
}
