import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";

// ─── DriverInspectionForm (v28.187) ──────────────────────────────────────────
// FMCSA Part 396.11 pre/post-trip Driver Vehicle Inspection Report capture.
// Mobile-first per CAM Article XV — drivers do this in the field, often on a
// phone in a yard with poor signal.
//
// v28.187 — tractor + trailer combined DVIR. Driver picks a tow vehicle
// (pickup / tractor / straight truck) AND an optional trailer. When a trailer
// is selected, the 396.11 checklist appears twice — once per unit. ONE
// signature covers both. Each defect carries unit_id telling the audit trail
// which unit it was found on.
//
// POLICY (set 2026-05-22 by Reggie): No DOT vs non-DOT branching anywhere.
// Pre-trip AND post-trip are required for every operated vehicle — Class A
// combo OR 3/4-ton + trailer. The code does NOT special-case `cdl_class`.
//
// Flow:
//   1. Pick TOW VEHICLE (auto-defaults to the lead crew member's assigned
//      vehicle).
//   2. Optionally pick TRAILER (only trailers with vehicle_kind='trailer'
//      show up). When selected, the second checklist appears.
//   3. Toggle pre-trip vs post-trip (defaults to pre-trip).
//   4. Walk each component checklist. Default = PASS. Tap to flip to DEFECT,
//      then provide severity (minor / major) + a short description.
//      Optionally red-tag the unit (only when caller holds red_tag_vehicle
//      AND severity is major). Red-tag attaches to the UNIT the defect was
//      found on (trailer brakes → trailer red-tag, not the tractor).
//   5. Optional odometer + general notes.
//   6. Read the certification language, check the box, SUBMIT.
//
// GPS coords + device user agent capture silently on mount.
//
// SCOPE NOTE: Sign method this slice = 'attestation' (typed name + ack + GPS).
// WebAuthn biometric layer follows the JSASignSubmitModal pattern in v28.187+
// — BE schema already carries webauthn_assertion + pin_verified ready.

// FMCSA 396.11(a) component list. Universal coverage (DOT and non-DOT).
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

// v28.187 — verbiage swap. "Penalty of perjury" was civil-document framing
// (28 USC § 1746), not regulatory. FMCSA 49 CFR § 396.13 uses "certify".
// Long version per Reggie's pick — explicit on consequences but in the
// regulation's own language.
const DVIR_CERTIFICATION = `By submitting this inspection, I certify under 49 CFR § 396.13 that I have personally inspected each component listed above on this vehicle, and that the pass / defect statuses recorded here accurately reflect the vehicle's condition at the time of inspection. This serves as my legally binding signed Driver Vehicle Inspection Report. Falsifying a DVIR may result in termination, federal enforcement action, and personal liability under DOT safety regulations.`;

// What counts as a "tow vehicle" (vehicle that may pull a trailer). Anything
// that is not itself a trailer.
const TOW_KINDS = new Set(["pickup", "tractor", "straight_truck", "other"]);

