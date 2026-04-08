import { useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

function SettingsModal({ onClose, currentUser }) {
  const [yardAddress, setYardAddress] = useState("");
  const [yardLat, setYardLat] = useState("");
  const [yardLng, setYardLng] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const isOwner = currentUser?.role === "owner";

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setYardAddress(data.yard_address || "");
        setYardLat(data.yard_lat || "");
        setYardLng(data.yard_lng || "");
      })
      .catch(() => {});
  }, []);

  const handleGeocode = async () => {
    if (!yardAddress.trim()) return;
    setGeocoding(true); setError("");
    try {
      const isUrl = yardAddress.trim().startsWith('http');
      if (isUrl) {
        // It's a Google Maps link — resolve via pin resolver
        const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: yardAddress.trim() }),
        });
        if (!r.ok) { setError("Could not resolve Google Maps link."); setGeocoding(false); return; }
        const { lat, lng } = await r.json();
        setYardLat(lat); setYardLng(lng);
      } else {
        // It's a street address — geocode it
        const r = await fetch(`${API_URL}/jobs/geocode-address`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: yardAddress.trim() }),
        });
        if (!r.ok) { setError("Could not geocode address."); setGeocoding(false); return; }
        const { lat, lng } = await r.json();
        setYardLat(lat); setYardLng(lng);
      }
    } catch { setError("Network error. Try again."); }
    setGeocoding(false);
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yard_address: yardAddress, yard_lat: yardLat, yard_lng: yardLng }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save settings."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>SETTINGS</div>

        {/* Yard Location */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>YARD LOCATION</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Used to calculate drive distance and time to job locations. Owner-only.
          </div>
          <label style={labelStyle}>ADDRESS OR GOOGLE MAPS LINK</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={yardAddress}
              onChange={e => { setYardAddress(e.target.value); setYardLat(""); setYardLng(""); }}
              placeholder="123 Main St, Odessa, TX  or  https://maps.app.goo.gl/..."
              readOnly={!isOwner} />
            {isOwner && (
              <button type="button" onClick={handleGeocode} disabled={!yardAddress.trim() || geocoding}
                style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {geocoding ? "..." : "GEOCODE"}
              </button>
            )}
          </div>
          {yardLat && yardLng && (
            <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
              ✓ {parseFloat(yardLat).toFixed(6)}, {parseFloat(yardLng).toFixed(6)}
            </div>
          )}
          {error && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {error}</div>}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && <Btn onClick={handleSave}>{saved ? "SAVED ✓" : "SAVE SETTINGS"}</Btn>}
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PERMISSIONS MODAL ────────────────────────────────────────────────────────
const PERMISSION_CATEGORIES = [
  { key: "view_jobs", label: "View Jobs", group: "Jobs & Tickets" },
  { key: "edit_jobs", label: "Create/Edit Jobs", group: "Jobs & Tickets" },
  { key: "delete_jobs", label: "Delete Jobs", group: "Jobs & Tickets" },
  { key: "edit_tickets", label: "Create/Edit Tickets", group: "Jobs & Tickets" },
  { key: "sign_tickets", label: "Sign Tickets", group: "Ticket Workflow" },
  { key: "approve_tickets", label: "Approve Tickets", group: "Ticket Workflow" },
  { key: "send_to_qb", label: "Send to Accounting", group: "Ticket Workflow" },
  { key: "void_tickets", label: "Void Tickets", group: "Ticket Workflow" },
  { key: "manage_users", label: "Manage Users", group: "Admin & Inventory" },
  { key: "view_inventory", label: "View Inventory", group: "Admin & Inventory" },
  { key: "edit_inventory", label: "Edit Inventory", group: "Admin & Inventory" },
];

const DEFAULT_PERMS = {
  owner: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  admin: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, true])),
  manager: Object.fromEntries(PERMISSION_CATEGORIES.map(p => [p.key, p.key !== "manage_users"])),
  lead: { view_jobs: true, edit_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: true, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  salesman: { view_jobs: true, edit_jobs: false, edit_tickets: false, sign_tickets: false, view_inventory: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
  field: { view_jobs: true, edit_tickets: true, sign_tickets: true, view_inventory: true, edit_jobs: false, delete_jobs: false, approve_tickets: false, send_to_qb: false, void_tickets: false, manage_users: false, edit_inventory: false },
};


export default SettingsModal;
