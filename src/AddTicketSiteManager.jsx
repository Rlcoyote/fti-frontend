import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── AddTicketSiteManager (v28.80 — dropdown picker for known contacts) ────
// Replaces the anonymous "Copy Point of Contact Info" shortcut from v28.61
// with a real existing-contact dropdown sourced from customer_contacts for
// the job's customer. User sees WHO they're about to copy (name + title +
// phone) instead of clicking a blind shortcut.
//
// Filter: category IN ['poc', 'site_rep'] plus legacy role_tag fallbacks
// ('site_manager', 'company_man') — same logic as the NewJobModal POC
// picker (v28.79). site_rep absorbs the old site_manager + company_man +
// DSM values per the v28.72 canonical.
//
// Behavior:
//   - Dropdown starts empty. User can pick OR type manually.
//   - Picking populates name/phone/email + shows "✓ Existing contact" badge.
//   - Editing any field after a pick clears the badge (the entry is no
//     longer pure-from-contact at that point).
//   - Manual entries upsert to customer_contacts on save (handled in
//     AddTicketModal's onSave path, not this component).
//
// Per CAM XXIV (File Split Protocol): receives the 4 input values + 4
// setters + the job. Stateless from the parent's perspective; this
// component manages its own fetched contacts list + selected-contact UI
// state only.

export default function AddTicketSiteManager({ job, smFirst, smLast, smPhone, smEmail, setSmFirst, setSmLast, setSmPhone, setSmEmail }) {
  const customerId = job?.customerId || job?.customer_id || null;
  const [contacts, setContacts] = useState([]);
  const [pickedContactId, setPickedContactId] = useState("");

  // Fetch known contacts when the job/customer becomes available
  useEffect(() => {
    if (!customerId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/customers/${customerId}/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!cancelled) setContacts(list);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Same category-resolution logic as NewJobModal (v28.79). Site Manager
  // for an AddTicket can legitimately come from POC, site_rep, or any
  // legacy on-site role.
  const isSmCategory = (cat) => ["poc", "site_rep", "site_manager", "company_man"].includes(cat);
  const pickerOptions = contacts.filter((c) => {
    if (c.is_active === false) return false;
    const cat = c.category || c.role_tag;
    return isSmCategory(cat);
  });

  const applyContact = (c) => {
    if (!c) return;
    setSmFirst(c.name?.split(" ")[0] || "");
    setSmLast(c.name?.split(" ").slice(1).join(" ") || "");
    setSmPhone(c.phone_work || c.phone || "");
    setSmEmail(c.email || "");
  };

  const handlePick = (e) => {
    const id = e.target.value;
    if (!id) {
      setPickedContactId("");
      return;
    }
    const c = pickerOptions.find((o) => String(o.id) === id);
    if (!c) return;
    applyContact(c);
    setPickedContactId(id);
  };

  // If the user edits a field after picking, the "✓ Existing contact" badge
  // should clear — the form is no longer pure-from-contact.
  const wrapSetter = (setter) => (v) => {
    if (pickedContactId) setPickedContactId("");
    setter(v);
  };

  // Render the picked-contact summary for the "✓ Existing contact" badge
  const pickedContact = pickedContactId ? pickerOptions.find((o) => String(o.id) === pickedContactId) : null;

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
        {pickedContact && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: C.green,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 3,
              background: "#e6f5ec",
              border: `1px solid ${C.green}44`,
            }}
          >
            ✓ Existing contact selected
          </span>
        )}
      </div>

      {/* v28.80 — existing-contact picker. Only renders when (a) we know the
          customerId and (b) the customer has at least one matching contact. */}
      {pickerOptions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>EXISTING SITE MANAGER FOR THIS CUSTOMER</label>
          <select style={{ ...inputStyle, maxWidth: 420 }} value={pickedContactId} onChange={handlePick}>
            <option value="">— Choose existing contact or type manually below —</option>
            {pickerOptions.map((c) => {
              const cat = c.category || c.role_tag;
              const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
              const phonePart = c.phone_work || c.phone ? ` · ${c.phone_work || c.phone}` : "";
              const categoryPart = cat === "poc" ? " (POC)" : cat === "approver" ? " (Approver)" : "";
              const legacyTag = ["site_manager", "company_man"].includes(cat) ? " (legacy)" : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {titlePart}
                  {phonePart}
                  {categoryPart}
                  {legacyTag}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={labelStyle}>FIRST NAME</label>
          <input style={inputStyle} value={smFirst} onChange={(e) => wrapSetter(setSmFirst)(e.target.value)} placeholder="First" />
        </div>
        <div>
          <label style={labelStyle}>LAST NAME</label>
          <input style={inputStyle} value={smLast} onChange={(e) => wrapSetter(setSmLast)(e.target.value)} placeholder="Last" />
        </div>
        <div>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={smPhone} onChange={(e) => wrapSetter(setSmPhone)(e.target.value)} placeholder="555-555-5555" />
        </div>
        <div>
          <label style={labelStyle}>EMAIL</label>
          <input style={inputStyle} value={smEmail} onChange={(e) => wrapSetter(setSmEmail)(e.target.value)} placeholder="email@company.com" />
        </div>
      </div>
    </div>
  );
}
