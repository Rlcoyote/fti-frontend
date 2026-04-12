import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// Owner-only modal for managing emergency contacts displayed on JSA forms.
// Contacts are stored as a JSON array in app_settings under the key
// "emergency_contacts". Each contact has a label (e.g., "AIRLIFE") and
// a phone number. The JSA reads these from Context settings.

function EmergencyContactsModal({ onClose }) {
  const { currentUser, settings, refreshSettings } = useApp();
  const isOwner = currentUser?.role === "owner";

  const [contacts, setContacts] = useState(() => {
    try {
      const parsed = JSON.parse(settings?.emergency_contacts || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const parsed = JSON.parse(settings?.emergency_contacts || "[]");
      if (Array.isArray(parsed)) setContacts(parsed);
    } catch { /* keep current state */ }
  }, [settings]);

  const updateContact = (i, field, value) => {
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const addContact = () => {
    if (contacts.length >= 10) return;
    setContacts(prev => [...prev, { label: "", phone: "" }]);
  };

  const removeContact = (i) => {
    setContacts(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergency_contacts: JSON.stringify(contacts) }),
      });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>EMERGENCY CONTACTS</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
          Displayed on JSA forms. Add emergency phone numbers for air life, life flight, local hospitals, or any custom contact. Owner-only.
        </div>

        {contacts.map((c, i) => (
          <div key={i} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 10, display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>LABEL</label>
              <input style={inputStyle} value={c.label}
                onChange={e => updateContact(i, "label", e.target.value)}
                placeholder="AIRLIFE" readOnly={!isOwner} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PHONE NUMBER</label>
              <input style={inputStyle} value={c.phone}
                onChange={e => updateContact(i, "phone", e.target.value)}
                placeholder="800-627-2376" readOnly={!isOwner} />
            </div>
            {isOwner && (
              <button type="button" onClick={() => removeContact(i)}
                style={{ background: "transparent", color: C.red, border: `1px solid ${C.red}`, borderRadius: 4, padding: "6px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginBottom: 1 }}>
                REMOVE
              </button>
            )}
          </div>
        ))}

        {isOwner && contacts.length < 10 && (
          <button type="button" onClick={addContact}
            style={{ background: "transparent", color: C.blue, border: `1px dashed ${C.blue}`, borderRadius: 4, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 14 }}>
            + ADD EMERGENCY CONTACT
          </button>
        )}

        {error && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>⚠ {error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && <Btn onClick={handleSave}>{saved ? "SAVED ✓" : "SAVE"}</Btn>}
          <Btn variant="ghost" onClick={onClose}>CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}

export default EmergencyContactsModal;
