import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";

// ─── JSALocationPin (v28.157 — ship 4 of the JSAModal split) ──────────────
// The LOCATION PIN field: paste a Google Maps link or raw coordinates,
// resolve them to lat/lng, show the resolved point, and list the nearest
// hospitals. Parsing tries three URL coordinate patterns and a raw
// "lat, lon" form locally first; only an unresolved Maps URL falls back
// to the backend resolver.
//
// lat/lng live in JSAModal — they feed the JSA save payload, the dirty
// check, the weather auto-fetch, and the footer's incomplete-fields hint.
// The pasted-link text (mapLink), the resolving flag, and the hospital
// list are pin-local: they own no payload meaning, so they live here.
// The hospital list re-fetches whenever lat/lng change.

function JSALocationPin({ lat, setLat, lng, setLng }) {
  const [mapLink, setMapLink] = useState(() => (lat && lng ? `${lat}, ${lng}` : ""));
  const [mapResolving, setMapResolving] = useState(false);
  const [mapErr, setMapErr] = useState(""); // v28.231 — surface failed pin resolves
  const [nearbyHospitals, setNearbyHospitals] = useState([]);

  // Auto-fetch nearest hospitals when coordinates are available
  useEffect(() => {
    if (!lat || !lng) {
      setNearbyHospitals([]);
      return;
    }
    fetch(`${API_URL}/safety/nearest-hospital?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : { hospitals: [] }))
      .then((d) => setNearbyHospitals(d.hospitals || []))
      .catch(() => setNearbyHospitals([]));
  }, [lat, lng]);

  return (
    <div>
      <label style={labelStyle}>LOCATION PIN (Paste Google Maps link or coordinates)</label>
      <input
        style={inputStyle}
        value={mapLink}
        onChange={(e) => {
          const val = e.target.value;
          setMapLink(val);
          // Try local parsing first
          let matched = false;
          const patterns = [/[?&@]q?=?([-\d.]+)[,\s]+([-\d.]+)/, /@([-\d.]+),([-\d.]+)/, /\/([-]?\d{1,3}\.\d+),([-]?\d{1,3}\.\d+)/];
          for (const p of patterns) {
            const m = val.match(p);
            if (m) {
              setLat(m[1]);
              setLng(m[2]);
              matched = true;
              break;
            }
          }
          const rawMatch = val.trim().match(/^([-]?\d{1,3}\.\d+)[,\s]+([-]?\d{1,3}\.\d+)$/);
          if (!matched && rawMatch) {
            setLat(rawMatch[1]);
            setLng(rawMatch[2]);
            matched = true;
          }
          // If it's a URL but no coords found, call backend resolver
          if (!matched && (val.includes("maps.app.goo.gl") || val.includes("goo.gl/maps") || val.includes("google.com/maps"))) {
            setMapResolving(true);
            setMapErr("");
            fetch(`${API_URL}/jobs/resolve-map-pin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: val }),
            })
              // v28.231 — fetch doesn't throw on 4xx; check r.ok and surface a
              // failed resolve instead of silently leaving the pin unset.
              .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error || "resolve failed"))))
              .then((data) => {
                if (data.lat && data.lng) {
                  setLat(data.lat);
                  setLng(data.lng);
                } else {
                  setMapErr("Couldn't pull coordinates from that link.");
                }
                setMapResolving(false);
              })
              .catch(() => {
                setMapErr("Couldn't resolve that map link — check it and try again.");
                setMapResolving(false);
              });
          }
        }}
        placeholder="Paste Google Maps link or lat, lon"
      />
      {mapResolving && <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontWeight: 600 }}>Resolving location...</div>}
      {!mapResolving && mapErr && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 600 }}>⚠ {mapErr}</div>}
      {!mapResolving && lat && lng && (
        <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
          <span style={{ color: C.green, fontWeight: 700 }}>
            ✓ Lat: {lat} &nbsp; Lon: {lng}
          </span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.blue, fontWeight: 600, textDecoration: "none" }}
          >
            View on Google Maps ↗
          </a>
        </div>
      )}
      {nearbyHospitals.length > 0 && (
        <div style={{ marginTop: 8, background: "#fdf0f0", border: `1px solid ${C.red}22`, borderRadius: 4, padding: "6px 10px" }}>
          {/* v28.52 — bg #fdf0f0 is always-light pink. Hospital name
              + phone used C.text / C.muted which flip light in dark
              mode and become invisible on pink. Force PANEL_TEXT /
              PANEL_MUTED so the hospital list stays readable in
              both themes. Section header + miles + Directions link
              keep their brand colors (red/blue) — those read fine
              against the pink in either mode. */}
          <div style={{ fontSize: 9, fontWeight: 800, color: C.red, letterSpacing: "0.08em", marginBottom: 4 }}>NEAREST HOSPITALS</div>
          {nearbyHospitals.map((h, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                padding: "2px 0",
                borderBottom: i < nearbyHospitals.length - 1 ? `1px solid ${C.red}10` : "none",
              }}
            >
              <span style={{ fontWeight: 700, color: PANEL_TEXT }}>{h.name}</span>
              {h.phone && <span style={{ color: PANEL_MUTED }}>{h.phone}</span>}
              {h.miles != null && <span style={{ color: C.red, fontWeight: 700 }}>{h.miles} mi</span>}
              <a
                href={`https://www.google.com/maps/dir/${lat},${lng}/${h.lat},${h.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.blue, fontWeight: 600, textDecoration: "none", fontSize: 10 }}
              >
                Directions ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JSALocationPin;
