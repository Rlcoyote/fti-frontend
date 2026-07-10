import { useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ModalWrap, Z_INDEX } from "./SharedUI.jsx";

// ─── EditPersonModal (v28.17) ──────────────────────────────────────────────
// Unified add/edit modal for the People page. Replaces:
//   - The EmployeesPage modal (profile fields)
//   - The UsersPage inline-row edit (name/email/role/session)
//
// One modal, two sections labeled in the body — no nested tabs:
//   PROFILE: first/last name, email, phone, qb_employee_id, job_title,
//            hire_date, hourly_rate
//   ACCESS:  role (with v27.87 owner-lock), session_timeout_minutes
//
// Auth lifecycle actions (Reset PW, Wipe Bio, Send PIN, Manage Devices,
// etc.) live as row-level buttons in PeoplePage — NOT inside this modal.
// This modal is for editing field values only. Keeping the surfaces
// separate avoids a giant catch-all modal.
//
// Backend:
//   - mode="new"  → POST /api/employees   (full profile creation)
//   - mode="edit" → PUT /api/employees/:id (profile updates)
//                   PLUS a separate PUT /api/users/:id when role changes
//                   (employees route may not refresh user-side fields)
//
// Backdrop click does NOT close (CAM Article X — protect against accidental
// data loss when editing). User must click Cancel or Save explicitly.

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_HOURLY_RATE = 199.99;
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatPhone = (raw) => {
  const d = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const phoneDigits = (raw) => String(raw || "").replace(/\D/g, "");

// Session timeout options match what UsersPage offered.
const SESSION_TIMEOUT_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
  { value: 120, label: "2 hr" },
  { value: 0, label: "No timeout" },
];

