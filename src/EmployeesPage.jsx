import { useEffect, useMemo, useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Employees master page (v27.56) ──────────────────────────────────────────
// Owner/admin-only. Serves as the authoritative CRUD source for the users
// table in its role as the employee master. PIN is NEVER entered here — the
// admin sends a setup link, the employee picks their own PIN on first use.
//
// Stack role: this page unblocks ticket-level crew assignment (v27.57),
// JSA signing upgrades (v27.58+), clock-in/out (v27.xx), and the QB API
// integration arc (v27.xx). Everything downstream keys off a complete
// employee roster that lives in one table.

const ROLE_OPTIONS = ["owner", "admin", "manager", "lead", "salesman", "field"];

function EmployeesPage() {
  const { currentUser } = useApp();
  const [employees, setEmployees] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | employeeObject
  const [toast, setToast] = useState(null); // {message, variant}

  const canEdit = ["owner", "admin"].includes(currentUser?.role);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/employees${includeInactive ? "?include_inactive=true" : ""}`);
      if (r.ok) setEmployees(await r.json());
    } catch (err) { console.error("Fetch employees failed:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [includeInactive]);

  const showToast = (message, variant = "ok") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 4000);
  };

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

  const sendPinSetup = async (id) => {
    try {
      const r = await fetch(`${API_URL}/employees/${id}/send-pin-setup`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(data.error || "Send failed", "error"); return; }
      showToast(`Setup link sent to ${data.email}`, "ok");
      fetchEmployees();
    } catch (err) { showToast("Send failed: " + err.message, "error"); }
  };

  const resetPin = async (id) => {
    if (!window.confirm("Reset this employee's PIN? They'll receive a new setup link by email.")) return;
    try {
      const r = await fetch(`${API_URL}/employees/${id}/reset-pin`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(data.error || "Reset failed", "error"); return; }
      showToast(`PIN reset. Setup link sent to ${data.email}`, "ok");
      fetchEmployees();
    } catch (err) { showToast("Reset failed: " + err.message, "error"); }
  };

  const deactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? Their email will be released for reuse and any pending PIN setup link will be invalidated. Historical references (audit logs, ticket crew) remain intact.`)) return;
    try {
      const r = await fetch(`${API_URL}/employees/${id}/deactivate`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(data.error || "Deactivate failed", "error"); return; }
      showToast(`${name} deactivated`, "ok");
      fetchEmployees();
    } catch (err) { showToast("Deactivate failed: " + err.message, "error"); }
  };

  if (!canEdit) {
    return (
      <div style={{ padding: 32, color: C.muted }}>
        You need owner or admin access to view this page.
      </div>
    );
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>QB ID</th>
                <th style={thStyle}>PIN</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: e.is_active ? "transparent" : "#f6f6f8" }}>
                  <td style={tdStyle}><strong>{e.name}</strong></td>
                  <td style={tdStyle}>{e.email || <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={tdStyle}>{e.phone || <span style={{ color: C.muted }}>—</span>}</td>
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
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {e.is_active && <Btn small variant="ghost" onClick={() => setEditing(e)}>Edit</Btn>}
                      {e.is_active && !e.pin_set && <Btn small variant="blue" onClick={() => sendPinSetup(e.id)}>Send PIN Setup</Btn>}
                      {e.is_active && e.pin_set && <Btn small variant="ghost" onClick={() => resetPin(e.id)}>Reset PIN</Btn>}
                      {e.is_active && <Btn small onClick={() => deactivate(e.id, e.name)}>Deactivate</Btn>}
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
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); showToast(msg, "ok"); fetchEmployees(); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 400,
          background: toast.variant === "error" ? C.red : C.green,
          color: "#fff", padding: "12px 20px", borderRadius: 6,
          fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          maxWidth: 400,
        }}>{toast.message}</div>
      )}
    </div>
  );
}

const thStyle = { padding: "10px 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.muted, textTransform: "uppercase" };
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

function EmployeeModal({ mode, initial, onClose, onSaved, onError }) {
  const [name, setName] = useState(initial.name || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [role, setRole] = useState(initial.role || "field");
  const [qbId, setQbId] = useState(initial.qb_employee_id || "");
  const [jobTitle, setJobTitle] = useState(initial.job_title || "");
  const [hourlyRate, setHourlyRate] = useState(initial.hourly_rate != null ? String(initial.hourly_rate) : "");
  const [hireDate, setHireDate] = useState(initial.hire_date ? String(initial.hire_date).slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);
  const [sendPinAfterCreate, setSendPinAfterCreate] = useState(true);

  const submit = async () => {
    if (!name.trim()) { onError("Name is required"); return; }
    if (!email.trim()) { onError("Email is required"); return; }
    if (mode === "new" && !qbId.trim()) { onError("QB Employee ID is required for new employees"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(), email: email.trim(), phone: phone || null, role,
        qb_employee_id: qbId.trim() || null,
        job_title: jobTitle || null,
        hourly_rate: hourlyRate !== "" ? Number(hourlyRate) : null,
        hire_date: hireDate || null,
      };
      const url = mode === "new" ? `${API_URL}/employees` : `${API_URL}/employees/${initial.id}`;
      const method = mode === "new" ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { onError(data.error || "Save failed"); setSubmitting(false); return; }

      if (mode === "new" && sendPinAfterCreate) {
        await fetch(`${API_URL}/employees/${data.id}/send-pin-setup`, { method: "POST" }).catch(() => {});
      }
      onSaved(mode === "new" ? `Added ${data.name}${sendPinAfterCreate ? " · PIN setup email sent" : ""}` : `Updated ${data.name}`);
    } catch (err) {
      onError("Save failed: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>
          {mode === "new" ? "Add Employee" : `Edit ${initial.name}`}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Name *"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Email *"><input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field label="Phone"><input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(optional)" /></Field>
          <Field label="Role">
            <select style={{ ...inputStyle }} value={role} onChange={e => setRole(e.target.value)}>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label={mode === "new" ? "QB Employee ID *" : "QB Employee ID"}>
            <input style={inputStyle} value={qbId} onChange={e => setQbId(e.target.value)} placeholder="e.g. E-001 or QB internal ID" />
          </Field>
          <Field label="Job Title"><input style={inputStyle} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Lead Tester" /></Field>
          <Field label="Hourly Rate">
            <input style={inputStyle} type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="(optional)" />
          </Field>
          <Field label="Hire Date"><input style={inputStyle} type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} /></Field>
        </div>

        {mode === "new" && (
          <div style={{ marginTop: 18, padding: "10px 14px", background: "#e8f0fb", borderRadius: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={sendPinAfterCreate} onChange={e => setSendPinAfterCreate(e.target.checked)} style={{ accentColor: C.blue, width: 16, height: 16 }} />
              Email PIN setup link immediately after creating the employee
            </label>
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
