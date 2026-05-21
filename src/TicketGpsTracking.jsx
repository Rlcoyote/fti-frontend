import { useMemo, useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import WellPinPaste from "./WellPinPaste.jsx";

// ─── TicketGpsTracking (v28.183) ────────────────────────────────────────────
// Per-ticket GPS time-tracking block. Lives on TicketDetail, between the
// Crew Selection section and the manual Time & Mileage section. Renders:
//   • GPS Vehicle picker (editable, defaults from the ticket record)
//   • Status badge (pending / pulled / gps_down / manual_override)
//   • Leave Yard time (yard_left_at)
//   • One row per stop (job-well or ad-hoc) with Arrived + Left + Engine Idle
//   • + ADD STOP button (creates an ad-hoc manual stop with optional pin)
//   • Returned to Yard time (yard_returned_at)
//   • PULL FROM GPS button
//
// Editing semantics:
//   - PULL FROM GPS writes ticket_stops with source='gps' server-side; on
//     return we refresh local state from the result + the persisted row.
//   - Manual edit of any GPS-populated field flips the row's source to
//     'override' locally; the next save() PUTs the full stops array which
//     the BE rewrites — preserving the override flag on subsequent reads.
//   - + ADD STOP creates a row with source='manual' and is preserved by
//     the next GPS pull (the BE only deletes source='gps' rows on pull).
//
// Anti-pattern guards (CAM Section V):
//   - No raw lat/lng inputs. Ad-hoc stops use WellPinPaste (paste Google
//     Maps URL → coords). Entry 11: "Crews and end-users will not enter
//     lat/lng manually; field expects copy-pasted URLs."
//   - Component is presentational + controlled by the parent state
//     (useTicketState). No API mutations live here except the one PULL
//     call and the ad-hoc-stop pin resolve (latter via WellPinPaste).

// Format an ISO timestamp for <input type="datetime-local">. Returns "" on null.
function isoToLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function localInputToIso(s) {
  if (!s) return null;
  try {
    return new Date(s).toISOString();
  } catch {
    return null;
  }
}

function StatusBadge({ status, pulledAt }) {
  const map = {
    pending: { bg: "#f0f0f0", text: C.muted, border: C.border, label: "—" },
    pulled: { bg: "#e6f5ec", text: C.green, border: `${C.green}55`, label: pulledAt ? `✓ Pulled ${new Date(pulledAt).toLocaleString()}` : "✓ Pulled" },
    gps_down: { bg: "#fdecec", text: C.red, border: `${C.red}55`, label: "GPS unavailable" },
    manual_override: { bg: "#fdf5d8", text: "#8a6500", border: "#e6c20055", label: "Edited manually" },
  };
  const m = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-block",
        background: m.bg,
        color: m.text,
        border: `1px solid ${m.border}`,
        borderRadius: 3,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
      }}
    >
      {m.label}
    </span>
  );
}

// Single timestamp row — label + datetime-local input + source pill.
function TimeRow({ label, value, onChange, editable, source }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 90px", gap: 10, alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.04em" }}>{label}</span>
      <input
        type="datetime-local"
        style={{ ...inputStyle, padding: "5px 8px" }}
        value={isoToLocalInput(value)}
        disabled={!editable}
        onChange={(e) => onChange(localInputToIso(e.target.value))}
      />
      <SourcePill source={source} />
    </div>
  );
}

function SourcePill({ source }) {
  if (!source) return <span />;
  const map = {
    gps: { bg: "#e6f5ec", color: C.green, label: "GPS" },
    manual: { bg: "#eef1f4", color: C.muted, label: "MANUAL" },
    override: { bg: "#fdf5d8", color: "#8a6500", label: "EDITED" },
  };
  const m = map[source] || map.manual;
  return (
    <span
      style={{
        background: m.bg,
        color: m.color,
        fontSize: 9,
        fontWeight: 800,
        padding: "2px 6px",
        borderRadius: 3,
        letterSpacing: "0.06em",
        textAlign: "center",
      }}
    >
      {m.label}
    </span>
  );
}

