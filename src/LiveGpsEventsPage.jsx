import { useState, useEffect, useMemo, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";

// ─── LiveGpsEventsPage (v28.185) ─────────────────────────────────────────────
// Real-time feed of GPS provider events ingested via the /api/webhooks/gps
// endpoint. Polls /api/gps-events every 30s for fresh rows. This is the user-
// facing surface of GPS Phase 2.5 — Reggie's dispatch office gets a feed of
// vehicle entries/exits across yards, WOs, and per-well locations as they
// happen.
//
// Gated `view_gps_events` (owner / admin / manager / dispatch default-on per
// permissions.js; field / salesman default-off).
//
// v28.187+ will layer on:
//   - Notification dispatch (in-app + email) when an event matches a user's
//     preferences (the user_notification_preferences table already exists
//     from migration 010).
//   - Notification Preferences settings page (master pause + per-category).
//   - Server-sent events / WebSocket for true push (polling is fine for the
//     first slice; the events table is the durable source).

const EVENT_TYPE_LABELS = {
  geofence_enter: "Entered",
  geofence_exit: "Left",
  ignition_on: "Ignition ON",
  ignition_off: "Ignition OFF",
  speed_violation: "Speed violation",
  harsh_event: "Harsh event",
  fault_code: "Fault code",
  other: "Other",
};

function eventColor(type) {
  if (type === "geofence_enter") return { color: C.green, bg: C.greenB };
  if (type === "geofence_exit") return { color: C.blue, bg: C.blueB };
  if (type === "ignition_on") return { color: C.yellow, bg: C.yellowB };
  if (type === "ignition_off") return { color: C.muted, bg: C.steel };
  if (type === "speed_violation" || type === "harsh_event") return { color: C.red, bg: C.redB };
  return { color: C.muted, bg: C.steel };
}

function kindBadge(kind) {
  if (kind === "yard") return { color: C.muted, bg: C.steel, label: "YARD" };
  if (kind === "job") return { color: C.blue, bg: C.blueB, label: "WO" };
  if (kind === "well") return { color: C.green, bg: C.greenB, label: "WELL" };
  if (kind === "unknown") return { color: C.yellow, bg: C.yellowB, label: "UNLINKED" };
  return null;
}

function formatRelative(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

function formatAbsolute(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LiveGpsEventsPage() {
  const { can, vehicles } = useApp();
  const canView = can("view_gps_events");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [filterVehicle, setFilterVehicle] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterKind, setFilterKind] = useState("All");
  const [paused, setPaused] = useState(false);

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = winW < 900;

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/gps-events?limit=500`);
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const body = await r.json();
      setEvents(body.events || []);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    load();
    if (paused) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [canView, load, paused]);

  const filtered = useMemo(() => {
    let list = events;
    if (filterVehicle !== "All") list = list.filter((e) => e.vehicleId === filterVehicle);
    if (filterType !== "All") list = list.filter((e) => e.eventType === filterType);
    if (filterKind !== "All") list = list.filter((e) => e.geofenceKind === filterKind);
    return list;
  }, [events, filterVehicle, filterType, filterKind]);

  // Distinct event types present in the data — feed the filter dropdown only
  // with values that actually exist, so users don't pick a type that yields
  // an empty result by definition.
  const uniqueTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.eventType).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  if (!canView) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text }}>Live GPS Events</h2>
        <p style={{ color: C.muted }}>You do not have permission to view live GPS events.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: isMob ? 12 : 24, color: C.text }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: isMob ? "flex-start" : "center",
          justifyContent: "space-between",
          flexDirection: isMob ? "column" : "row",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>Live GPS Events</h2>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {loading
              ? "Loading…"
              : error
                ? `Last refresh failed: ${error}`
                : `${filtered.length} of ${events.length} events${
                    lastRefreshed ? ` • refreshed ${formatRelative(lastRefreshed.toISOString())}` : ""
                  }${paused ? " • PAUSED" : ""}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            style={{
              background: paused ? C.red : "transparent",
              color: paused ? C.white : C.text,
              border: `1px solid ${paused ? C.red : C.border}`,
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {paused ? "RESUME REFRESH" : "PAUSE REFRESH"}
          </button>
          <button
            type="button"
            onClick={load}
            style={{
              background: "transparent",
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            REFRESH NOW
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          padding: isMob ? 10 : 12,
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 }}>VEHICLE</div>
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              background: C.cardBg,
              color: C.text,
              fontSize: 12,
              minWidth: 160,
            }}
          >
            <option value="All">All vehicles</option>
            {(vehicles || [])
              .filter((v) => v.gps_vehicle_id)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number || `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || v.vin || v.id.slice(0, 8)}
                </option>
              ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 }}>EVENT</div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              background: C.cardBg,
              color: C.text,
              fontSize: 12,
              minWidth: 140,
            }}
          >
            <option value="All">All events</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 }}>LOCATION KIND</div>
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              background: C.cardBg,
              color: C.text,
              fontSize: 12,
              minWidth: 140,
            }}
          >
            <option value="All">Any</option>
            <option value="yard">Yards</option>
            <option value="job">Work Orders</option>
            <option value="well">Wells</option>
            <option value="unknown">Unlinked</option>
          </select>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!loading && events.length === 0 && (
        <div
          style={{
            padding: 24,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            textAlign: "center",
            color: C.muted,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>No events yet.</div>
          <div style={{ fontSize: 12 }}>
            Events appear here as the GPS provider sends webhooks (vehicles entering/leaving yards, WOs, or per-well locations).
            <br />
            Make sure the Samsara webhook is pointed at <code>/api/webhooks/gps</code> with the shared secret matching <code>GPS_WEBHOOK_SECRET</code> on the
            server.
          </div>
        </div>
      )}

      {/* FEED */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e) => {
            const evt = eventColor(e.eventType);
            const kind = kindBadge(e.geofenceKind);
            const arrow = e.eventType === "geofence_enter" ? "→" : e.eventType === "geofence_exit" ? "←" : "•";
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMob ? "1fr" : "150px 80px 1fr 1fr 90px",
                  gap: isMob ? 4 : 12,
                  alignItems: "center",
                  padding: "10px 14px",
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${evt.color}`,
                  borderRadius: 5,
                }}
              >
                <div style={{ fontSize: 12, color: C.muted }}>
                  <div style={{ fontWeight: 700, color: C.text }}>{formatRelative(e.occurredAt)}</div>
                  <div style={{ fontSize: 10 }}>{formatAbsolute(e.occurredAt)}</div>
                </div>
                <div>
                  <span
                    style={{
                      background: evt.bg,
                      color: evt.color,
                      borderRadius: 3,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {EVENT_TYPE_LABELS[e.eventType] || e.eventType}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {e.vehicleLabel || <span style={{ color: C.muted, fontWeight: 400, fontStyle: "italic" }}>Unlinked vehicle ({e.gpsVehicleId || "—"})</span>}
                </div>
                <div style={{ fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ color: C.muted }}>{arrow}</span>
                  {kind && (
                    <span
                      style={{
                        background: kind.bg,
                        color: kind.color,
                        borderRadius: 3,
                        padding: "1px 6px",
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {kind.label}
                    </span>
                  )}
                  <span>{e.geofenceLabel || <span style={{ color: C.muted, fontStyle: "italic" }}>(no geofence)</span>}</span>
                </div>
                <div style={{ fontSize: 10, color: C.muted, textAlign: isMob ? "left" : "right" }}>
                  {e.lat != null && e.lng != null ? (
                    <a href={`https://maps.google.com/?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: "none" }}>
                      Map ↗
                    </a>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LiveGpsEventsPage;
