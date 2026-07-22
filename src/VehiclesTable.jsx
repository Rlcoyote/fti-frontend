import { C } from "./config.js";
import { vehicleTypeDisplay, regStatus, REG_FILL, REG_LABEL_COLOR } from "./vehicleDisplay.js";
import LifecycleBadge from "./LifecycleBadge.jsx";

// ─── VehiclesTable (extracted from VehiclesPage v28.235) ─────────────────────
// Desktop grid + mobile cards for the vehicle list. Row click → onRowClick(v).

const COLS = "70px 1fr 1.4fr 90px 140px 1.2fr 90px 110px 100px 100px";
const HEADERS = ["#", "TYPE", "YEAR / MAKE / MODEL", "PLATE", "VIN", "DRIVER", "ODO", "REG EXP", "GPS ID", "STATUS"];

export default function VehiclesTable({ vehicles, isMob, onRowClick }) {
  if (vehicles.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No vehicles match.</div>;
  }

  if (isMob) {
    return (
      <div>
        {vehicles.map((v) => {
          const rs = regStatus(v.registration_expires);
          return (
            <div
              key={v.id}
              onClick={() => onRowClick(v)}
              style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", marginRight: 8 }}>{v.vehicle_number || "—"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}</span>
                </div>
                <LifecycleBadge status={v.lifecycle_status} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{vehicleTypeDisplay(v)}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                {[
                  v.license_plate ? `Plate ${v.license_plate}` : null,
                  v.current_driver_name ? `Driver ${v.current_driver_name}` : null,
                  v.odometer != null ? `${v.odometer.toLocaleString()} mi` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
              {v.registration_expires && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    color: REG_LABEL_COLOR[rs],
                    fontWeight: rs === "expired" || rs === "due" ? 700 : 500,
                    padding: "2px 8px",
                    borderRadius: 3,
                    background: REG_FILL[rs],
                    marginRight: 8,
                  }}
                >
                  Reg: {v.registration_expires}
                </div>
              )}
              {v.gps_vehicle_id && (
                <div style={{ display: "inline-block", fontSize: 10, color: C.muted, fontFamily: "monospace" }}>GPS: {v.gps_vehicle_id}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, background: C.navy, padding: "10px 16px", gap: 8 }}>
        {HEADERS.map((h) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
            {h}
          </div>
        ))}
      </div>
      {vehicles.map((v, i) => {
        const rs = regStatus(v.registration_expires);
        return (
          <div
            key={v.id}
            onClick={() => onRowClick(v)}
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
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{v.vehicle_number || "—"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{vehicleTypeDisplay(v)}</div>
            <div style={{ fontSize: 12, color: C.text }}>
              {[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}
              {v.color ? <span style={{ color: C.muted, marginLeft: 6 }}>· {v.color}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{v.license_plate || "—"}</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {v.vin || "—"}
            </div>
            <div style={{ fontSize: 11, color: v.current_driver_name ? C.text : C.muted }}>{v.current_driver_name || "—"}</div>
            <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{v.odometer != null ? v.odometer.toLocaleString() : "—"}</div>
            <div
              style={{
                fontSize: 11,
                color: REG_LABEL_COLOR[rs],
                fontWeight: rs === "expired" || rs === "due" ? 700 : 500,
                padding: "3px 6px",
                borderRadius: 3,
                background: REG_FILL[rs],
                textAlign: "center",
              }}
            >
              {v.registration_expires || "—"}
            </div>
            <div style={{ fontSize: 10, color: v.gps_vehicle_id ? C.text : C.muted, fontFamily: "monospace" }}>{v.gps_vehicle_id || "—"}</div>
            <div>
              <LifecycleBadge status={v.lifecycle_status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