// v28.187 — checklist for one unit. Rendered once per unit (tractor / trailer)
// so the JSX doesn't duplicate. unitKey ∈ {'tractor','trailer'} identifies
// which state array the setItem callback should mutate.
function ChecklistSection({ title, subtitle, items, unitKey, setItem, canRedTag }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.text, letterSpacing: "0.08em" }}>{title}</div>
        <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                      onClick={() => setItem(unitKey, idx, { status: s })}
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
                        onClick={() => setItem(unitKey, idx, { severity: sv })}
                        style={{
                          padding: "4px 10px",
                          background: item.severity === sv ? (sv === "major" ? C.red : C.yellow) : "transparent",
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
                          onChange={(e) => setItem(unitKey, idx, { red_tag: e.target.checked })}
                          style={{ accentColor: C.red }}
                        />
                        RED-TAG (OUT OF SERVICE)
                      </label>
                    )}
                  </div>
                  <textarea
                    value={item.description}
                    onChange={(e) => setItem(unitKey, idx, { description: e.target.value })}
                    placeholder="What's wrong with this component? (required)"
                    style={{ ...inputStyle, minHeight: 50, fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriverInspectionForm() {
  const { vehicles, can, currentUser } = useApp();
  const navigate = useNavigate();
  // v28.190 — accept ?vehicleId=X and ?trailerId=Y from the URL so the
  // ticket-side DVIR button can pre-fill the vehicle (and optional trailer)
  // when navigating here from a ticket. Falls back to auto-pick of the
  // user's assigned vehicle when no query param is present.
  const [searchParams] = useSearchParams();
  const queryVehicleId = searchParams.get("vehicleId") || "";
  const queryTrailerId = searchParams.get("trailerId") || "";
  const queryTicketId = searchParams.get("ticketId") || ""; // v28.209 — for pre-trip auto-clock-in
  const canPerform = can("perform_inspections");
  const canRedTag = can("red_tag_vehicle");

  // ── State ────────────────────────────────────────────────────────────────
  const [vehicleId, setVehicleId] = useState(queryVehicleId);
  const [trailerId, setTrailerId] = useState(queryTrailerId); // v28.187 — optional second unit
  const [type, setType] = useState("pre_trip");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  // v28.187 — checklists are now PER UNIT. tractorItems holds the 15-component
  // checklist for the primary vehicle; trailerItems for the trailer when one
  // is selected. Defect rows from both arrays merge at submit time, each
  // carrying its own unit_id so the BE can attribute correctly.
  const mkBlankList = () =>
    FMCSA_COMPONENTS.map((c) => ({
      component: c,
      status: "pass",
      severity: "minor",
      description: "",
      red_tag: false,
    }));
  const [tractorItems, setTractorItems] = useState(mkBlankList);
  const [trailerItems, setTrailerItems] = useState(mkBlankList);
  const [acknowledged, setAcknowledged] = useState(false);
  const [gps, setGps] = useState({ lat: null, lng: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null); // { id, defect_count, red_tag_count }
  // v28.208 — capture the form-OPEN time once (Phase 3a). This is the driver's
  // real start anchor (the walk-around happens BETWEEN open and submit), not the
  // save time. Sent with the POST; the pre-trip auto-clock-in (3b) uses it.
  const [openedAt] = useState(() => new Date().toISOString());

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

  // v28.187 — merged defect list with unit_id tagged so submit can pass each
  // defect with its source unit. Only consider trailer defects when a trailer
  // is selected (otherwise the trailer checklist is hidden anyway).
  const tractorDefects = useMemo(() => tractorItems.filter((i) => i.status === "defect"), [tractorItems]);
  const trailerDefects = useMemo(() => (trailerId ? trailerItems.filter((i) => i.status === "defect") : []), [trailerItems, trailerId]);
  const defects = useMemo(
    () => [...tractorDefects.map((d) => ({ ...d, unit_id: vehicleId })), ...trailerDefects.map((d) => ({ ...d, unit_id: trailerId }))],
    [tractorDefects, trailerDefects, vehicleId, trailerId],
  );
  const hasUnfilledDefect = defects.some((d) => !d.description.trim());

  // Per-unit item setter. unit ∈ {'tractor', 'trailer'}.
  const setItem = (unit, idx, patch) => {
    const setter = unit === "trailer" ? setTrailerItems : setTractorItems;
    setter((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  // Vehicle list partitioned by kind for the two dropdowns.
  const towVehicles = useMemo(() => (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && TOW_KINDS.has(v.vehicle_kind || "pickup")), [vehicles]);
  const trailerVehicles = useMemo(() => (vehicles || []).filter((v) => v.lifecycle_status !== "retired" && v.vehicle_kind === "trailer"), [vehicles]);

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
    // v28.209 — Phase 3b: walk-around standard is 5 min; over 8 needs a reason.
    if (type === "pre_trip") {
      const walkMin = (Date.now() - new Date(openedAt).getTime()) / 60000;
      if (walkMin > 8 && !notes.trim()) {
        setError(`Walk-around took ${Math.round(walkMin)} min (over 8). Add a note explaining why before submitting.`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        vehicle_id: vehicleId,
        trailer_id: trailerId || null,
        inspection_type: type,
        inspection_date: new Date().toISOString().slice(0, 10),
        opened_at: openedAt,
        ticket_id: queryTicketId || null,
        odometer: odometer ? parseInt(odometer, 10) : null,
        defects: defects.map((d) => ({
          component: d.component,
          description: d.description.trim(),
          severity: d.severity,
          unit_id: d.unit_id,
          red_tag: d.red_tag && canRedTag,
        })),
        signed_at: new Date().toISOString(),
        sign_method: "attestation",
        attestation_text: DVIR_CERTIFICATION,
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
              setTractorItems(mkBlankList());
              setTrailerItems(mkBlankList());
              setTrailerId("");
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

      {/* TOW VEHICLE + TRAILER + ODOMETER */}
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr 100px", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>TOW VEHICLE</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={inputStyle}>
            <option value="">Pick a vehicle…</option>
            {towVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number || v.vin || v.id.slice(0, 8)} — {[v.year, v.make, v.model].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>TRAILER (if pulling)</label>
          <select value={trailerId} onChange={(e) => setTrailerId(e.target.value)} style={inputStyle}>
            <option value="">— No trailer —</option>
            {trailerVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number || v.vin || v.id.slice(0, 8)}
                {v.subtype ? ` — ${v.subtype}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ODOMETER</label>
          <input style={inputStyle} type="number" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="134950" />
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>FMCSA 396.11 COMPONENT CHECKLIST</div>

      {/* TRACTOR / TOW-VEHICLE CHECKLIST */}
      <ChecklistSection
        title="TRACTOR / TOW VEHICLE"
        subtitle={(() => {
          const v = towVehicles.find((x) => x.id === vehicleId);
          if (!v) return "Pick a tow vehicle above";
          return `${v.vehicle_number || ""} ${[v.year, v.make, v.model].filter(Boolean).join(" ")}`.trim();
        })()}
        items={tractorItems}
        unitKey="tractor"
        setItem={setItem}
        canRedTag={canRedTag}
      />

      {/* TRAILER CHECKLIST — only when a trailer is selected */}
      {trailerId && (
        <ChecklistSection
          title="TRAILER"
          subtitle={(() => {
            const t = trailerVehicles.find((x) => x.id === trailerId);
            if (!t) return "";
            return `${t.vehicle_number || ""} ${t.subtype || ""}`.trim();
          })()}
          items={trailerItems}
          unitKey="trailer"
          setItem={setItem}
          canRedTag={canRedTag}
        />
      )}

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
        {DVIR_CERTIFICATION}
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 16,
          padding: 10,
          background: acknowledged ? C.greenB : "transparent",
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
      {error && <div style={{ padding: 10, background: C.redB, color: C.red, fontSize: 13, fontWeight: 600, borderRadius: 4, marginBottom: 12 }}>{error}</div>}

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
