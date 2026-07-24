import { useState } from "react";
import { resolveMapPin } from "./mapPin.js";
import { C, API_URL } from "./config.js";
import { inputStyle, TINT } from "./SharedUI.jsx";

// ─── TicketGooglePin (v27.77) ───────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Google Pin input + resolver + drive-time
// calculator UI. Parent owns:
//   - pin/lat/lng state (save payload needs them)
//   - driveInfo/driveLoading state (the Time & Mileage band also reads them)
// This component owns only its transient resolving flag + resolve error.
//
// Displays:
// - Pin input with "RESOLVE" button (POSTs to /work-orders/resolve-map-pin)
// - ALT PIN warning when ticket pin differs from the WO pin
// - Resolved coordinates + "View on Google Maps" link
// - "CALC DRIVE" button → fires onCalcDrive callback; parent owns the fetch
//
// Props:
//   editable — read-only rendering when false
//   values — { pin, lat, lng }
//   onChange({ pin, lat, lng }) — partial updates (only included keys)
//   job — parent WO (for work-order pin comparison)
//   driveInfo — drive result or null | { error }
//   driveLoading — true while parent's fetch is in flight
//   onCalcDrive() — trigger parent's drive-distance fetch

function TicketGooglePin({ editable, values, onChange, job, driveInfo, driveLoading, onCalcDrive }) {
  const { pin = "", lat = null, lng = null } = values || {};
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const lblStyle = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };
  const roStyle = { fontSize: 13, color: C.text, padding: "6px 0" };
  const jobPin = job?.googlePin || job?.google_pin || "";
  const pinMismatch = jobPin && pin && pin.trim() !== jobPin.trim();

  const resolvePin = async () => {
    if (!pin.trim()) return;
    setResolving(true);
    setResolveError("");
    const res = await resolveMapPin(pin);
    if (res.ok) onChange({ lat: res.lat, lng: res.lng });
    else setResolveError(res.error);
    setResolving(false);
  };

  return (
    <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={lblStyle}>GOOGLE PIN</div>
        {pinMismatch && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: TINT.yellowText,
              background: TINT.yellowBg,
              border: `1px solid ${TINT.yellowBorder}44`,
              borderRadius: 3,
              padding: "2px 8px",
              letterSpacing: "0.04em",
            }}
          >
            ALT PIN — differs from Work Order
          </span>
        )}
        {jobPin && !pin && <span style={{ fontSize: 10, color: C.muted }}>Work Order: {jobPin.length > 40 ? jobPin.slice(0, 40) + "…" : jobPin}</span>}
      </div>

      {editable ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
            value={pin}
            onChange={(e) => {
              onChange({ pin: e.target.value, lat: null, lng: null });
              setResolveError("");
            }}
            placeholder={jobPin ? "Override Work Order pin or leave blank to use Work Order pin" : "Paste Google Maps link..."}
          />
          {pin && (
            <button
              className="fti-btn"
              type="button"
              onClick={resolvePin}
              disabled={resolving}
              style={{
                background: C.blue,
                color: C.white,
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {resolving ? "..." : "RESOLVE"}
            </button>
          )}
        </div>
      ) : (
        <div style={roStyle}>{pin || (jobPin ? "Using Work Order pin" : "—")}</div>
      )}

      {resolveError && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {resolveError}</div>}

      {(lat || lng) && (
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
          <span>
            {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none", fontFamily: "'Arial', sans-serif" }}
          >
            View on Google Maps ↗
          </a>
        </div>
      )}

      {lat && lng && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          {!driveInfo && !driveLoading && (
            <button
              className="fti-btn"
              type="button"
              onClick={onCalcDrive}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "3px 10px",
                fontSize: 10,
                fontWeight: 700,
                color: C.text,
                cursor: "pointer",
              }}
            >
              CALC DRIVE
            </button>
          )}
          {driveLoading && <span style={{ fontSize: 11, color: C.muted }}>Calculating...</span>}
          {driveInfo && !driveInfo.error && (
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={lblStyle}>DRIVE DISTANCE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.distance}</div>
              </div>
              <div>
                <div style={lblStyle}>EST. DRIVE TIME</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.duration}</div>
              </div>
            </div>
          )}
          {driveInfo?.error && <div style={{ fontSize: 11, color: C.red }}>⚠ {driveInfo.error}</div>}
        </div>
      )}
    </div>
  );
}

export default TicketGooglePin;
