import { inputStyle, labelStyle } from "./SharedUI.jsx";
import SmsConsentCheckbox from "./SmsConsentCheckbox.jsx";

// ─── EditJobContactGrid (v28.144 — ship 4 of the EditJobModal split) ───────
// One 4-field contact grid — FIRST / LAST / PHONE / EMAIL, with the SMS
// consent checkbox under PHONE. EditJobModal renders it twice: once for the
// Point of Contact, once for the Approver. Those were two near-identical
// blocks before this extraction, so this is both a split and a dedup.
//
// formatPhone lives here now — EditJobModal's only callers were these two
// grids, so it moved in with them.

function formatPhone(val) {
  const d = val.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function EditJobContactGrid({ first, setFirst, last, setLast, phone, setPhone, email, setEmail, consentIntent, setConsentIntent }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
      <div>
        <label style={labelStyle}>FIRST</label>
        <input style={inputStyle} value={first} onChange={(e) => setFirst(e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>LAST</label>
        <input style={inputStyle} value={last} onChange={(e) => setLast(e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>PHONE</label>
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="555-555-5555" />
        <SmsConsentCheckbox phone={phone} recipientType="customer_rep" consentIntent={consentIntent} setConsentIntent={setConsentIntent} />
      </div>
      <div>
        <label style={labelStyle}>EMAIL</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@co.com" />
      </div>
    </div>
  );
}

export default EditJobContactGrid;
