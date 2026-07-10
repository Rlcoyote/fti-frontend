import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { useNavigate } from "react-router-dom";

// ─── RepairRequestForm (v28.191) ─────────────────────────────────────────────
// Per Reggie's 2026-05-22 design (ratified Option B): Repair Requests are a
// distinct domain object from DVIR defects. Anyone in the yard can file —
// driver sees a damaged trailer, site manager hears the truck making noise,
// HSE notices a missing fire extinguisher.
//
// Different from DVIR:
//   - No 15-component checklist. Single item, free-form component name.
//   - No signature ceremony. Just a quick note.
//   - Reporter is whoever sees the problem, not the truck's driver.
//   - Optional red-tag in same submission (gated red_tag_vehicle).
//
// FE-side gates:
//   - Form visible to: anyone who can perform_inspections OR view_vehicle_defects
//     OR view_inventory OR manage_vehicles. The "in the yard" set.
//   - Red-tag checkbox visible only when caller holds red_tag_vehicle.

// FMCSA components offered as quick-pick suggestions (mirrors the DVIR
// checklist) for convenience — but the field is free-form so the reporter can
// type anything ("AC compressor", "trailer light bar", etc.).
const SUGGESTED_COMPONENTS = [
  "Service brakes",
  "Parking brake",
  "Steering",
  "Lighting / reflectors",
  "Tires",
  "Horn",
  "Windshield wipers",
  "Mirrors",
  "Coupling devices",
  "Wheels / rims",
  "Emergency equipment",
  "Fluid leaks",
  "Fuel system",
  "Suspension",
  "Engine / belts / hoses",
  "Trailer body",
  "Trailer lights",
  "Other...",
];

