import { useState } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── NewJobGooglePin (v28.101 — ship 8 of NewJobModal split) ───────────────
// Google Maps pin input + RESOLVE button + resolved-coordinate display.
// Owns the two-step async (resolve URL → coordinates; then geocode →
// state/county) but the state/county side-effect is callbacks-up to the
// parent so this component doesn't reach across concerns.
//
// Cross-concern with NewJobLocationPanel (ship 7):
//   When the resolve succeeds AND the geocoder returns state/county,
//   we call onResolveSuccess({ state, county }) and the parent writes
//   them with stateLockedByPin / countyLockedByPin set to true. When
//   the user edits the pin input afterward, onResolveClear() fires and
//   the parent unlocks both fields. Lat/lng stay in parent state (the
//   create payload reads them) — passed back via setters.
//
// Two-step async preserved verbatim:
//   1. POST /jobs/resolve-map-pin { url } → { lat, lng }
//   2. POST /jobs/geocode { lat, lng } → { state, county }
//
// Step 2 failure is non-fatal — the pin still resolves to coordinates;
// the user just types state+county manually. Step 1 failure surfaces
// "Could not resolve pin link" inline.
//
// pinResolving + pinError stay local-to-this-component (parent doesn't
// need them). The user clears the error implicitly by editing the pin.

export default function NewJobGooglePin({ googlePin, setGooglePin, pinLat, setPinLat, pinLng, setPinLng, onResolveSuccess, onResolveClear }) {
  const [pinResolving, setPinResolving] = useState(false);
  const [pinError, setPinError] = useState("");

  const resolvePin = async (pinUrl) => {
    if (!pinUrl.trim()) return;
    setPinResolving(true);
    setPinError("");
    try {
      // Step 1: resolve short URL to coordinates via existing backend resolver
      const resolveR = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinUrl.trim() }),
      });
      if (!resolveR.ok) {
        setPinError("Could not resolve pin link. Check the URL and try again.");
        setPinResolving(false);
        return;
      }
      const { lat, lng } = await resolveR.json();
      if (!lat || !lng) {
        setPinError("No coordinates found in this link.");
        setPinResolving(false);
        return;
      }
      setPinLat(lat);
      setPinLng(lng);
      // Step 2: geocode coordinates → state + county
      const geoR = await fetch(`${API_URL}/jobs/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (geoR.ok) {
        const { state, county } = await geoR.json();
        if (onResolveSuccess) onResolveSuccess({ state, county });
      }
    } catch {
      setPinError("Network error resolving pin. Try again.");
    }
    setPinResolving(false);
  };

  const handlePinChange = (val) => {
    setGooglePin(val);
    setPinLat(null);
    setPinLng(null);
    setPinError("");
    if (onResolveClear) onResolveClear();
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>
        GOOGLE PIN <span style={{ fontSize: 10, color: C.muted, fontWeight: 400, letterSpacing: 0 }}>— Google Maps links only</span>
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input
          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
          value={googlePin}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="Paste Google Maps link..."
        />
        <button
          type="button"
          onClick={() => resolvePin(googlePin)}
          disabled={!googlePin.trim() || pinResolving}
          style={{
            background: googlePin.trim() ? C.blue : C.steel,
            color: googlePin.trim() ? C.white : C.muted,
            border: "none",
            borderRadius: 4,
            padding: "8px 14px",
            fontSize: 11,
            fontWeight: 700,
            cursor: googlePin.trim() ? "pointer" : "default",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {pinResolving ? "Resolving..." : "RESOLVE"}
        </button>
      </div>
      {pinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {pinError}</div>}
      {pinLat && pinLng && (
        <div style={{ marginTop: 6, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>✓ PIN RESOLVED</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
            {parseFloat(pinLat).toFixed(6)}, {parseFloat(pinLng).toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${pinLat},${pinLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none" }}
          >
            View on Google Maps ↗
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(googlePin || `${pinLat},${pinLng}`);
            }}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 700,
              color: C.muted,
              cursor: "pointer",
            }}
          >
            COPY PIN
          </button>
        </div>
      )}
    </div>
  );
}
