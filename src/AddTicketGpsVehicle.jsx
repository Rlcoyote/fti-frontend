import { useEffect, useMemo } from "react";
import { C } from "./config.js";
import { inputStyle, labelStyle, PANEL_MUTED } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── AddTicketGpsVehicle (v28.183) ──────────────────────────────────────────
// Compact GPS vehicle picker for the AddTicketModal form. Renders a dropdown
// of all active vehicles formatted "<unit/vehicle#> — <year> <make> <model>
// (<driver>)". The selected value is the vehicle.id (uuid), which the BE
// stores on tickets.gps_vehicle_id and uses to look up the GPS provider's
// vehicle ID when the user later hits PULL FROM GPS on the ticket.
//
// Defaulting: when the lead crew member changes, we auto-pick the vehicle
// whose current_driver_id matches the lead's user_id (the driver's "main"
// vehicle in the master record). User can override at any time. No default
// is set if the lead has no vehicle on file.
//
// White-label: the label says "GPS VEHICLE" — provider-agnostic, matches
// the rest of the codebase. The dropdown shows vehicles that have a
// gps_vehicle_id set first (those are the ones actually GPS-trackable),
// then all others below a separator so the user can still select a vehicle
// that's awaiting GPS provisioning.

export default function AddTicketGpsVehicle({ trailerId, setTrailerId, gpsVehicleId, setGpsVehicleId, crewSelection }) {
  const { vehicles, users } = useApp();

  // Auto-default to lead's assigned vehicle when the lead changes — only if
  // the user hasn't manually picked yet (gpsVehicleId is empty/null).
  const lead = useMemo(() => (crewSelection || []).find((c) => c.is_lead) || null, [crewSelection]);
  useEffect(() => {
    if (gpsVehicleId) return; // user already picked or already set
    if (!lead?.user_id) return;
    const v = (vehicles || []).find((vh) => vh.current_driver_id === lead.user_id);
    if (v) setGpsVehicleId(v.id);
  }, [lead?.user_id, vehicles, gpsVehicleId, setGpsVehicleId]);

  const trackable = (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && v.gps_vehicle_id);
  // v28.280 — which trailer hauled the iron (Reggie C3). Same vehicles list
  // the DVIR validates against.
  const trailers = (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && v.vehicle_kind === "trailer");
  const untracked = (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && !v.gps_vehicle_id);
  const userById = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => {
      m[u.id] = u.name;
    });
    return m;
  }, [users]);

  const label = (v) => {
    const num = v.vehicle_number || v.unit_number || "—";
    const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
    const drv = v.current_driver_id ? userById[v.current_driver_id] : null;
    const base = `${num} — ${ymm || "(no make/model)"}`;
    return drv ? `${base} (${drv})` : base;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>GPS VEHICLE</label>
      <select style={inputStyle} value={gpsVehicleId || ""} onChange={(e) => setGpsVehicleId(e.target.value || null)}>
        <option value="">(none — no GPS tracking for this ticket)</option>
        {trackable.length > 0 && (
          <optgroup label="GPS-tracked vehicles">
            {trackable.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v)}
              </option>
            ))}
          </optgroup>
        )}
        {untracked.length > 0 && (
          <optgroup label="Vehicles without GPS provisioned">
            {untracked.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>TRAILER</label>
        <select style={inputStyle} value={trailerId || ""} onChange={(e) => setTrailerId?.(e.target.value || null)}>
          <option value="">(none — no trailer on this ticket)</option>
          {trailers.map((v) => (
            <option key={v.id} value={v.id}>
              {label(v)}
            </option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 11, color: PANEL_MUTED, marginTop: 4 }}>
        Auto-fills to the lead crew member&rsquo;s assigned vehicle when a lead is selected. Override anytime.
      </div>
      {gpsVehicleId && !(vehicles || []).find((v) => v.id === gpsVehicleId && v.gps_vehicle_id) && (
        <div style={{ fontSize: 11, color: C.amber || "#8a6500", marginTop: 4 }}>
          Heads up: this vehicle isn&rsquo;t GPS-provisioned. The ticket will save fine, but PULL FROM GPS won&rsquo;t return data until the vehicle is linked
          in the Vehicles admin page.
        </div>
      )}
    </div>
  );
}
