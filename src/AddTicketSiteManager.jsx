import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── AddTicketSiteManager (v28.61 — extracted from AddTicketModal) ────────────
// Site Manager section: First/Last/Phone/Email inputs + "Copy Point of
// Contact Info" shortcut button. Sits between the date/time fields and
// the Crew Selection section in the AddTicket main form.
//
// Per CAM XXV: receives the 4 input values + 4 setters + the job for the
// optional Copy POC button. Stateless; controlled.

export default function AddTicketSiteManager({ job, smFirst, smLast, smPhone, smEmail, setSmFirst, setSmLast, setSmPhone, setSmEmail }) {
  const hasPocSource = job && (job.contactFirst || job.contactLast);
  const copyPoc = () => {
    setSmFirst(job.contactFirst || "");
    setSmLast(job.contactLast || "");
    setSmPhone(job.pocPhone || job.poc_phone || "");
    setSmEmail(job.pocEmail || job.poc_email || "");
  };
  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
        {hasPocSource && (
          <span
            onClick={copyPoc}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: C.blue,
              fontWeight: 700,
              cursor: "pointer",
              padding: "3px 10px",
              border: `1px solid ${C.blue}44`,
              borderRadius: 4,
              background: "transparent",
            }}
          >
            <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={labelStyle}>FIRST NAME</label>
          <input style={inputStyle} value={smFirst} onChange={(e) => setSmFirst(e.target.value)} placeholder="First" />
        </div>
        <div>
          <label style={labelStyle}>LAST NAME</label>
          <input style={inputStyle} value={smLast} onChange={(e) => setSmLast(e.target.value)} placeholder="Last" />
        </div>
        <div>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={smPhone} onChange={(e) => setSmPhone(e.target.value)} placeholder="555-555-5555" />
        </div>
        <div>
          <label style={labelStyle}>EMAIL</label>
          <input style={inputStyle} value={smEmail} onChange={(e) => setSmEmail(e.target.value)} placeholder="email@company.com" />
        </div>
      </div>
    </div>
  );
}
