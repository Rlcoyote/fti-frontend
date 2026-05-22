import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { useNavigate } from "react-router-dom";

// ─── DriverInspectionForm (v28.186) ──────────────────────────────────────────
// FMCSA Part 396.11 pre/post-trip Driver Vehicle Inspection Report capture.
// Mobile-first per CAM Article XV — drivers do this in the field, often on a
// phone in a yard with poor signal.
//
// Flow:
//   1. Pick vehicle (auto-defaults to the lead crew member's assigned vehicle).
//   2. Toggle pre-trip vs post-trip (defaults to pre-trip; first DVIR of the
//      day is almost always pre-trip).
//   3. Walk the 396.11 component checklist. Default = PASS. Tap a component
//      to flip it to DEFECT, then provide severity (minor / major) + a short
//      description. Optionally red-tag (out-of-service) if the driver holds
//      the permission AND severity is major.
//   4. Optional odometer + notes.
//   5. Read the attestation language, check the box, SUBMIT.
//
// GPS coords + device user agent capture silently on mount (so the field is
// populated by the time the user submits; no extra prompts).
//
// SCOPE NOTE: This first slice uses an "attestation" sign method (typed name
// + checkbox + GPS). v28.187+ layers the WebAuthn biometric flow on top using
// the same pattern as JSASignSubmitModal — the BE schema already carries
// webauthn_assertion + pin_verified columns ready for that upgrade.

// FMCSA 396.11(a) component list. This is the federally-required inspection
// scope; FTI uses it for both DOT and non-DOT vehicles (per the project doc:
// the pre-trip sign-off is universal even for non-DOT vehicles).
const FMCSA_COMPONENTS = [
  "Service brakes (including trailer brake connections)",
  "Parking (hand) brake",
  "Steering mechanism",
  "Lighting devices and reflectors",
  "Tires",
  "Horn",
  "Windshield wipers",
  "Rear-vision mirrors",
  "Coupling devices",
  "Wheels and rims",
  "Emergency equipment (fire extinguisher, triangles, fuses)",
  "Fluid leaks",
  "Fuel system",
  "Suspension",
  "Engine compartment (belts, hoses, fluids)",
];

const PERJURY_ATTESTATION = `By submitting this inspection, I attest under penalty of perjury that I have personally walked around and physically inspected each component listed above on this vehicle; that the pass / defect statuses recorded here reflect my honest observation of the vehicle's condition at the time of inspection; and that I understand this is my legally binding signed Driver Vehicle Inspection Report under FMCSA 49 CFR § 396.11. I understand that falsifying an inspection record may result in immediate termination and may be referred for federal prosecution.`;