function EditPersonModal({ mode, initial = {}, jobTitles = [], roleOptions = [], onClose, onSaved }) {
  const isOwnerLocked = mode === "edit" && initial.role === "owner";

  const [firstName, setFirstName] = useState(initial.first_name || "");
  const [lastName, setLastName] = useState(initial.last_name || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone ? formatPhone(initial.phone) : "");
  const [role, setRole] = useState(initial.role || "field");
  const [qbId, setQbId] = useState(initial.qb_employee_id || "");
  const [jobTitle, setJobTitle] = useState(initial.job_title || "");
  const [hourlyRate, setHourlyRate] = useState(initial.hourly_rate != null ? String(initial.hourly_rate) : "");
  const [hireDate, setHireDate] = useState(initial.hire_date ? String(initial.hire_date).slice(0, 10) : "");
  const [sessionTimeout, setSessionTimeout] = useState(typeof initial.session_timeout_minutes === "number" ? initial.session_timeout_minutes : 30);
  // New-only: send PIN setup link via SMS immediately after create (v28.22)
  const [sendPinAfterCreate, setSendPinAfterCreate] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Active job titles dropdown source. The list excludes inactive titles
  // entirely; if the current employee has a deactivated title stored on
  // their record, the dropdown will be blank and they must pick another.
  const titleNames = (jobTitles || []).filter((t) => t.is_active).map((t) => t.name);
  const initialTitleKnown = initial.job_title && titleNames.includes(initial.job_title);

  const validate = () => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim() || !EMAIL_RE.test(email.trim())) return "A valid email is required.";
    const phoneD = phoneDigits(phone);
    if (!phoneD) return "Phone is required.";
    if (phoneD.length !== 10) return "Phone must be a complete 10-digit US number.";
    if (!role) return "Role is required.";
    if (!qbId.trim()) return "QB Employee ID is required.";
    if (!jobTitle) return "Job title is required — pick one from the list, or ask an owner/admin to add it on the Job Titles page.";
    if (!hireDate) return "Hire date is required.";
    if (hireDate > todayYmd()) return "Hire date cannot be in the future.";
    if (hourlyRate !== "" && hourlyRate != null) {
      const n = Number(hourlyRate);
      if (!Number.isFinite(n) || n <= 0) return "Hourly rate must be a positive number.";
      if (n > MAX_HOURLY_RATE) return `Hourly rate cannot exceed $${MAX_HOURLY_RATE}.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneDigits(phone),
        role: isOwnerLocked ? undefined : role,
        qb_employee_id: qbId.trim(),
        job_title: jobTitle,
        hourly_rate: hourlyRate === "" ? null : Number(hourlyRate),
        hire_date: hireDate,
      };
      const url = mode === "new" ? `${API_URL}/employees` : `${API_URL}/employees/${initial.id}`;
      const method = mode === "new" ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormError(data.error || "Save failed.");
        setSubmitting(false);
        return;
      }
      const savedId = data.id || initial.id;

      // Session timeout writes through the /users endpoint (employees
      // endpoint covers profile fields; users covers session settings).
      // Only fire when changed to avoid noise on the audit log.
      if (mode === "edit" && savedId && sessionTimeout !== initial.session_timeout_minutes) {
        try {
          await fetch(`${API_URL}/users/${savedId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_timeout_minutes: sessionTimeout }),
          });
        } catch {
          /* non-blocking */
        }
      }

      // Send PIN setup text immediately on create (new mode + checkbox).
      // v28.22 — channel is SMS, not email. Silent on failure — the user
      // can use the row's "Send PIN Setup" button to retry.
      if (mode === "new" && sendPinAfterCreate && savedId) {
        try {
          await fetch(`${API_URL}/employees/${savedId}/send-pin-setup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          /* non-blocking */
        }
      }

      const successTitle = mode === "new" ? "Person added" : "Person updated";
      const personName = `${payload.first_name} ${payload.last_name}`;
      const successMsg =
        mode === "new"
          ? sendPinAfterCreate
            ? `${personName} added — a PIN setup text was sent to their phone. They tap the link, register biometric, set PIN. Link expires in 7 days, single-use.`
            : `${personName} added. Use the "Send PIN Setup" button on their row when you're ready to issue their PIN.`
          : `${personName} updated.`;
      onSaved(successTitle, successMsg);
    } catch (err) {
      setFormError("Save failed: " + err.message);
      setSubmitting(false);
    }
  };

  // Section header style — visual separators inside the modal body so
  // PROFILE and ACCESS read as distinct groups without nested tabs.
  const sectionHeader = {
    fontSize: 11,
    fontWeight: 800,
    color: C.muted,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "8px 0 6px",
    borderBottom: `1px solid ${C.border}`,
    marginBottom: 12,
    marginTop: 4,
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.nested} width={600} accent={C.blue}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>
        {mode === "new" ? "Add Person" : `Edit ${initial.first_name || ""} ${initial.last_name || ""}`.trim()}
      </div>

      {/* PROFILE section */}
      <div style={sectionHeader}>Profile</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>First Name *</label>
          <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Last Name *</label>
          <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Phone *</label>
          <input
            type="tel"
            inputMode="numeric"
            style={inputStyle}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(XXX) XXX-XXXX"
          />
        </div>
        <div>
          <label style={labelStyle}>QB Employee ID *</label>
          <input style={inputStyle} value={qbId} onChange={(e) => setQbId(e.target.value)} placeholder="e.g. E-001" />
        </div>
        <div>
          <label style={labelStyle}>Job Title *</label>
          <select style={inputStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
            <option value="">— Select —</option>
            {titleNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {titleNames.length === 0 && (
            <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 600 }}>
              No active titles. Ask an owner/admin to add one on the Job Titles page.
            </div>
          )}
          {mode === "edit" && initial.job_title && !initialTitleKnown && (
            <div style={{ fontSize: 11, color: C.yellow, marginTop: 4, fontWeight: 600 }}>
              Stored title "{initial.job_title}" is now inactive — pick a current option to save changes.
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Hire Date *</label>
          <input type="date" style={inputStyle} value={hireDate} max={todayYmd()} onChange={(e) => setHireDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Hourly Rate (optional, max ${MAX_HOURLY_RATE})</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={MAX_HOURLY_RATE}
            style={inputStyle}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="(optional)"
          />
        </div>
      </div>

      {/* ACCESS section */}
      <div style={sectionHeader}>Access</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Role *</label>
          {isOwnerLocked ? (
            <div
              style={{
                ...inputStyle,
                background: C.steel,
                color: C.muted,
                fontStyle: "italic",
                padding: "8px 10px",
              }}
            >
              owner (locked — change via scripts/change-owner-role.js)
            </div>
          ) : (
            <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>
        {mode === "edit" && (
          <div>
            <label style={labelStyle}>Session Timeout</label>
            <select style={inputStyle} value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value))}>
              {SESSION_TIMEOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* New-mode-only: PIN setup SMS checkbox (v28.22 — SMS, not email) */}
      {mode === "new" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.blueB,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            color: C.text,
            cursor: "pointer",
            marginBottom: 14,
          }}
        >
          <input type="checkbox" checked={sendPinAfterCreate} onChange={(e) => setSendPinAfterCreate(e.target.checked)} style={{ accentColor: C.blue }} />
          Text PIN setup link to their phone immediately after creating the person
        </label>
      )}

      {formError && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 14px",
            background: C.redB,
            color: C.red,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <Btn variant="blue" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : mode === "new" ? "Create Person" : "Save Changes"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default EditPersonModal;
