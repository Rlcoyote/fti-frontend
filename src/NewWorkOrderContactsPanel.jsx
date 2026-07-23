import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import SmsConsentCheckbox from "./SmsConsentCheckbox.jsx";

// ─── NewWorkOrderContactsPanel (v28.102 — ship 9 of NewWorkOrderModal split) ───────────
// The CONTACT INFORMATION panel — the biggest single chunk of the modal.
// Holds the POC sub-panel (picker + 4 form fields + SMS consent) and
// the Approver sub-panel (picker + 4 form fields + SMS consent).
//
// Two pickers, intentionally asymmetric:
//
//   POC picker        — includes 4 categories: poc, site_rep,
//                       site_manager (legacy), company_man (legacy).
//                       Site Manager / Company Man / DSM all
//                       canonicalize to `site_rep` per the v28.72
//                       migration (Reggie's call: "Site Mgr / Co Man /
//                       DSM all mean the same thing — they're all
//                       on-site reps"). Legacy values still appear in
//                       pre-migration rows so they're kept in the
//                       filter as a safety net + tagged "(legacy)".
//
//   Approver picker   — ONLY category=approver. v28.79 fixed a bug
//                       where the previous filter accidentally
//                       included role_tag === "company_man" here,
//                       which was wrong — Co Man is a site-rep role,
//                       NOT an Approver. Keep this filter narrow.
//
// applyContact() lives inside this component because it only writes to
// fields this component owns (parent passes the setters down).
//
// `data-error="contactFirst"` / `data-error="contactLast"` / etc.
// attributes preserved so parent's scroll-to-error in validateAndCreate
// still finds them.
//
// formatPhone is passed in as a prop — same source-of-truth as the
// parent's other phone-formatted fields.

// Local picker helpers. Match the same shape v28.79 set up in the
// inline version. Pulled into the file so call sites read cleanly.
const contactCategory = (c) => c?.category || c?.role_tag;
const isPocCategory = (cat) => ["poc", "site_rep", "site_manager", "company_man"].includes(cat);
const isApproverCategory = (cat) => cat === "approver";

export default function NewWorkOrderContactsPanel({
  knownContacts,
  // POC
  contactFirst,
  setContactFirst,
  contactLast,
  setContactLast,
  phone,
  setPhone,
  email,
  setEmail,
  pocConsentIntent,
  setPocConsentIntent,
  // Approver
  approver,
  setApprover,
  approverLast,
  setApproverLast,
  approverPhone,
  setApproverPhone,
  approverEmail,
  setApproverEmail,
  approverConsentIntent,
  setApproverConsentIntent,
  // Validation
  errors,
  clearError,
  // Phone formatter (same shape as parent's)
  formatPhone,
}) {
  const applyContact = (c) => {
    const cat = contactCategory(c);
    const phoneForApply = c.phone_work || c.phone || "";
    if (isPocCategory(cat)) {
      setContactFirst(c.name.split(" ")[0] || "");
      setContactLast(c.name.split(" ").slice(1).join(" ") || "");
      setPhone(phoneForApply);
      setEmail(c.email || "");
    }
    if (isApproverCategory(cat)) {
      setApprover(c.name.split(" ")[0] || "");
      setApproverLast(c.name.split(" ").slice(1).join(" ") || "");
      setApproverPhone(phoneForApply);
      setApproverEmail(c.email || "");
    }
  };

  const pocOptions = knownContacts.filter((c) => c.is_active !== false && isPocCategory(contactCategory(c)));
  const approverOptions = knownContacts.filter((c) => c.is_active !== false && isApproverCategory(contactCategory(c)));

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>CONTACT INFORMATION</div>

      {/* Point of Contact */}
      <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>POINT OF CONTACT</div>
      {pocOptions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>EXISTING POC FOR THIS CUSTOMER</label>
          <select
            style={{ ...inputStyle, maxWidth: 420 }}
            defaultValue=""
            onChange={(e) => {
              const c = pocOptions.find((o) => String(o.id) === e.target.value);
              if (c) applyContact(c);
              e.target.value = ""; // reset so same selection can be chosen again after edits
            }}
          >
            <option value="">— Choose existing contact or enter new below —</option>
            {pocOptions.map((c) => {
              const cat = contactCategory(c);
              const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
              const phonePart = c.phone_work || c.phone ? ` · ${c.phone_work || c.phone}` : "";
              const legacyTag = ["site_manager", "company_man"].includes(cat) ? " (legacy)" : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {titlePart}
                  {phonePart}
                  {legacyTag}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>FIRST NAME *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.contactFirst ? C.red : C.border }}
            value={contactFirst}
            onChange={(e) => {
              setContactFirst(e.target.value);
              if (clearError) clearError("contactFirst");
            }}
            placeholder="First"
          />
          {errors.contactFirst && (
            <div data-error="contactFirst" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.contactFirst}
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>LAST NAME *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.contactLast ? C.red : C.border }}
            value={contactLast}
            onChange={(e) => {
              setContactLast(e.target.value);
              if (clearError) clearError("contactLast");
            }}
            placeholder="Last"
          />
          {errors.contactLast && (
            <div data-error="contactLast" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.contactLast}
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>PHONE *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.phone ? C.red : C.border }}
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              if (clearError) clearError("phone");
            }}
            placeholder="555-555-5555"
          />
          {errors.phone && (
            <div data-error="phone" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.phone}
            </div>
          )}
          <SmsConsentCheckbox phone={phone} recipientType="customer_rep" consentIntent={pocConsentIntent} setConsentIntent={setPocConsentIntent} />
        </div>
        <div>
          <label style={labelStyle}>EMAIL</label>
          <input
            style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (clearError) clearError("email");
            }}
            placeholder="sitemanager@company.com"
          />
          {errors.email && (
            <div data-error="email" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
              {errors.email}
            </div>
          )}
        </div>
      </div>

      {/* Approver */}
      <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>APPROVER</div>
      {approverOptions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>EXISTING APPROVER FOR THIS CUSTOMER</label>
          <select
            style={{ ...inputStyle, maxWidth: 420 }}
            defaultValue=""
            onChange={(e) => {
              const c = approverOptions.find((o) => String(o.id) === e.target.value);
              if (c) applyContact(c);
              e.target.value = "";
            }}
          >
            <option value="">— Choose existing approver or enter new below —</option>
            {approverOptions.map((c) => {
              const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
              const phonePart = c.phone_work || c.phone ? ` · ${c.phone_work || c.phone}` : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {titlePart}
                  {phonePart}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <div>
          <label style={labelStyle}>FIRST NAME</label>
          <input style={inputStyle} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="First" />
        </div>
        <div>
          <label style={labelStyle}>LAST NAME</label>
          <input style={inputStyle} value={approverLast} onChange={(e) => setApproverLast(e.target.value)} placeholder="Last" />
        </div>
        <div>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={approverPhone} onChange={(e) => setApproverPhone(formatPhone(e.target.value))} placeholder="555-555-5555" />
          <SmsConsentCheckbox
            phone={approverPhone}
            recipientType="customer_rep"
            consentIntent={approverConsentIntent}
            setConsentIntent={setApproverConsentIntent}
          />
        </div>
        <div>
          <label style={labelStyle}>EMAIL</label>
          <input
            style={{ ...inputStyle, borderColor: errors.approverEmail ? C.red : C.border }}
            value={approverEmail}
            onChange={(e) => {
              setApproverEmail(e.target.value);
              if (clearError) clearError("approverEmail");
            }}
            placeholder="approver@company.com"
          />
          {errors.approverEmail && (
            <div data-error="approverEmail" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
              {errors.approverEmail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
