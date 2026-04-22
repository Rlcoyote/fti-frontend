import { useEffect, useState } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle, ConfirmModal, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Job Titles admin (v27.57) ──────────────────────────────────────────────
// Owner/admin-only. User-editable list that drives the Job Title dropdown on
// the Employees form. Built as its own page so white-labeled installs can
// curate their own titles without code changes.
//
// Deactivating a title does NOT touch existing employees' stored job_title —
// their string is preserved in users.job_title for historical accuracy. The
// title just disappears from the Employees dropdown going forward.

function JobTitlesPage() {
  const { currentUser } = useApp();
  const [titles, setTitles] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | titleObject
  const [confirmAction, setConfirmAction] = useState(null);
  const [notice, setNotice] = useState(null);

  const canEdit = ["owner", "admin"].includes(currentUser?.role);

  const fetchTitles = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/job-titles${includeInactive ? "?include_inactive=true" : ""}`);
      if (r.ok) setTitles(await r.json());
    } catch (err) { console.error("Fetch job titles failed:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchTitles(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [includeInactive]);

  const showNotice = (title, message, variant = "ok") => setNotice({ title, message, variant });

  const deactivate = async (title) => {
    try {
      const r = await fetch(`${API_URL}/job-titles/${title.id}/deactivate`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { showNotice("Deactivate failed", data.error || "Could not deactivate.", "error"); return; }
      showNotice("Title deactivated", `"${title.name}" will no longer appear in the Employees dropdown. Existing employees keep their stored title unchanged.`);
      fetchTitles();
    } catch (err) { showNotice("Deactivate failed", err.message, "error"); }
  };

  if (!canEdit) {
    return <div style={{ padding: 32, color: C.muted }}>You need owner or admin access to view this page.</div>;
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Job Titles</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Drives the Job Title dropdown on the Employees form. Deactivating a title preserves all historical employee data — it just removes the option going forward.
          </div>
        </div>
        <Btn variant="blue" onClick={() => setEditing("new")}>+ Add Title</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} style={{ accentColor: C.blue }} />
          Show inactive
        </label>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>{titles.length} shown</div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      ) : titles.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No titles yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: "left" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Sort</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {titles.map(t => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: t.is_active ? "transparent" : "#f6f6f8" }}>
                <td style={tdStyle}><strong>{t.name}</strong></td>
                <td style={tdStyle}>{t.sort_order}</td>
                <td style={tdStyle}>
                  {t.is_active
                    ? <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                    : <span style={{ color: C.muted, fontSize: 11 }}>INACTIVE</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {t.is_active && <Btn small variant="ghost" onClick={() => setEditing(t)}>Edit</Btn>}
                    {t.is_active && <Btn small onClick={() => setConfirmAction({
                      title: "Deactivate Title?",
                      message: `"${t.name}" will be removed from the Employees dropdown. Existing employees with this title stored on their profile are NOT affected — only the dropdown is.`,
                      yesLabel: "Deactivate",
                      onYes: () => deactivate(t),
                    })}>Deactivate</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <TitleModal
          mode={editing === "new" ? "new" : "edit"}
          initial={editing === "new" ? {} : editing}
          onClose={() => setEditing(null)}
          onSaved={(title, message) => { setEditing(null); showNotice(title, message); fetchTitles(); }}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          yesLabel={confirmAction.yesLabel}
          onYes={async () => {
            const a = confirmAction;
            setConfirmAction(null);
            await a.onYes();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {notice && (
        <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />
      )}
    </div>
  );
}

const thStyle = { padding: "10px 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.muted, textTransform: "uppercase" };
const tdStyle = { padding: "10px 8px", verticalAlign: "middle" };

function TitleModal({ mode, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial.name || "");
  const [sortOrder, setSortOrder] = useState(initial.sort_order != null ? String(initial.sort_order) : "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setFormError("Name is required."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), sort_order: sortOrder !== "" ? Number(sortOrder) : undefined };
      const url = mode === "new" ? `${API_URL}/job-titles` : `${API_URL}/job-titles/${initial.id}`;
      const method = mode === "new" ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setFormError(data.error || "Save failed."); setSubmitting(false); return; }
      onSaved(mode === "new" ? "Title added" : "Title updated", `"${data.name}" ${mode === "new" ? "has been added to the Employees dropdown" : "has been updated"}.`);
    } catch (err) {
      setFormError("Save failed: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 440, maxWidth: "95vw" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 18 }}>
          {mode === "new" ? "Add Job Title" : `Edit "${initial.name}"`}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={labelStyle}>Name *</div>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Flowback Supervisor" />
          </div>
          <div>
            <div style={labelStyle}>Sort Order (optional — lower = earlier in dropdown)</div>
            <input style={inputStyle} type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="e.g. 10" />
          </div>
        </div>

        {formError && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#fdecea", color: C.red, borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
            {formError}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <Btn variant="blue" onClick={submit} disabled={submitting}>{submitting ? "Saving…" : (mode === "new" ? "Add Title" : "Save Changes")}</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

export default JobTitlesPage;
