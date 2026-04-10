import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { parseYards } from "./utils.js";

const MAX_YARDS = 5;
const BLANK_YARD = { name: "", address: "", lat: "", lng: "" };

function SettingsModal({ onClose }) {
  const { currentUser, settings, refreshSettings } = useApp();
  const [yards, setYards] = useState(() => parseYards(settings));
  const [geocodingIdx, setGeocodingIdx] = useState(-1);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const isOwner = currentUser?.role === "owner";

  // Re-hydrate local state if Context settings change while modal is open
  // (e.g., someone else refreshes, or the initial Context fetch lands after
  // the modal opened on a cached currentUser).
  useEffect(() => {
    setYards(parseYards(settings));
  }, [settings]);

  const updateYard = (i, field, value) => {
    setYards(prev => prev.map((y, idx) => idx === i ? { ...y, [field]: value, ...(field === "address" ? { lat: "", lng: "" } : {}) } : y));
  };

  const addYard = () => {
    if (yards.length >= MAX_YARDS) return;
    setYards(prev => [...prev, { ...BLANK_YARD, name: `Yard #${prev.length + 1}` }]);
  };

  const removeYard = (i) => {
    if (i === 0) return;
    setYards(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleGeocode = async (i) => {
    const y = yards[i];
    if (!y.address.trim()) return;
    setGeocodingIdx(i); setError("");
    try {
      const isUrl = y.address.trim().startsWith('http');
      const endpoint = isUrl ? "resolve-map-pin" : "geocode-address";
      const body = isUrl ? { url: y.address.trim() } : { address: y.address.trim() };
      const r = await fetch(`${API_URL}/jobs/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setError(`Could not resolve yard ${i + 1}.`); setGeocodingIdx(-1); return; }
      const { lat, lng } = await r.json();
      setYards(prev => prev.map((yy, idx) => idx === i ? { ...yy, lat, lng } : yy));
    } catch { setError("Network error. Try again."); }
    setGeocodingIdx(-1);
  };

  const handleSave = async () => {
    try {
      const payload = {
        yards: JSON.stringify(yards),
        yard_address: yards[0]?.address || "",
        yard_lat: yards[0]?.lat || "",
        yard_lng: yards[0]?.lng || "",
      };
      await fetch(`${API_URL}/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save settings."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>SETTINGS</div>

        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
          Yard locations are used to calculate drive distance and time. Yard #1 is the default for new tickets. Owner-only.
        </div>

        {yards.map((y, i) => (
          <div key={i} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em" }}>
                YARD LOCATION #{i + 1}{i === 0 ? " (DEFAULT)" : ""}
              </div>
              {isOwner && i > 0 && (
                <button type="button" onClick={() => removeYard(i)}
                  style={{ background: "transparent", color: C.red, border: `1px solid ${C.red}`, borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                  REMOVE
                </button>
              )}
            </div>

            <label style={labelStyle}>NAME</label>
            <input style={{ ...inputStyle, marginBottom: 8 }} value={y.name}
              onChange={e => updateYard(i, "name", e.target.value)}
              placeholder="Wickett Yard" readOnly={!isOwner} />

            <label style={labelStyle}>ADDRESS OR GOOGLE MAPS LINK</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={y.address}
                onChange={e => updateYard(i, "address", e.target.value)}
                placeholder="123 Main St, Odessa, TX  or  https://maps.app.goo.gl/..."
                readOnly={!isOwner} />
              {isOwner && (
                <button type="button" onClick={() => handleGeocode(i)} disabled={!y.address.trim() || geocodingIdx === i}
                  style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {geocodingIdx === i ? "..." : "GEOCODE"}
                </button>
              )}
            </div>
            {y.lat && y.lng && (
              <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
                ✓ {parseFloat(y.lat).toFixed(6)}, {parseFloat(y.lng).toFixed(6)}
              </div>
            )}
          </div>
        ))}

        {error && <div style={{ fontSize: 11, color: C.red, marginBottom: 10 }}>⚠ {error}</div>}

        {isOwner && yards.length < MAX_YARDS && (
          <button type="button" onClick={addYard}
            style={{ background: "transparent", color: C.blue, border: `1px dashed ${C.blue}`, borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 16 }}>
            + ADD YARD LOCATION
          </button>
        )}

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