function RepairRequestForm() {
  const { vehicles, can, currentUser } = useApp();
  const navigate = useNavigate();

  const canFile =
    can("perform_inspections") ||
    can("view_vehicle_defects") ||
    can("view_inventory") ||
    can("manage_vehicles") ||
    currentUser?.role === "owner" ||
    currentUser?.role === "admin";
  const canRedTag = can("red_tag_vehicle");

  const [vehicleId, setVehicleId] = useState("");
  const [component, setComponent] = useState("");
  const [componentPick, setComponentPick] = useState(""); // dropdown selection (or "Other...")
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [notes, setNotes] = useState("");
  const [redTag, setRedTag] = useState(false);
  const [redTagReason, setRedTagReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null); // { id, red_tagged }

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = winW < 900;

  // Vehicle dropdown — all non-retired, both tow vehicles AND trailers.
  // Anyone-in-yard might be reporting on either; no filter here.
  const allActiveVehicles = useMemo(() => (vehicles || []).filter((v) => v.lifecycle_status !== "retired"), [vehicles]);

  // When the user picks a suggested component from the dropdown, copy it into
  // the free-form input. "Other..." clears the input so they can type their own.
  const handleComponentPick = (e) => {
    const val = e.target.value;
    setComponentPick(val);
    if (val === "Other...") {
      setComponent("");
    } else {
      setComponent(val);
    }
  };

  const submit = async () => {
    if (!vehicleId) {
      setError("Pick the vehicle this report is about");
      return;
    }
    if (!component.trim()) {
      setError("Component / area is required");
      return;
    }
    if (redTag && !redTagReason.trim() && !description.trim()) {
      setError("Red-tag requires a reason or description");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/repair-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          component: component.trim(),
          description: description.trim() || null,
          severity,
          notes: notes.trim() || null,
          red_tag: redTag && canRedTag,
          red_tag_reason: redTagReason.trim() || null,
        }),
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

  if (!canFile) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text }}>Repair Request</h2>
        <p style={{ color: C.muted }}>You do not have permission to file repair requests.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: isMob ? 16 : 32, maxWidth: 600, margin: "0 auto", color: C.text }}>
        <h2 style={{ color: C.text }}>Repair request filed ✓</h2>
        <div
          style={{
            padding: 16,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>Status:</strong> Reported &mdash; awaiting mechanic assignment.
          </div>
          {success.red_tagged && <div style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>⚠️ Vehicle red-tagged — OUT OF SERVICE until cleared.</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={() => {
              setSuccess(null);
              setVehicleId("");
              setComponent("");
              setComponentPick("");
              setDescription("");
              setSeverity("minor");
              setNotes("");
              setRedTag(false);
              setRedTagReason("");
              setSubmitting(false);
            }}
          >
            + ANOTHER REQUEST
          </Btn>
          <Btn variant="ghost" onClick={() => navigate(-1)}>
            DONE
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMob ? 12 : 24, maxWidth: 700, margin: "0 auto", color: C.text }}>
      <h2 style={{ margin: "0 0 4px 0", color: C.text, fontSize: 20, fontWeight: 800 }}>Repair Request</h2>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Saw something that needs fixing? File a quick request — it lands in the mechanic queue.
      </div>

      {/* VEHICLE */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>VEHICLE / TRAILER</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={inputStyle}>
          <option value="">Pick the unit this report is about…</option>
          {allActiveVehicles.map((v) => {
            const kindTag = v.vehicle_kind === "trailer" ? " (trailer)" : "";
            return (
              <option key={v.id} value={v.id}>
                {v.vehicle_number || v.vin || v.id.slice(0, 8)} — {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                {kindTag}
              </option>
            );
          })}
        </select>
      </div>

      {/* COMPONENT */}
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>SUGGESTIONS</label>
          <select value={componentPick} onChange={handleComponentPick} style={inputStyle}>
            <option value="">— Quick-pick (or type your own) —</option>
            {SUGGESTED_COMPONENTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>COMPONENT / AREA</label>
          <input
            style={inputStyle}
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            placeholder="e.g. AC compressor, trailer light bar"
            maxLength={80}
          />
        </div>
      </div>

      {/* DESCRIPTION */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>DESCRIPTION (what's wrong?)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in a sentence or two…"
          style={{ ...inputStyle, minHeight: 70, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      {/* SEVERITY */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>SEVERITY</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["minor", "major"].map((sv) => (
            <button
              key={sv}
              type="button"
              onClick={() => setSeverity(sv)}
              style={{
                padding: "6px 18px",
                background: severity === sv ? (sv === "major" ? C.red : C.yellow) : "transparent",
                color: severity === sv ? C.white : C.text,
                border: `1px solid ${severity === sv ? "transparent" : C.border}`,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {sv}
            </button>
          ))}
        </div>
      </div>

      {/* RED-TAG (only if caller permitted) */}
      {canRedTag && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            background: redTag ? C.redB : "transparent",
            border: `1px solid ${redTag ? C.red : C.border}`,
            borderRadius: 4,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: redTag ? C.red : C.text }}>
            <input type="checkbox" checked={redTag} onChange={(e) => setRedTag(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.red }} />
            ALSO RED-TAG THIS VEHICLE (OUT OF SERVICE)
          </label>
          {redTag && (
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>RED-TAG REASON (defaults to the description above)</label>
              <input
                style={inputStyle}
                value={redTagReason}
                onChange={(e) => setRedTagReason(e.target.value)}
                placeholder="Why this vehicle is out of service…"
              />
            </div>
          )}
        </div>
      )}

      {/* NOTES (optional) */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>ADDITIONAL NOTES (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else the mechanic should know…"
          style={{ ...inputStyle, minHeight: 50, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      {/* ERROR */}
      {error && <div style={{ padding: 10, background: C.redB, color: C.red, fontSize: 13, fontWeight: 600, borderRadius: 4, marginBottom: 12 }}>{error}</div>}

      {/* SUBMIT */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={submit} disabled={submitting}>
          {submitting ? "FILING…" : "FILE REQUEST"}
        </Btn>
        <Btn variant="ghost" onClick={() => navigate(-1)}>
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

export default RepairRequestForm;
