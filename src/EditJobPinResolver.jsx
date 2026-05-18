import { useState } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle } from "./SharedUI.jsx";

// ─── EditJobPinResolver (v28.143 — ship 3 of the EditJobModal split) ───────
// The Google-pin field for EditJobModal: paste a Maps link, RESOLVE it to
// lat/lng via the backend, and on success reverse-geocode to auto-fill
// State + County. COPY copies the link back out.
//
// Controlled: googlePin / pinLat / pinLng live in the parent — EditJobModal
// needs them for the save payload, the edit-lock auto-save, and dirty
// detection. pinError + resolving are pure pin-local UI state and live here.
// onGeocode(state, county) pushes a successful resolve's reverse-geocoded
// location up to the parent's State / County fields.

function EditJobPinResolver({ googlePin, setGooglePin, pinLat, setPinLat, pinLng, setPinLng, onGeocode }) {
  const [pinError, setPinError] = useState("");
  const [resolving, setResolving] = useState(false);

  const resolve = async () => {
    if (!googlePin.trim()) return;
    setResolving(true);
    setPinError("");
    try {
      const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googlePin.trim() }),
      });
      if (!r.ok) {
        setPinError("Could not resolve pin.");
        setResolving(false);
        return;
      }
      const { lat, lng } = await r.json();
      setPinLat(lat);
      setPinLng(lng);
      // Geocode to state/county
      const geoR = await fetch(`${API_URL}/jobs/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (geoR.ok) {
        const { state, county } = await geoR.json();
        onGeocode(state, county);
      }
    } catch {
      setPinError("Network error.");
    }
    setResolving(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Google Maps links only. Resolving will auto-fill State and County.</div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
        <input
          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
          value={googlePin}
          onChange={(e) => {
            setGooglePin(e.target.value);
            setPinLat(null);
            setPinLng(null);
            setPinError("");
          }}
          placeholder="Paste Google Maps link..."
        />
        <button
          type="button"
          onClick={resolve}
          disabled={!googlePin.trim() || resolving}
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
          {resolving ? "Resolving..." : "RESOLVE"}
        </button>
        {googlePin && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(googlePin)}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            COPY
          </button>
        )}
      </div>
      {pinError && <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>⚠ {pinError}</div>}
      {pinLat && pinLng && (
        <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
          ✓ {parseFloat(pinLat).toFixed(6)}, {parseFloat(pinLng).toFixed(6)}
        </div>
      )}
      {!pinLat && googlePin && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Resolve to update coordinates</div>}
    </div>
  );
}

export default EditJobPinResolver;
