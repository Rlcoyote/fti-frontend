import { useState } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── WellPinPaste (v28.182) ─────────────────────────────────────────────────
// Compact per-well version of NewJobGooglePin. Used inside NewJobWellsPanel
// + EditJobDetailFields when a well overrides the WO's primary pin (the
// "Use same location as the work order pin" checkbox is unchecked).
//
// Why a separate component rather than reusing NewJobGooglePin: NewJobGooglePin
// is sized for the WO-level LOCATION block — full width, separate label,
// resolves state + county too. A per-well override only needs lat/lng (state
// + county are owned by the parent WO), and the row needs a compact UI that
// fits inside a well-row card. Same /api/jobs/resolve-map-pin call; smaller
// surface.
//
// Crews paste a Google Maps share link → RESOLVE → pinLat / pinLng populate.
// Raw lat/lng entry is intentionally NOT exposed here (per Reggie 2026-05-21:
// "Nobody especially crews, knows exactly how to enter the lat lon correctly.
// It's almost invariably wrong every time someone attempts it — including me").

export default function WellPinPaste({ pinLat, pinLng, setPinLat, setPinLng }) {
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const handleUrlChange = (v) => {
    setUrl(v);
    setError("");
    // If the user is typing a new URL, clear any previously-resolved pin so
    // they don't accidentally save a stale pin paired with a new URL string.
    if (pinLat || pinLng) {
      setPinLat(null);
      setPinLng(null);
    }
  };

  const resolve = async () => {
    if (!url.trim()) return;
    setResolving(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!r.ok) {
        setError("Could not resolve pin link. Check the URL and try again.");
        setResolving(false);
        return;
      }
      const data = await r.json();
      if (!data.lat || !data.lng) {
        setError("No coordinates found in this link.");
        setResolving(false);
        return;
      }
      setPinLat(data.lat);
      setPinLng(data.lng);
    } catch {
      setError("Network error resolving pin. Try again.");
    }
    setResolving(false);
  };

  const clear = () => {
    setUrl("");
    setPinLat(null);
    setPinLng(null);
    setError("");
  };

  return (
    <div>
      <label style={{ ...labelStyle, fontSize: 10 }}>WELL GOOGLE PIN</label>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input
          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="Paste Google Maps link…"
        />
        <button
          type="button"
          onClick={resolve}
          disabled={!url.trim() || resolving}
          style={{
            background: url.trim() ? C.blue : C.steel,
            color: url.trim() ? C.white : C.muted,
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: url.trim() ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >
          {resolving ? "…" : "RESOLVE"}
        </button>
      </div>
      {error && <div style={{ fontSize: 10, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {error}</div>}
      {pinLat && pinLng && (
        <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>✓ PIN RESOLVED</span>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
            {parseFloat(pinLat).toFixed(6)}, {parseFloat(pinLng).toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${pinLat},${pinLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: C.blue, textDecoration: "none", fontWeight: 700 }}
          >
            VIEW ↗
          </a>
          <button
            type="button"
            onClick={clear}
            style={{ background: "transparent", border: "none", color: C.muted, fontSize: 10, cursor: "pointer", fontWeight: 600 }}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}
