import { useEffect, useMemo, useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Employees master page (v27.57 polish) ──────────────────────────────────
// Owner/admin-only. Authoritative CRUD source for the users table in its role
// as the employee master. PIN is never entered here — admins send a setup
// link, the employee picks their own PIN on the landing page.
//
// v27.57 changes: first/last name split, phone formatter, job title dropdown,
// role dropdown without "owner", hourly rate + hire date validation, email
// regex, modal close only via Cancel button, all confirmations and results
// in styled modals (no browser confirm() or transient toasts).

// Role list comes from /api/config/roles via AppContext (see roles.allowedForEmployee).
// Owner is excluded there (promoted via Users page only). Single source of truth;
// previously drift-prone local ROLE_OPTIONS const was removed in v27.64.
// Job titles come from /api/job-titles (admin-managed in its own page) so that
// white-labeled installs can curate their own list without code changes.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_HOURLY_RATE = 199.99;

const formatPhone = (raw) => {
  const d = String(raw || "").replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const phoneDigits = (raw) => String(raw || "").replace(/\D/g, "");
const todayYmd = () => new Date().toISOString().slice(0, 10);

function EmployeesPage() {
  const { currentUser, roles } = useApp();
  const [employees, setEmployees] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | employeeObject
  const [confirmAction, setConfirmAction] = useState(null); // { kind, employee, onYes }
  const [notice, setNotice] = useState(null); // { title, message, variant }

  const canEdit = ["owner", "admin"].includes(currentUser?.role);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/employees${includeInactive ? "?include_inactive=true" : ""}`);
      if (r.ok) setEmployees(await r.json());
    } catch (err) { console.error("Fetch employees failed:", err); }
    setLoading(false);
  };

  const fetchJobTitles = async () => {
    try {
      const r = await fetch(`${API_URL}/job-titles`);
      if (r.ok) setJobTitles(await r.json());
    } catch (err) { console.error("Fetch job titles failed:", err); }
  };

  useEffect(() => { fetchEmployees(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [includeInactive]);
  useEffect(() => { fetchJobTitles(); }, []);

  const showNotice = (title, message, variant = "ok") => setNotice({ title, message, variant });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      (e.name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.qb_employee_id || "").toLowerCase().includes(q) ||
      (e.job_title || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const sendPinSetup = async (employee) => {
    try {
      const r = await fetch(`${API_URL}/employees/${employee.id}/send-pin-setup`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showNotice("Send failed", data.error || "Could not send PIN setup email.", "error"); return; }
      showNotice("PIN setup email sent", `A setup link was emailed to ${data.email}. The link expires in 7 days and can only be used once.`);
      fetchEmployees();
    } catch (err) { showNotice("Send failed", err.message, "error"); }
  };

  const resetPin = async (employee) => {
    try {
      const r = await fetch(`${API_URL}/employees/${employee.id}/reset-pin`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showNotice("Reset failed", data.error || "Could not reset PIN.", "error"); return; }
      showNotice("PIN reset", `${employee.name}'s PIN has been cleared. A new setup link was emailed to ${data.email}. The link expires in 7 days and can only be used once.`);
      fetchEmployees();
    } catch (err) { showNotice("Reset failed", err.message, "error"); }
  };

  const deactivate = async (employee) => {
    try {
      const r = await fetch(`${API_URL}/employees/${employee.id}/deactivate`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showNotice("Deactivate failed", data.error || "Could not deactivate.", "error"); return; }
      showNotice("Employee deactivated", `${employee.name} has been deactivated. Historical references (audit logs, ticket crew) remain intact. Their email is now free to reuse.`);
      fetchEmployees();
    } catch (err) { showNotice("Deactivate failed", err.message, "error"); }
  };

  if (!canEdit) {
    return <div style={{ padding: 32, color: C.muted }}>You need owner or admin access to view this page.</div>;
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Employees</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Master employee roster. PIN setup links email directly to each employee — admins never see or type a PIN.
          </div>
        </div>
        <Btn variant="blue" onClick={() => setEditing("new")}>+ Add Employee</Btn>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, maxWidth: 320 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, QB ID, or title..."
        />
        <label style={{ fontSize: 12, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} style={{ accentColor: C.blue }} />
          Show inactive
        </label>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
          {filtered.length} of {employees.length} shown
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No employees match.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "auto" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={{ ...thStyle, whiteSpace: "nowrap" }}>Phone</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>QB ID</th>
                <th style={thStyle}>PIN</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, minWidth: 240, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: e.is_active ? "transparent" : "#f6f6f8" }}>
                  <td style={tdStyle}><strong>{e.name}</strong></td>
                  <td style={tdStyle}>{e.email || <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {e.phone ? formatPhone(e.phone) : <span style={{ color: C.muted }}>—</span>}
                  </td>
                  <td style={tdStyle}>{e.role}</td>
                  <td style={tdStyle}>{e.job_title || <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={tdStyle}>{e.qb_employee_id || <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={tdStyle}>
                    {e.pin_set
                      ? <span style={{ color: C.green, fontWeight: 700, fontSize: 11 }}>SET</span>
                      : <span style={{ color: C.muted, fontSize: 11 }}>not set</span>}
                  </td>
                  <td style={tdStyle}>
                    {e.is_active
                      ? <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                      : <span style={{ color: C.muted, fontSize: 11 }}>INACTIVE</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {e.is_active && <Btn small variant="ghost" onClick={() => setEditing(e)}>Edit</Btn>}
                      {e.is_active && !e.pin_set && <Btn small variant="blue" onClick={() => sendPinSetup(e)}>Send PIN Setup</Btn>}
                      {e.is_active && e.pin_set && <Btn small variant="ghost" onClick={() => setConfirmAction({
                        kind: "reset_pin",
                        title: "Reset PIN?",
                        message: `${e.name}'s current PIN will be cleared and a new setup link will be emailed to ${e.email}. The new link expires in 7 days and can only be used once.`,
                        yesLabel: "Reset PIN",
                        onYes: () => resetPin(e),
                      })}>Reset PIN</Btn>}
                      {e.is_active && <Btn small onClick={() => setConfirmAction({
                        kind: "deactivate",
                        title: "Deactivate Employee?",
                        message: `${e.name} will be deactivated. Their email address will be released for reuse, any pending PIN setup link will be invalidated, and they will not appear in crew pickers. Historical references in audit logs and ticket crew stay intact.`,
                        yesLabel: "Deactivate",
                        onYes: () => deactivate(e),
                      })}>Deactivate</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EmployeeModal
          mode={editing === "new" ? "new" : "edit"}
          initial={editing === "new" ? {} : editing}
          jobTitles={jobTitles}
          roleOptions={roles?.allowedForEmployee || []}
          onClose={() => setEditing(null)}
          onSaved={(title, message) => {
            setEditing(null);
            showNotice(title, message);
            fetchEmployees();
          }}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          yesLabel={confirmAction.yesLabel}
          onYes={async () => {
            const action = confirmAction;
            setConfirmAction(null);
            await action.onYes();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {notice && (
        <NoticeModal
          title={notice.title}
          message={notice.message}
          variant={notice.variant}
          onClose={() => setNotice(null)}
        />
      )}
    </div>
  );
}

const thStyle = { padding: "10px 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.muted, textTransform: "uppercase" };
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

function EmployeeModal({ mode, initial, jobTitles = [], roleOptions = [], onClose, onSaved }) {
  const titleNames = jobTitles.map(t => t.name);
  const [firstName, setFirstName] = useState(initial.first_name || "");
  const [lastName, setLastName] = useState(initial.last_name || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone ? formatPhone(initial.phone) : "");
  const [role, setRole] = useState(initial.role || "field");
  const [qbId, setQbId] = useState(initial.qb_employee_id || "");
  // Job title must come from the admin-managed list — no free-text fallback.
  // If an existing employee's title was deactivated, the dropdown defaults to
  // blank and the admin must either re-activate that title on the Job Titles
  // page or pick a different one. Keeps the roster clean.
  const initialTitleKnown = initial.job_title && titleNames.includes(initial.job_title);
  const [jobTitle, setJobTitle] = useState(initialTitleKnown ? initial.job_title : "");
  const [hourlyRate, setHourlyRate] = useState(initial.hourly_rate != null ? String(initial.hourly_rate) : "");
  const [hireDate, setHireDate] = useState(initial.hire_date ? String(initial.hire_date).slice(0, 10) : "");
  const [sendPinAfterCreate, setSendPinAfterCreate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isOwnerLocked = mode === "edit" && initial.role === "owner"; // editing an existing owner — don't let the Employees page change their role

  const validate = () => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_RE.test(email.trim())) return "Email format is invalid (expected e.g. name@company.com).";
    const phoneD = phoneDigits(phone);
    if (!phoneD) return "Phone is required.";
    if (phoneD.length !== 10) return "Phone must be a complete 10-digit US number.";
    if (!role) return "Role is required.";
    if (!qbId.trim()) return "QB Employee ID is required.";
    if (!jobTitle) return "Job title is required — pick one from the list, or ask an owner/admin to add it on the Job Titles page.";
    if (!hireDate) return "Hire date is required.";
    if (hireDate > todayYmd()) return "Hire date cannot be in the future.";
    if (hourlyRate !== "") {
      const n = Number(hourlyRate);
      if (!Number.isFinite(n) || n <= 0) return "Hourly rate must be a positive number.";
      if (n > MAX_HOURLY_RATE) return `Hourly rate must be ≤ $${MAX_HOURLY_RATE}/hr.`;
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phoneDigits(phone),
        role: isOwnerLocked ? undefined : role,
        qb_employee_id: qbId.trim(),
        job_title: jobTitle,
        hourly_rate: hourlyRate !== "" ? Number(hourlyRate) : null,
        hire_date: hireDate,
      };
      const url = mode === "new" ? `${API_URL}/employees` : `${API_URL}/employees/${initial.id}`;
      const method = mode === "new" ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setFormError(data.error || "Save failed."); setSubmitting(false); return; }

      if (mode === "new" && sendPinAfterCreate) {
        await fetch(`${API_URL}/employees/${data.id}/send-pin-setup`, { method: "POST" }).catch(() => {});
        onSaved("Employee added", `${data.name} has been added to the roster and a PIN setup email was sent to ${data.email}. The link expires in 7 days and can only be used once.`);
      } else if (mode === "new") {
        onSaved("Employee added", `${data.name} has been added to the roster. PIN setup has not been sent — use the 'Send PIN Setup' button on the row when you're ready.`);
      } else {
        onSaved("Employee updated", `${data.name}'s profile has been updated.`);
      }
    } catch (err) {
      setFormError("Save failed: " + err.message);
      setSubmitting(false);
    }
  };

  // Modal close ONLY via Cancel button — backdrop click does nothing to prevent
  // accidental loss of entered data (Article X — dummy-proof).
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>
          {mode === "new" ? "Add Employee" : `Edit ${initial.name}`}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="First Name *"><input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} /></Field>
          <Field label="Last Name *"><input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} /></Field>
          <Field label="Email *"><input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field label="Phone *">
            <input
              style={inputStyle}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="(XXX) XXX-XXXX"
            />
          </Field>
          <Field label="Role *">
            {isOwnerLocked ? (
              <div style={{ ...inputStyle, background: C.steel, color: C.muted, cursor: "not-allowed" }}>owner (locked — change via Users page)</div>
            ) : (
              <select style={{ ...inputStyle }} value={role} onChange={e => setRole(e.target.value)}>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </Field>
          <Field label="QB Employee ID *">
            <input style={inputStyle} value={qbId} onChange={e => setQbId(e.target.value)} placeholder="e.g. E-001 or QB internal ID" />
          </Field>
          <Field label="Job Title *">
            <select style={inputStyle} value={jobTitle} onChange={e => setJobTitle(e.target.value)}>
              <option value="">— Select —</option>
              {titleNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {titleNames.length === 0 && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>
                No active titles. Ask an owner/admin to add one on the Job Titles page.
              </div>
            )}
          </Field>
          <Field label="Hire Date *">
            <input style={inputStyle} type="date" value={hireDate} max={todayYmd()} onChange={e => setHireDate(e.target.value)} />
          </Field>
          <Field label={`Hourly Rate (optional, max $${MAX_HOURLY_RATE})`}>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              min="0.01"
              max={MAX_HOURLY_RATE}
              value={hourlyRate}
              onChange={e => setHourlyRate(e.target.value)}
              placeholder="(optional)"
            />
          </Field>
        </div>

        {mode === "new" && (
          <div style={{ marginTop: 18, padding: "10px 14px", background: "#e8f0fb", borderRadius: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={sendPinAfterCreate} onChange={e => setSendPinAfterCreate(e.target.checked)} style={{ accentColor: C.blue, width: 16, height: 16 }} />
              Email PIN setup link immediately after creating the employee
            </label>
          </div>
        )}

        {formError && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#fdecea", color: C.red, borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
            {formError}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <Btn variant="blue" onClick={submit} disabled={submitting}>{submitting ? "Saving…" : (mode === "new" ? "Create Employee" : "Save Changes")}</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

export default EmployeesPage;