function DriverInspectionForm() {
  const { vehicles, can, currentUser } = useApp();
  const navigate = useNavigate();
  const canPerform = can("perform_inspections");
  const canRedTag = can("red_tag_vehicle");

  // ── State ────────────────────────────────────────────────────────────────
  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState("pre_trip");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  // Each entry: { component, status: 'pass' | 'defect', severity: 'minor' | 'major', description, red_tag }
  const [items, setItems] = useState(() =>
    FMCSA_COMPONENTS.map((c) => ({
      component: c,
      status: "pass",
      severity: "minor",
      description: "",
      red_tag: false,
    })),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [gps, setGps] = useState({ lat: null, lng: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null); // { id, defect_count, red_tag_count }

  // Auto-pick the user's vehicle on mount.
  useEffect(() => {
    if (vehicleId) return;
    const mine = (vehicles || []).find((v) => v.current_driver_id === currentUser?.user_id);
    if (mine) setVehicleId(mine.id);
  }, [vehicles, currentUser, vehicleId]);

  // GPS capture on mount (silent; no blocking UX).
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGps({ lat: null, lng: null }),
      { timeout: 4000, enableHighAccuracy: false },
    );
  }, []);

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = winW < 900;

  const defects = useMemo(() => items.filter((i) => i.status === "defect"), [items]);
  const hasUnfilledDefect = defects.some((d) => !d.description.trim());

  const setItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const submit = async () => {
    if (!vehicleId) {
      setError("Pick a vehicle");
      return;
    }
    if (defects.length > 0 && hasUnfilledDefect) {
      setError("Every defect needs a short description (what's wrong?)");
      return;
    }
    if (!acknowledged) {
      setError("You must acknowledge the attestation before submitting");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        vehicle_id: vehicleId,
        inspection_type: type,
        inspection_date: new Date().toISOString().slice(0, 10),
        odometer: odometer ? parseInt(odometer, 10) : null,
        defects: defects.map((d) => ({
          component: d.component,
          description: d.description.trim(),
          severity: d.severity,
          red_tag: d.red_tag && canRedTag,
        })),
        signed_at: new Date().toISOString(),
        sign_method: "attestation",
        attestation_text: PERJURY_ATTESTATION,
        device_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        notes: notes.trim() || null,
      };
      const r = await fetch(`${API_URL}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await r.json();
      if (!r.ok) {
        setError(body?.error || `Submit failed (HTTP ${r.status})`);
        setSubmitting(false);
        return;
      }
      setSuccess(body);
    } catch (err) {
      setError(err.message || "Submit failed");
      setSubmitting(false);
    }
  };

  if (!canPerform) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text }}>Driver Vehicle Inspection</h2>
        <p style={{ color: C.muted }}>You do not have permission to perform vehicle inspections.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: isMob ? 16 : 32, maxWidth: 600, margin: "0 auto", color: C.text }}>
        <h2 style={{ color: C.text }}>Inspection submitted ✓</h2>
        <div style={{ padding: 16, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>Result:</strong> {success.result === "pass" ? "PASS — no defects" : `DEFECTS FOUND (${success.defect_count})`}
          </div>
          {success.red_tag_count > 0 && (
            <div style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>
              ⚠️ {success.red_tag_count} red tag{success.red_tag_count !== 1 ? "s" : ""} issued — vehicle is OUT OF SERVICE
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => navigate("/inspections")}>VIEW ALL INSPECTIONS</Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              setSuccess(null);
              setItems(
                FMCSA_COMPONENTS.map((c) => ({
                  component: c,
                  status: "pass",
                  severity: "minor",
                  description: "",
                  red_tag: false,
                })),
              );
              setAcknowledged(false);
              setNotes("");
              setOdometer("");
              setSubmitting(false);
            }}
          >
            START ANOTHER
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMob ? 12 : 24, maxWidth: 800, margin: "0 auto", color: C.text }}>
      {/* HEADER */}
      <h2 style={{ margin: "0 0 16px 0", color: C.text, fontSize: 20, fontWeight: 800 }}>
        Driver Vehicle Inspection — {type === "pre_trip" ? "Pre-Trip" : "Post-Trip"}
      </h2>

      {/* TYPE TOGGLE */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
        {["pre_trip", "post_trip"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: type === t ? C.blue : "transparent",
              color: type === t ? C.white : C.text,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {t === "pre_trip" ? "PRE-TRIP" : "POST-TRIP"}
          </button>
        ))}
      </div>

      {/* VEHICLE + ODOMETER */}
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "2fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>VEHICLE</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={inputStyle}>
            <option value="">Pick a vehicle…</option>
            {(vehicles || [])
              .filter((v) => v.lifecycle_status !== "retired")
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number || v.vin || v.id.slice(0, 8)} — {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ODOMETER</label>
          <input
            style={inputStyle}
            type="number"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder="e.g. 134950"
          />
        </div>
      </div>

      {/* CHECKLIST */}
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>FMCSA 396.11 COMPONENT CHECKLIST</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {items.map((item, idx) => {
          const isDef = item.status === "defect";
          return (
            <div
              key={idx}
              style={{
                background: C.cardBg,
                border: `1px solid ${isDef ? C.red + "55" : C.border}`,
                borderLeft: `4px solid ${isDef ? C.red : C.green}`,
                borderRadius: 4,
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{item.component}</div>
                <div style={{ display: "flex", gap: 0, border: `1px solid ${C.border}`, borderRadius: 3, overflow: "hidden" }}>
                  {["pass", "defect"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setItem(idx, { status: s })}
                      style={{
                        padding: "5px 12px",
                        background: item.status === s ? (s === "pass" ? C.green : C.red) : "transparent",
                        color: item.status === s ? C.white : C.text,
                        border: "none",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                      }}
                    >
                      {s === "pass" ? "PASS" : "DEFECT"}
                    </button>
                  ))}
                </div>
              </div>
              {isDef && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.06em" }}>SEVERITY</span>
                    {["minor", "major"].map((sv) => (
                      <button
                        key={sv}
                        type="button"
                        onClick={() => setItem(idx, { severity: sv })}
                        style={{
                          padding: "4px 10px",
                          background: item.severity === sv ? (sv === "major" ? C.red : "#8a6500") : "transparent",
                          color: item.severity === sv ? C.white : C.text,
                          border: `1px solid ${item.severity === sv ? "transparent" : C.border}`,
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {sv}
                      </button>
                    ))}
                    {canRedTag && item.severity === "major" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.red, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={item.red_tag}
                          onChange={(e) => setItem(idx, { red_tag: e.target.checked })}
                          style={{ accentColor: C.red }}
                        />
                        RED-TAG (OUT OF SERVICE)
                      </label>
                    )}
                  </div>
                  <textarea
                    value={item.description}
                    onChange={(e) => setItem(idx, { description: e.target.value })}
                    placeholder="What's wrong with this component? (required)"
                    style={{ ...inputStyle, minHeight: 50, fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NOTES */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>GENERAL NOTES (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth recording about this inspection…"
          style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      {/* GPS PILL */}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
        {gps.lat != null && gps.lng != null
          ? `📍 GPS captured: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
          : "📍 GPS not available — inspection will record without location"}
      </div>

      {/* ATTESTATION */}
      <div
        style={{
          padding: 14,
          background: C.steel,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          marginBottom: 14,
          fontSize: 12,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
        {PERJURY_ATTESTATION}
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 16,
          padding: 10,
          background: acknowledged ? "#e6f5ec" : "transparent",
          border: `1px solid ${acknowledged ? C.green : C.border}`,
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          style={{ marginTop: 2, accentColor: C.blue, width: 18, height: 18 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          I, <strong>{currentUser?.name}</strong>, acknowledge the attestation above and confirm this DVIR is true and complete.
        </span>
      </label>

      {/* ERROR */}
      {error && (
        <div style={{ padding: 10, background: "#fdecea", color: C.red, fontSize: 13, fontWeight: 600, borderRadius: 4, marginBottom: 12 }}>{error}</div>
      )}

      {/* SUBMIT */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={submit} disabled={submitting}>
          {submitting ? "SUBMITTING…" : `SUBMIT INSPECTION (${defects.length === 0 ? "PASS" : `${defects.length} DEFECT${defects.length !== 1 ? "S" : ""}`})`}
        </Btn>
        <Btn variant="ghost" onClick={() => navigate(-1)}>
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

export default DriverInspectionForm;
