import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── TicketSiteManager (v27.76) ─────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Controlled component — parent owns the
// siteMgrFirst/Last/Phone/Email state (for inclusion in save payload) and
// passes it down with an onChange(partial) callback.
//
// Features:
// - "Copy Point of Contact Info" quick-fill when the parent WO has a POC
// - Dropdown of existing site-manager / POC contacts for this customer
//   (from knownContacts — role_tag === "site_manager" | "poc")
// - Read-only rendering when editable is false (signed/locked tickets)
//
// Props:
//   editable — boolean. When false, renders values as plain text.
//   values — { first, last, phone, email }
//   onChange(partial) — called with any subset of keys that changed
//   job — parent WO (for POC copy button visibility + values)
//   knownContacts — list of saved customer contacts (for dropdown)

function TicketSiteManager({ editable, values, onChange, job, knownContacts = [] }) {
  const { first = "", last = "", phone = "", email = "" } = values || {};
  const pocOptions = knownContacts.filter(c => c.role_tag === "site_manager" || c.role_tag === "poc");

  const copyPoc = () => onChange({
    first: job?.contactFirst || "",
    last: job?.contactLast || "",
    phone: job?.pocPhone || job?.poc_phone || "",
    email: job?.pocEmail || job?.poc_email || "",
  });

  const pickFromDropdown = (contactId) => {
    const c = pocOptions.find(o => String(o.id) === contactId);
    if (!c) return;
    const parts = (c.name || "").split(" ");
    onChange({
      first: parts[0] || "",
      last: parts.slice(1).join(" ") || "",
      phone: c.phone || "",
      email: c.email || "",
    });
  };

  return (
    <div style={{ background: C.cardBg, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
        {editable && job && (job.contactFirst || job.contactLast) && (
          <span
            onClick={copyPoc}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer", padding: "3px 10px", border: `1px solid ${C.blue}44`, borderRadius: 4, background: "transparent" }}
          >
            <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
          </span>
        )}
      </div>

      {editable && pocOptions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>EXISTING SITE MANAGER / POC FOR THIS CUSTOMER</label>
          <select
            style={{ ...inputStyle, maxWidth: 360 }}
            defaultValue=""
            onChange={e => {
              pickFromDropdown(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">— Choose existing contact or enter new below —</option>
            {pocOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.phone ? ` · ${c.phone}` : ""}{c.role_tag === "poc" ? " (POC)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Field label="FIRST NAME" value={first} editable={editable} onChange={v => onChange({ first: v })} placeholder="First" />
        <Field label="LAST NAME" value={last} editable={editable} onChange={v => onChange({ last: v })} placeholder="Last" />
        <Field label="PHONE" value={phone} editable={editable} onChange={v => onChange({ phone: v })} placeholder="555-555-5555" />
        <Field label="EMAIL" value={email} editable={editable} onChange={v => onChange({ email: v })} placeholder="email@company.com" />
      </div>
    </div>
  );
}

function Field({ label, value, editable, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {editable
        ? <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{value || "—"}</div>
      }
    </div>
  );
}

export default TicketSiteManager;