export default function TicketGpsTracking({
  ticket,
  editable,
  gpsVehicleId,
  setGpsVehicleId,
  yardLeftAt,
  setYardLeftAt,
  yardReturnedAt,
  setYardReturnedAt,
  gpsStatus,
  setGpsStatus,
  gpsPulledAt,
  setGpsPulledAt,
  stops,
  setStops,
}) {
  const { vehicles, users, showNotice } = useApp();
  const [pulling, setPulling] = useState(false);
  const [addingStop, setAddingStop] = useState(false);
  const [newStop, setNewStop] = useState({ ad_hoc_label: "", ad_hoc_lat: null, ad_hoc_lng: null });

  // Lookup of vehicle.id → label for the picker.
  const userById = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => {
      m[u.id] = u.name;
    });
    return m;
  }, [users]);
  const trackable = (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && v.gps_vehicle_id);
  const untracked = (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && !v.gps_vehicle_id);
  const vehicleLabel = (v) => {
    const num = v.vehicle_number || v.unit_number || "—";
    const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
    const drv = v.current_driver_id ? userById[v.current_driver_id] : null;
    const base = `${num} — ${ymm || "(no make/model)"}`;
    return drv ? `${base} (${drv})` : base;
  };
  const selectedVehicle = (vehicles || []).find((v) => v.id === gpsVehicleId) || null;

  // Helpers for stop edits — each flips source to 'override' if the row was
  // 'gps' (since the user just changed a pulled value).
  const updateStop = (idx, field, value) => {
    setStops((prev) => {
      const next = [...prev];
      const cur = next[idx];
      const newSource = cur.source === "gps" ? "override" : cur.source || "manual";
      next[idx] = { ...cur, [field]: value, source: newSource };
      return next;
    });
    if (gpsStatus === "pulled") setGpsStatus("manual_override");
  };
  const removeStop = (idx) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };
  const addAdHocStop = () => {
    if (!newStop.ad_hoc_label.trim()) {
      showNotice("Missing label", "Give this stop a short label (e.g. 'Parts run — Hobbs').", "error");
      return;
    }
    setStops((prev) => [
      ...prev,
      {
        job_well_id: null,
        ad_hoc_label: newStop.ad_hoc_label.trim(),
        ad_hoc_lat: newStop.ad_hoc_lat,
        ad_hoc_lng: newStop.ad_hoc_lng,
        arrived_at: null,
        left_at: null,
        engine_idle_minutes: null,
        source: "manual",
        stop_order: prev.length,
      },
    ]);
    setNewStop({ ad_hoc_label: "", ad_hoc_lat: null, ad_hoc_lng: null });
    setAddingStop(false);
  };

  // PULL FROM GPS — calls the BE, which persists the result + returns it.
  const handlePull = async () => {
    if (pulling) return;
    setPulling(true);
    try {
      const r = await fetch(`${API_URL}/tickets/${ticket.id}/gps-pull`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        showNotice("GPS pull failed", body.error || `HTTP ${r.status}`, "error");
        if (body.code === "GPS_NOT_CONFIGURED" || r.status === 502) setGpsStatus("gps_down");
        setPulling(false);
        return;
      }
      // Update local state from the returned result. Stops come back already
      // persisted (source='gps') — re-fetch via the dedicated endpoint to
      // pick up the ids/job_well_name decorations.
      setYardLeftAt(body.yard_left_at || null);
      setYardReturnedAt(body.yard_returned_at || null);
      setGpsStatus("pulled");
      setGpsPulledAt(new Date().toISOString());
      // Refresh stops from /stops to get the id + job_well_name fields.
      try {
        const sr = await fetch(`${API_URL}/tickets/${ticket.id}/stops`);
        if (sr.ok) {
          const rows = await sr.json();
          setStops(
            (rows || []).map((s) => ({
              id: s.id,
              job_well_id: s.job_well_id,
              job_well_name: s.job_well_name || null,
              ad_hoc_label: s.ad_hoc_label,
              ad_hoc_lat: s.ad_hoc_lat,
              ad_hoc_lng: s.ad_hoc_lng,
              ad_hoc_gps_geofence_id: s.ad_hoc_gps_geofence_id,
              arrived_at: s.arrived_at,
              left_at: s.left_at,
              engine_idle_minutes: s.engine_idle_minutes,
              source: s.source || "gps",
              stop_order: s.stop_order,
              notes: s.notes,
            })),
          );
        }
      } catch {
        /* non-fatal */
      }
      if (body.points_count === 0) {
        showNotice(
          "No GPS data in this window",
          body.message ||
            "The provider returned no location points for this vehicle on the ticket date. Verify the vehicle is GPS-provisioned and was on-route.",
          "info",
        );
      }
    } catch (err) {
      showNotice("Network error", "Could not reach the GPS pull endpoint. Check the BE is up.", "error");
      setGpsStatus("gps_down");
      console.warn("gps-pull error:", err);
    } finally {
      setPulling(false);
    }
  };

  return (
    <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}33` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.08em" }}>GPS TIME TRACKING</span>
        <StatusBadge status={gpsStatus} pulledAt={gpsPulledAt} />
      </div>

      {/* Vehicle picker */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>GPS VEHICLE</label>
        <select style={inputStyle} value={gpsVehicleId || ""} disabled={!editable} onChange={(e) => setGpsVehicleId(e.target.value || null)}>
          <option value="">(none — no GPS tracking for this ticket)</option>
          {trackable.length > 0 && (
            <optgroup label="GPS-tracked vehicles">
              {trackable.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </optgroup>
          )}
          {untracked.length > 0 && (
            <optgroup label="Vehicles without GPS provisioned">
              {untracked.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {gpsVehicleId && selectedVehicle && !selectedVehicle.gps_vehicle_id && (
          <div style={{ fontSize: 11, color: "#8a6500", marginTop: 4 }}>
            Heads up: this vehicle isn&rsquo;t GPS-provisioned. Link it on the Vehicles page before PULL FROM GPS will return data.
          </div>
        )}
      </div>

      {/* Pull button */}
      <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={handlePull} disabled={!editable || !gpsVehicleId || pulling}>
          {pulling ? "PULLING…" : "PULL FROM GPS"}
        </Btn>
        <span style={{ fontSize: 11, color: PANEL_MUTED }}>
          Pulls the vehicle&rsquo;s location history for the ticket&rsquo;s day and computes geofence enter/exit times.
        </span>
      </div>

      {/* Leave Yard */}
      <TimeRow
        label="LEAVE YARD"
        value={yardLeftAt}
        onChange={(v) => {
          setYardLeftAt(v);
          if (gpsStatus === "pulled") setGpsStatus("manual_override");
        }}
        editable={editable}
        source={yardLeftAt ? (gpsStatus === "pulled" ? "gps" : gpsStatus === "manual_override" ? "override" : "manual") : null}
      />

      {/* Stops */}
      {stops.length > 0 && (
        <div style={{ marginTop: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: PANEL_MUTED, letterSpacing: "0.08em", marginBottom: 6 }}>STOPS</div>
          {stops.map((s, idx) => {
            const heading = s.ad_hoc_label ? `Stop ${idx + 1} — Manual: ${s.ad_hoc_label}` : `Stop ${idx + 1} — ${s.job_well_name || "Work order location"}`;
            return (
              <div key={s.id || `new-${idx}`} style={{ padding: 10, background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: PANEL_TEXT }}>{heading}</span>
                  {editable && s.source !== "gps" && (
                    <button
                      type="button"
                      onClick={() => removeStop(idx)}
                      style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}
                      aria-label="remove stop"
                    >
                      ×
                    </button>
                  )}
                </div>
                <TimeRow label="ARRIVED" value={s.arrived_at} onChange={(v) => updateStop(idx, "arrived_at", v)} editable={editable} source={s.source} />
                <TimeRow label="LEFT" value={s.left_at} onChange={(v) => updateStop(idx, "left_at", v)} editable={editable} source={s.source} />
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 90px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.04em" }}>ENGINE IDLE (min)</span>
                  <input
                    type="number"
                    min={0}
                    style={{ ...inputStyle, padding: "5px 8px" }}
                    value={s.engine_idle_minutes ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateStop(idx, "engine_idle_minutes", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  />
                  <span />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Stop affordance */}
      {editable && (
        <div style={{ marginBottom: 12 }}>
          {!addingStop ? (
            <button
              type="button"
              onClick={() => setAddingStop(true)}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: PANEL_TEXT,
                cursor: "pointer",
              }}
            >
              + ADD STOP
            </button>
          ) : (
            <div style={{ padding: 10, background: C.steel, border: `1px dashed ${C.border}`, borderRadius: 4 }}>
              <label style={labelStyle}>STOP LABEL</label>
              <input
                style={inputStyle}
                value={newStop.ad_hoc_label}
                onChange={(e) => setNewStop((p) => ({ ...p, ad_hoc_label: e.target.value }))}
                placeholder="Parts run — Hobbs, NM"
              />
              <div style={{ marginTop: 8 }}>
                <WellPinPaste
                  pinLat={newStop.ad_hoc_lat}
                  pinLng={newStop.ad_hoc_lng}
                  setPinLat={(v) => setNewStop((p) => ({ ...p, ad_hoc_lat: v }))}
                  setPinLng={(v) => setNewStop((p) => ({ ...p, ad_hoc_lng: v }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={addAdHocStop}>ADD STOP</Btn>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setAddingStop(false);
                    setNewStop({ ad_hoc_label: "", ad_hoc_lat: null, ad_hoc_lng: null });
                  }}
                >
                  CANCEL
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Returned to Yard */}
      <TimeRow
        label="RETURNED TO YARD"
        value={yardReturnedAt}
        onChange={(v) => {
          setYardReturnedAt(v);
          if (gpsStatus === "pulled") setGpsStatus("manual_override");
        }}
        editable={editable}
        source={yardReturnedAt ? (gpsStatus === "pulled" ? "gps" : gpsStatus === "manual_override" ? "override" : "manual") : null}
      />
    </div>
  );
}
